import { EvalFixture, EvalResult } from '../EvalTypes.js';
import { AgentLoop } from '../../../core/src/agent/AgentLoop.js';
import { AgentState } from '../../../core/src/agent/AgentState.js';
import { ContextManager } from '../../../core/src/context/ContextManager.js';
import { ToolRegistry } from '../../../tools/src/ToolRegistry.js';
import { ToolExecutor } from '../../../core/src/runtime/ToolExecutor.js';
import { TraceCollector } from '../../../core/src/trace/TraceCollector.js';
import { MockModelAdapter } from '../../../adapters/src/MockModelAdapter.js';

export const E07ModelFailure: EvalFixture = {
  id: 'E07',
  name: 'Upstream Model Failure Boundary',
  description: 'Model throws connection or upstream error; harness transitions cleanly to ERROR without hanging.',
  async run(): Promise<EvalResult> {
    const start = Date.now();
    try {
      const tracer = new TraceCollector();
      const registry = new ToolRegistry();
      const contextManager = new ContextManager();
      const executor = new ToolExecutor(registry, tracer);

      // Model throws upstream error
      const mockModel = new MockModelAdapter([
        {
          type: 'error',
          error: new Error('Upstream provider HTTP 503 Service Unavailable'),
        },
      ]);

      const loop = new AgentLoop(mockModel, registry, executor, contextManager, tracer);
      let caughtError: Error | null = null;

      try {
        await loop.run('Execute mission');
      } catch (err: any) {
        caughtError = err;
      }

      const passed =
        caughtError !== null &&
        caughtError.message.includes('503 Service Unavailable') &&
        loop.currentState === AgentState.ERROR &&
        tracer.getEvents().some((e) => e.event === 'model_response' && e.status === 'failure');

      return {
        id: 'E07',
        name: 'Upstream Model Failure Boundary',
        passed,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        id: 'E07',
        name: 'Upstream Model Failure Boundary',
        passed: false,
        durationMs: Date.now() - start,
        error: err.message,
      };
    }
  },
};
