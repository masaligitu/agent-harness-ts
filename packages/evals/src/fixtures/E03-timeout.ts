import { z } from 'zod';
import { EvalFixture, EvalResult } from '../EvalTypes.js';
import { AgentLoop } from '../../../core/src/agent/AgentLoop.js';
import { ContextManager } from '../../../core/src/context/ContextManager.js';
import { ToolRegistry } from '../../../tools/src/ToolRegistry.js';
import { ToolExecutor } from '../../../core/src/runtime/ToolExecutor.js';
import { TraceCollector } from '../../../core/src/trace/TraceCollector.js';
import { MockModelAdapter } from '../../../adapters/src/MockModelAdapter.js';
import { ErrorCodes } from '../../../core/src/errors/ErrorCodes.js';

export const E03Timeout: EvalFixture = {
  id: 'E03',
  name: 'Tool Timeout Recovery',
  description: 'First tool attempt times out, bounded retry triggers, second attempt succeeds cleanly.',
  async run(): Promise<EvalResult> {
    const start = Date.now();
    try {
      const tracer = new TraceCollector();
      const registry = new ToolRegistry();
      const contextManager = new ContextManager();
      let callAttempts = 0;

      registry.register({
        name: 'network_fetch',
        description: 'Simulates a flaky network fetch',
        inputSchema: z.object({ url: z.string() }),
        outputSchema: z.object({ data: z.string() }),
        timeoutMs: 60, // Short timeout for rapid eval
        retryPolicy: {
          maxAttempts: 2,
          backoffMs: 20,
          multiplier: 1,
          retryableErrors: [ErrorCodes.TOOL_TIMEOUT],
        },
        execute: async (_, context) => {
          callAttempts++;
          if (callAttempts === 1) {
            // Sleep longer than timeoutMs
            await new Promise((resolve) => setTimeout(resolve, 150));
            if (context.signal.aborted) {
              throw new Error('Aborted by timeout signal');
            }
          }
          return { data: 'Network fetch succeeded on retry' };
        },
      });

      const executor = new ToolExecutor(registry, tracer);
      const mockModel = new MockModelAdapter([
        {
          type: 'decision',
          decision: {
            type: 'tool_call',
            tool: 'network_fetch',
            arguments: { url: 'https://api.tether.to/v1/stats' },
          },
        },
        {
          type: 'decision',
          decision: {
            type: 'final',
            content: 'Fetched stats successfully after retry.',
          },
        },
      ]);

      const loop = new AgentLoop(mockModel, registry, executor, contextManager, tracer);
      const result = await loop.run('Fetch stats');

      const traces = tracer.getEvents();
      const hasRetry = traces.some((t) => t.event === 'retry' && t.tool === 'network_fetch');
      const hasSuccess = traces.some((t) => t.event === 'tool_success' && t.tool === 'network_fetch');

      const passed =
        callAttempts === 2 &&
        hasRetry &&
        hasSuccess &&
        result.finalAnswer.includes('after retry');

      return {
        id: 'E03',
        name: 'Tool Timeout Recovery',
        passed,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        id: 'E03',
        name: 'Tool Timeout Recovery',
        passed: false,
        durationMs: Date.now() - start,
        error: err.message,
      };
    }
  },
};
