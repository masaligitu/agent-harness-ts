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

export const E02InvalidArgs: EvalFixture = {
  id: 'E02',
  name: 'Invalid Tool Arguments Rejection',
  description: 'Valid tool call with invalid schema arguments is intercepted before execution without crash.',
  async run(): Promise<EvalResult> {
    const start = Date.now();
    try {
      const tracer = new TraceCollector();
      const registry = new ToolRegistry();
      const contextManager = new ContextManager();
      let toolActuallyExecuted = false;

      registry.register({
        name: 'calculate_tax',
        description: 'Calculates tax based on amount and state',
        inputSchema: z.object({
          amount: z.number().positive(),
          state: z.string().length(2),
        }),
        outputSchema: z.object({ tax: z.number() }),
        timeoutMs: 1000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        execute: async () => {
          toolActuallyExecuted = true;
          return { tax: 10 };
        },
      });

      const executor = new ToolExecutor(registry, tracer);
      const mockModel = new MockModelAdapter([
        {
          type: 'decision',
          decision: {
            type: 'tool_call',
            tool: 'calculate_tax',
            // Invalid: amount is a string, state is a number
            arguments: { amount: 'ten dollars', state: 999 },
          },
        },
      ]);

      const loop = new AgentLoop(mockModel, registry, executor, contextManager, tracer);
      let errorThrown: HarnessError | null = null;

      try {
        await loop.run('Calculate my tax');
      } catch (err: any) {
        errorThrown = err;
      }

      const passed =
        !toolActuallyExecuted &&
        errorThrown instanceof HarnessError &&
        errorThrown.code === ErrorCodes.TOOL_INPUT_INVALID &&
        tracer.getEvents().some((e) => e.event === 'tool_failure' && e.status === 'failure');

      return {
        id: 'E02',
        name: 'Invalid Tool Arguments Rejection',
        passed,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        id: 'E02',
        name: 'Invalid Tool Arguments Rejection',
        passed: false,
        durationMs: Date.now() - start,
        error: err.message,
      };
    }
  },
};
