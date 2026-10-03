import { StateMachine, AgentState } from './AgentState.js';
import { AgentDecision, AgentDecisionSchema } from './AgentDecision.js';
import { ContextManager, HarnessMessage, PriorityClass, ContextBudget } from '../context/ContextManager.js';
import { ModelAdapter } from '../model/ModelTypes.js';
import { ToolExecutor } from '../runtime/ToolExecutor.js';
import { ToolRegistry } from '../../../tools/src/ToolRegistry.js';
import { TraceCollector } from '../trace/TraceCollector.js';
import { HarnessError } from '../errors/HarnessError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import { withTimeout } from '../runtime/Timeout.js';

export interface AgentLoopConfig {
  maxSteps?: number;
  maxDuplicateActions?: number;
  modelTimeoutMs?: number;
  contextBudget?: ContextBudget;
}

export interface AgentRunResult {
  runId: string;
  finalAnswer: string;
  totalSteps: number;
  traces: ReturnType<TraceCollector['getEvents']>;
}

export class AgentLoop {
  private stateMachine = new StateMachine();
  private maxSteps: number;
  private maxDuplicateActions: number;
  private modelTimeoutMs: number;
  private contextBudget: ContextBudget;

  constructor(
    private model: ModelAdapter,
    private registry: ToolRegistry,
    private executor: ToolExecutor,
    private contextManager: ContextManager,
    private tracer: TraceCollector,
    config?: AgentLoopConfig
  ) {
    this.maxSteps = config?.maxSteps ?? 8;
    this.maxDuplicateActions = config?.maxDuplicateActions ?? 2;
    this.modelTimeoutMs = config?.modelTimeoutMs ?? 5000;
    this.contextBudget = config?.contextBudget ?? {
      maxTokens: 4000,
      reservedForOutput: 500,
    };
  }

  public get currentState(): AgentState {
    return this.stateMachine.current;
  }

  public async run(userGoal: string, systemPrompt?: string): Promise<AgentRunResult> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let step = 0;
    const actionCounts = new Map<string, number>();

    const messages: HarnessMessage[] = [];
    if (systemPrompt) {
      messages.push({
        id: `msg_sys_${Date.now()}`,
        role: 'system',
        content: systemPrompt,
        priority: PriorityClass.CRITICAL,
        createdAt: Date.now(),
      });
    }

    messages.push({
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: userGoal,
      priority: PriorityClass.IMPORTANT,
      createdAt: Date.now(),
    });

    try {
      while (step < this.maxSteps) {
        step++;

        // 1. THINKING state
        this.stateMachine.transitionTo(AgentState.THINKING);

        // Build context with budget
        const contextResult = this.contextManager.build(messages, this.contextBudget);
        if (contextResult.droppedMessageIds.length > 0) {
          this.tracer.emit({
            runId,
            timestamp: new Date().toISOString(),
            step,
            state: AgentState.THINKING,
            event: 'context_pruned',
            status: 'success',
            metadata: {
              droppedCount: contextResult.droppedMessageIds.length,
              droppedIds: contextResult.droppedMessageIds,
              estimatedTokens: contextResult.estimatedTokens,
            },
          });
        }

        // Generate decision with model timeout
        this.tracer.emit({
          runId,
          timestamp: new Date().toISOString(),
          step,
          state: AgentState.THINKING,
          event: 'model_request',
          status: 'started',
        });

        let response;
        try {
          response = await withTimeout(
            (signal) =>
              this.model.generate(
                {
                  messages: contextResult.messages,
                  tools: this.registry.definitions(),
                },
                { signal, timeoutMs: this.modelTimeoutMs }
              ),
            this.modelTimeoutMs,
            `ModelAdapter[${this.model.name}]`
          );
        } catch (err: any) {
          const code = err instanceof HarnessError ? err.code : ErrorCodes.MODEL_ERROR;
          this.tracer.emit({
            runId,
            timestamp: new Date().toISOString(),
            step,
            state: AgentState.THINKING,
            event: 'model_response',
            status: 'failure',
            error: { code, message: err.message },
          });
          throw err;
        }

        // Validate decision schema
        const decisionParse = AgentDecisionSchema.safeParse(response.decision);
        if (!decisionParse.success) {
          const err = new HarnessError({
            code: ErrorCodes.MODEL_SCHEMA_INVALID,
            message: `Model returned invalid decision schema: ${decisionParse.error.message}`,
            metadata: { rawDecision: response.decision },
          });

          this.tracer.emit({
            runId,
            timestamp: new Date().toISOString(),
            step,
            state: AgentState.THINKING,
            event: 'model_response',
            status: 'failure',
            error: { code: err.code, message: err.message },
          });

          throw err;
        }

        const decision: AgentDecision = decisionParse.data;
        this.tracer.emit({
          runId,
          timestamp: new Date().toISOString(),
          step,
          state: AgentState.THINKING,
          event: 'model_response',
          status: 'success',
          metadata: { decisionType: decision.type },
        });

        // 2. Final Decision -> Terminate
        if (decision.type === 'final') {
          this.stateMachine.transitionTo(AgentState.TERMINATED);
          this.tracer.emit({
            runId,
            timestamp: new Date().toISOString(),
            step,
            state: AgentState.TERMINATED,
            event: 'terminated',
            status: 'success',
            metadata: { finalContent: decision.content },
          });

          return {
            runId,
            finalAnswer: decision.content,
            totalSteps: step,
            traces: this.tracer.getEvents(),
          };
        }

        // 3. Tool Call Decision
        if (decision.type === 'tool_call') {
          // Canonical fingerprint for duplicate action check
          const sortedArgs = Object.keys(decision.arguments)
            .sort()
            .reduce((acc: Record<string, unknown>, k) => {
              acc[k] = decision.arguments[k];
              return acc;
            }, {});
          const fingerprint = `${decision.tool}:${JSON.stringify(sortedArgs)}`;
          const seenCount = (actionCounts.get(fingerprint) ?? 0) + 1;
          actionCounts.set(fingerprint, seenCount);

          if (seenCount > this.maxDuplicateActions) {
            throw new HarnessError({
              code: ErrorCodes.DUPLICATE_ACTION_LIMIT,
              message: `Duplicate action limit exceeded (${seenCount} > ${this.maxDuplicateActions}) for "${fingerprint}".`,
              metadata: { fingerprint, seenCount, threshold: this.maxDuplicateActions },
            });
          }

          // Transition to EXECUTING_TOOL
          this.stateMachine.transitionTo(AgentState.EXECUTING_TOOL);

          // Execute tool
          const executionResult = await this.executor.execute(
            decision.tool,
            decision.arguments,
            runId,
            step
          );

          // Transition to EVALUATING
          this.stateMachine.transitionTo(AgentState.EVALUATING);

          // Append to message history
          messages.push({
            id: `msg_asst_${Date.now()}_${step}`,
            role: 'assistant',
            content: JSON.stringify(decision),
            priority: PriorityClass.NORMAL,
            createdAt: Date.now(),
          });

          messages.push({
            id: `msg_tool_${Date.now()}_${step}`,
            role: 'tool',
            content: JSON.stringify(executionResult.output),
            priority: PriorityClass.IMPORTANT,
            createdAt: Date.now(),
            metadata: { tool: decision.tool, attempts: executionResult.attempts },
          });
        }
      }

      // Max steps exceeded
      throw new HarnessError({
        code: ErrorCodes.MAX_STEPS_EXCEEDED,
        message: `Agent exceeded maximum allowed steps (${this.maxSteps}) without completing task.`,
        metadata: { maxSteps: this.maxSteps, step },
      });
    } catch (err: any) {
      this.stateMachine.transitionTo(AgentState.ERROR);
      throw err;
    }
  }
}
