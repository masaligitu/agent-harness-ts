import { z } from 'zod';
import { EvalFixture, EvalResult } from '../EvalTypes.js';
import { AgentLoop } from '../../../core/src/agent/AgentLoop.js';
import { AgentState } from '../../../core/src/agent/AgentState.js';
import { ContextManager } from '../../../core/src/context/ContextManager.js';
import { ToolRegistry } from '../../../tools/src/ToolRegistry.js';
import { ToolExecutor } from '../../../core/src/runtime/ToolExecutor.js';
import { TraceCollector } from '../../../core/src/trace/TraceCollector.js';
import { MockModelAdapter } from '../../../adapters/src/MockModelAdapter.js';
import { ErrorCodes } from '../../../core/src/errors/ErrorCodes.js';

export const E10Recovery: EvalFixture = {
  id: 'E10',
  name: 'End-to-End Resilience & Recovery Showcase',
  description: 'Full resilience path: tool timeout -> bounded retry success -> observed result -> valid final answer.',
  async run(): Promise<EvalResult> {
    const start = Date.now();
    try {
      const tracer = new TraceCollector();
      const registry = new ToolRegistry();
      const contextManager = new ContextManager();
      let callCount = 0;

      registry.register({
        name: 'query_blockchain_node',
        description: 'Queries remote RPC node for block height',
        inputSchema: z.object({ network: z.string() }),
        outputSchema: z.object({ blockHeight: z.number() }),
        timeoutMs: 50,
        retryPolicy: {
          maxAttempts: 2,
          backoffMs: 20,
          multiplier: 1,
          retryableErrors: [ErrorCodes.TOOL_TIMEOUT],
        },
        execute: async (_, context) => {
          callCount++;
          if (callCount === 1) {
            await new Promise((r) => setTimeout(r, 120));
            if (context.signal.aborted) {
              throw new Error('RPC Node timeout');
            }
          }
          return { blockHeight: 19842100 };
        },
      });

      const executor = new ToolExecutor(registry, tracer);
      const mockModel = new MockModelAdapter([
        // Step 1: Model requests tool
        {
          type: 'decision',
          decision: {
            type: 'tool_call',
            tool: 'query_blockchain_node',
            arguments: { network: 'mainnet' },
          },
        },
        // Step 2: Model completes after receiving tool output
        {
          type: 'decision',
          decision: {
            type: 'final',
            content: 'Ethereum mainnet current block height is 19842100.',
          },
        },
      ]);

      const loop = new AgentLoop(mockModel, registry, executor, contextManager, tracer);
      const result = await loop.run('What is current Ethereum block height?');

      const traces = tracer.getEvents();
      const hasRetry = traces.some((t) => t.event === 'retry');
      const hasToolSuccess = traces.some((t) => t.event === 'tool_success');
      const hasTerminated = traces.some((t) => t.event === 'terminated');

      const passed =
        callCount === 2 &&
        hasRetry &&
        hasToolSuccess &&
        hasTerminated &&
        loop.currentState === AgentState.TERMINATED &&
        result.finalAnswer.includes('19842100');

      return {
        id: 'E10',
        name: 'End-to-End Resilience & Recovery Showcase',
        passed,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        id: 'E10',
        name: 'End-to-End Resilience & Recovery Showcase',
        passed: false,
        durationMs: Date.now() - start,
        error: err.message,
      };
    }
  },
};
