import { z } from 'zod';
import { EvalFixture, EvalResult } from '../EvalTypes.js';
import { AgentLoop } from '../../../core/src/agent/AgentLoop.js';
import { AgentState } from '../../../core/src/agent/AgentState.js';
import { ContextManager } from '../../../core/src/context/ContextManager.js';
import { ToolRegistry } from '../../../tools/src/ToolRegistry.js';
import { ToolExecutor } from '../../../core/src/runtime/ToolExecutor.js';
import { TraceCollector } from '../../../core/src/trace/TraceCollector.js';
import { MockModelAdapter } from '../../../adapters/src/MockModelAdapter.js';
import { DEFAULT_RETRY_POLICY } from '../../../core/src/runtime/RetryPolicy.js';

export const E09PartialFailure: EvalFixture = {
  id: 'E09',
  name: 'Partial Tool Failure Semantics',
  description: 'First operation succeeds; second operation fails; results of first operation are preserved in context.',
  async run(): Promise<EvalResult> {
    const start = Date.now();
    try {
      const tracer = new TraceCollector();
      const registry = new ToolRegistry();
      const contextManager = new ContextManager();

      registry.register({
        name: 'validate_account',
        description: 'Validates user account status',
        inputSchema: z.object({ accountId: z.string() }),
        outputSchema: z.object({ valid: z.boolean(), balance: z.number() }),
        timeoutMs: 1000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        execute: async () => ({ valid: true, balance: 5000 }),
      });

      registry.register({
        name: 'external_transfer',
        description: 'Transfers funds to external bank',
        inputSchema: z.object({ amount: z.number() }),
        outputSchema: z.object({ success: z.boolean() }),
        timeoutMs: 1000,
        // No retries on non-retryable failure
        retryPolicy: { maxAttempts: 1, backoffMs: 10, retryableErrors: [] },
        execute: async () => {
          throw new Error('External banking rail disconnected');
        },
      });

      const executor = new ToolExecutor(registry, tracer);

      const mockModel = new MockModelAdapter([
        // Step 1: Tool A succeeds
        {
          type: 'decision',
          decision: {
            type: 'tool_call',
            tool: 'validate_account',
            arguments: { accountId: 'acc_123' },
          },
        },
        // Step 2: Tool B is called
        {
          type: 'decision',
          decision: {
            type: 'tool_call',
            tool: 'external_transfer',
            arguments: { amount: 100 },
          },
        },
      ]);

      const loop = new AgentLoop(mockModel, registry, executor, contextManager, tracer);
      let transferFailed = false;

      try {
        await loop.run('Validate account then transfer funds');
      } catch (err: any) {
        transferFailed = err.message.includes('banking rail disconnected');
      }

      const traces = tracer.getEvents();
      const toolASucceeded = traces.some(
        (t) => t.event === 'tool_success' && t.tool === 'validate_account'
      );
      const toolBFailed = traces.some(
        (t) => t.event === 'tool_failure' && t.tool === 'external_transfer'
      );

      const passed = transferFailed && toolASucceeded && toolBFailed;

      return {
        id: 'E09',
        name: 'Partial Tool Failure Semantics',
        passed,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        id: 'E09',
        name: 'Partial Tool Failure Semantics',
        passed: false,
        durationMs: Date.now() - start,
        error: err.message,
      };
    }
  },
};
