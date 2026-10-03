import { EvalFixture, EvalResult } from '../EvalTypes.js';
import { AgentLoop } from '../../../core/src/agent/AgentLoop.js';
import { ContextManager } from '../../../core/src/context/ContextManager.js';
import { ToolRegistry } from '../../../tools/src/ToolRegistry.js';
import { ToolExecutor } from '../../../core/src/runtime/ToolExecutor.js';
import { TraceCollector } from '../../../core/src/trace/TraceCollector.js';
import { MockModelAdapter } from '../../../adapters/src/MockModelAdapter.js';
import { HarnessError } from '../../../core/src/errors/HarnessError.js';
import { ErrorCodes } from '../../../core/src/errors/ErrorCodes.js';

export const E04MalformedOutput: EvalFixture = {
  id: 'E04',
  name: 'Malformed Model Structured Output',
  description: 'Model returns malformed/untyped decision; harness intercepts with typed error without crash.',
  async run(): Promise<EvalResult> {
    const start = Date.now();
    try {
      const tracer = new TraceCollector();
      const registry = new ToolRegistry();
      const contextManager = new ContextManager();
      const executor = new ToolExecutor(registry, tracer);

      // Model returns malformed decision object
      const mockModel = new MockModelAdapter([
        {
          type: 'raw',
          rawText: '{"unknown_key": "some text without discriminated type"}',
          decision: { unknown_key: 'some text' },
        },
      ]);

      const loop = new AgentLoop(mockModel, registry, executor, contextManager, tracer);
      let errorThrown: HarnessError | null = null;

      try {
        await loop.run('Do something');
      } catch (err: any) {
        errorThrown = err;
      }

      const passed =
        errorThrown instanceof HarnessError &&
        errorThrown.code === ErrorCodes.MODEL_SCHEMA_INVALID &&
        tracer.getEvents().some((e) => e.event === 'model_response' && e.status === 'failure');

      return {
        id: 'E04',
        name: 'Malformed Model Structured Output',
        passed,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        id: 'E04',
        name: 'Malformed Model Structured Output',
        passed: false,
        durationMs: Date.now() - start,
        error: err.message,
      };
    }
  },
};
