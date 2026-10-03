import { z } from 'zod';
import { EvalFixture, EvalResult } from '../EvalTypes.js';
import { AgentLoop } from '../../../core/src/agent/AgentLoop.js';
import { ContextManager } from '../../../core/src/context/ContextManager.js';
import { ToolRegistry } from '../../../tools/src/ToolRegistry.js';
import { ToolExecutor } from '../../../core/src/runtime/ToolExecutor.js';
import { TraceCollector } from '../../../core/src/trace/TraceCollector.js';
import { MockModelAdapter } from '../../../adapters/src/MockModelAdapter.js';
import { DEFAULT_RETRY_POLICY } from '../../../core/src/runtime/RetryPolicy.js';
import { HarnessError } from '../../../core/src/errors/HarnessError.js';
import { ErrorCodes } from '../../../core/src/errors/ErrorCodes.js';

export const E08LoopGuard: EvalFixture = {
  id: 'E08',
  name: 'Infinite Loop Termination Guard',
  description: 'Model continuously calls different tools without reaching final decision; terminates strictly at maxSteps.',
  async run(): Promise<EvalResult> {
    const start = Date.now();
    try {
      const tracer = new TraceCollector();
      const registry = new ToolRegistry();
      const contextManager = new ContextManager();
      let stepCounter = 0;

      registry.register({
        name: 'step_counter_tool',
        description: 'Increments execution counter',
        inputSchema: z.object({ stepNumber: z.number() }),
        outputSchema: z.object({ ack: z.number() }),
        timeoutMs: 1000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        execute: async (input) => {
          stepCounter++;
          return { ack: input.stepNumber };
        },
      });

      const executor = new ToolExecutor(registry, tracer);

      // Enqueue 10 different calls
      const mockModel = new MockModelAdapter(
        Array.from({ length: 10 }).map((_, i) => ({
          type: 'decision' as const,
          decision: {
            type: 'tool_call' as const,
            tool: 'step_counter_tool',
            arguments: { stepNumber: i },
          },
        }))
      );

      // Max steps set to 4
      const loop = new AgentLoop(mockModel, registry, executor, contextManager, tracer, {
        maxSteps: 4,
      });

      let errorThrown: HarnessError | null = null;
      try {
        await loop.run('Run non-terminating loop');
      } catch (err: any) {
        errorThrown = err;
      }

      const passed =
        errorThrown instanceof HarnessError &&
        errorThrown.code === ErrorCodes.MAX_STEPS_EXCEEDED &&
        stepCounter === 4; // Stopped strictly at boundary

      return {
        id: 'E08',
        name: 'Infinite Loop Termination Guard',
        passed,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        id: 'E08',
        name: 'Infinite Loop Termination Guard',
        passed: false,
        durationMs: Date.now() - start,
        error: err.message,
      };
    }
  },
};
