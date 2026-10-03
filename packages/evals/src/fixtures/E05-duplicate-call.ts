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

export const E05DuplicateCall: EvalFixture = {
  id: 'E05',
  name: 'Duplicate Tool Invocation Guard',
  description: 'Model continuously repeats identical tool call; harness detects cycle and terminates with limit error.',
  async run(): Promise<EvalResult> {
    const start = Date.now();
    try {
      const tracer = new TraceCollector();
      const registry = new ToolRegistry();
      const contextManager = new ContextManager();
      let executionCount = 0;

      registry.register({
        name: 'ping_server',
        description: 'Pings a server host',
        inputSchema: z.object({ host: z.string() }),
        outputSchema: z.object({ pong: z.boolean() }),
        timeoutMs: 1000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        execute: async () => {
          executionCount++;
          return { pong: true };
        },
      });

      const executor = new ToolExecutor(registry, tracer);

      // Model repeats identical tool call 4 times (max allowed is 2)
      const repetitiveCall = {
        type: 'decision' as const,
        decision: {
          type: 'tool_call' as const,
          tool: 'ping_server',
          arguments: { host: '127.0.0.1' },
        },
      };

      const mockModel = new MockModelAdapter([
        repetitiveCall,
        repetitiveCall,
        repetitiveCall,
        repetitiveCall,
      ]);

      const loop = new AgentLoop(mockModel, registry, executor, contextManager, tracer, {
        maxDuplicateActions: 2,
      });

      let errorThrown: HarnessError | null = null;
      try {
        await loop.run('Ping server repeatedly');
      } catch (err: any) {
        errorThrown = err;
      }

      const passed =
        errorThrown instanceof HarnessError &&
        errorThrown.code === ErrorCodes.DUPLICATE_ACTION_LIMIT &&
        executionCount === 2; // Exactly stopped after exceeding threshold

      return {
        id: 'E05',
        name: 'Duplicate Tool Invocation Guard',
        passed,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        id: 'E05',
        name: 'Duplicate Tool Invocation Guard',
        passed: false,
        durationMs: Date.now() - start,
        error: err.message,
      };
    }
  },
};
