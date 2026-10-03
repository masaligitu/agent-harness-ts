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

export const E01CorrectTool: EvalFixture = {
  id: 'E01',
  name: 'Correct Tool Selection',
  description: 'Valid tool call, valid arguments, successful execution, and clean final termination.',
  async run(): Promise<EvalResult> {
    const start = Date.now();
    try {
      const tracer = new TraceCollector();
      const registry = new ToolRegistry();
      const contextManager = new ContextManager();

      // Register search tool
      registry.register({
        name: 'search_database',
        description: 'Searches database by query string',
        inputSchema: z.object({ query: z.string().min(1) }),
        outputSchema: z.object({ matches: z.array(z.string()) }),
        timeoutMs: 1000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        execute: async (input) => ({ matches: [`Result for: ${input.query}`] }),
      });

      const executor = new ToolExecutor(registry, tracer);
      const mockModel = new MockModelAdapter([
        {
          type: 'decision',
          decision: {
            type: 'tool_call',
            tool: 'search_database',
            arguments: { query: 'Tether reserves' },
          },
        },
        {
          type: 'decision',
          decision: {
            type: 'final',
            content: 'Found Tether reserves data successfully.',
          },
        },
      ]);

      const loop = new AgentLoop(mockModel, registry, executor, contextManager, tracer);
      const result = await loop.run('What are the Tether reserves?');

      const passed =
        loop.currentState === AgentState.TERMINATED &&
        result.finalAnswer.includes('Found Tether reserves') &&
        tracer.getEvents().some((e) => e.event === 'tool_success' && e.tool === 'search_database');

      return {
        id: 'E01',
        name: 'Correct Tool Selection',
        passed,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        id: 'E01',
        name: 'Correct Tool Selection',
        passed: false,
        durationMs: Date.now() - start,
        error: err.message,
      };
    }
  },
};
