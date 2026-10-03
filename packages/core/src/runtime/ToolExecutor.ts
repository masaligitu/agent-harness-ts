import { ToolRegistry } from '../../../tools/src/ToolRegistry.js';
import { AnyToolContract } from '../../../tools/src/ToolTypes.js';
import { TraceCollector } from '../trace/TraceCollector.js';
import { HarnessError } from '../errors/HarnessError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import { withTimeout } from './Timeout.js';
import { isErrorRetryable } from './RetryPolicy.js';
import { AgentState } from '../agent/AgentState.js';

export interface ToolExecutionResult {
  tool: string;
  output: unknown;
  durationMs: number;
  attempts: number;
}

export class ToolExecutor {
  constructor(
    private registry: ToolRegistry,
    private tracer: TraceCollector
  ) {}

  public async execute(
    toolName: string,
    rawArgs: unknown,
    runId: string,
    step: number
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool: AnyToolContract = this.registry.get(toolName);

    this.tracer.emit({
      runId,
      timestamp: new Date().toISOString(),
      step,
      state: AgentState.EXECUTING_TOOL,
      event: 'tool_start',
      tool: toolName,
      status: 'started',
      metadata: { args: rawArgs },
    });

    // 1. Validate Input Schema
    const inputParse = tool.inputSchema.safeParse(rawArgs);
    if (!inputParse.success) {
      const durationMs = Date.now() - startTime;
      const err = new HarnessError({
        code: ErrorCodes.TOOL_INPUT_INVALID,
        message: `Tool "${toolName}" input failed validation: ${inputParse.error.message}`,
        retryable: false,
        metadata: { validationErrors: inputParse.error.format(), rawArgs },
      });

      this.tracer.emit({
        runId,
        timestamp: new Date().toISOString(),
        step,
        state: AgentState.EXECUTING_TOOL,
        event: 'tool_failure',
        tool: toolName,
        status: 'failure',
        durationMs,
        error: { code: err.code, message: err.message },
      });

      throw err;
    }

    const validatedInput = inputParse.data;
    const policy = tool.retryPolicy;
    const maxAttempts = Math.max(1, policy.maxAttempts);
    let attempt = 0;
    let lastError: Error | null = null;

    // 2. Execution with Bounded Retry & Timeout
    while (attempt < maxAttempts) {
      attempt++;
      const attemptStart = Date.now();

      try {
        const rawOutput = await withTimeout(
          (signal) => tool.execute(validatedInput, { runId, step, signal }),
          tool.timeoutMs,
          `Tool ${toolName}`
        );

        // 3. Validate Output Schema
        const outputParse = tool.outputSchema.safeParse(rawOutput);
        if (!outputParse.success) {
          throw new HarnessError({
            code: ErrorCodes.TOOL_OUTPUT_INVALID,
            message: `Tool "${toolName}" returned output failing schema: ${outputParse.error.message}`,
            retryable: false,
            metadata: { rawOutput },
          });
        }

        const totalDuration = Date.now() - startTime;
        this.tracer.emit({
          runId,
          timestamp: new Date().toISOString(),
          step,
          state: AgentState.EXECUTING_TOOL,
          event: 'tool_success',
          tool: toolName,
          attempt,
          durationMs: totalDuration,
          status: 'success',
          metadata: { output: outputParse.data },
        });

        return {
          tool: toolName,
          output: outputParse.data,
          durationMs: totalDuration,
          attempts: attempt,
        };
      } catch (err: any) {
        lastError = err;
        const errCode = err instanceof HarnessError ? err.code : ErrorCodes.TOOL_EXECUTION_FAILED;
        const canRetry = isErrorRetryable(errCode, policy) && attempt < maxAttempts;

        if (canRetry) {
          const backoff = policy.backoffMs * Math.pow(policy.multiplier ?? 1, attempt - 1);
          this.tracer.emit({
            runId,
            timestamp: new Date().toISOString(),
            step,
            state: AgentState.EXECUTING_TOOL,
            event: 'retry',
            tool: toolName,
            attempt,
            durationMs: Date.now() - attemptStart,
            status: 'failure',
            metadata: { willRetryInMs: backoff, error: err.message },
          });

          await new Promise((resolve) => setTimeout(resolve, backoff));
        } else {
          break;
        }
      }
    }

    // All attempts exhausted or non-retryable failure
    const totalDuration = Date.now() - startTime;
    const finalErrorCode =
      lastError instanceof HarnessError ? lastError.code : ErrorCodes.TOOL_EXECUTION_FAILED;

    this.tracer.emit({
      runId,
      timestamp: new Date().toISOString(),
      step,
      state: AgentState.EXECUTING_TOOL,
      event: 'tool_failure',
      tool: toolName,
      attempt,
      durationMs: totalDuration,
      status: 'failure',
      error: { code: finalErrorCode, message: lastError?.message ?? 'Execution failed' },
    });

    if (lastError instanceof HarnessError) {
      throw lastError;
    }

    throw new HarnessError({
      code: ErrorCodes.TOOL_EXECUTION_FAILED,
      message: `Tool "${toolName}" failed after ${attempt} attempts: ${lastError?.message}`,
      retryable: false,
      cause: lastError,
      metadata: { attempts: attempt },
    });
  }
}
