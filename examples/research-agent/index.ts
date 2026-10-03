import { AgentLoop } from '../../packages/core/src/agent/AgentLoop.js';
import { ToolRegistry } from '../../packages/tools/src/ToolRegistry.js';
import { ToolExecutor } from '../../packages/core/src/runtime/ToolExecutor.js';
import { ContextManager } from '../../packages/core/src/context/ContextManager.js';
import { TraceCollector } from '../../packages/core/src/trace/TraceCollector.js';
import { MockModelAdapter } from '../../packages/adapters/src/MockModelAdapter.js';
import { SearchKnowledgeTool, GetMetricsTool } from './tools.js';

async function runExample() {
  console.log('--- Initializing Agent Harness (Research Agent Example) ---');

  const tracer = new TraceCollector();
  const registry = new ToolRegistry();
  const contextManager = new ContextManager();

  registry.register(SearchKnowledgeTool);
  registry.register(GetMetricsTool);

  const executor = new ToolExecutor(registry, tracer);

  // Scripted mock agent demonstrating predictable tool calling and termination
  const mockModel = new MockModelAdapter([
    {
      type: 'decision',
      decision: {
        type: 'tool_call',
        tool: 'search_knowledge',
        arguments: { query: 'reserves audit' },
      },
    },
    {
      type: 'decision',
      decision: {
        type: 'tool_call',
        tool: 'get_metrics',
        arguments: { metric: 'total_reserve' },
      },
    },
    {
      type: 'decision',
      decision: {
        type: 'final',
        content:
          'Audit verified: Total verified reserve is 120,500,000,000 USD backed by short-term US Treasuries.',
      },
    },
  ]);

  const loop = new AgentLoop(mockModel, registry, executor, contextManager, tracer);

  console.log('Running agent with user goal: "Audit the current treasury reserves"');
  const result = await loop.run(
    'Audit the current treasury reserves',
    'You are a rigorous financial research assistant.'
  );

  console.log('\n--- Execution Succeeded ---');
  console.log(`Run ID: ${result.runId}`);
  console.log(`Steps taken: ${result.totalSteps}`);
  console.log(`Final Answer:\n${result.finalAnswer}\n`);

  console.log(`Total Traces Collected: ${result.traces.length}`);
  result.traces.forEach((t) => {
    console.log(`  [${t.timestamp.slice(11, 19)}] Step ${t.step} | ${t.event} | ${t.status}`);
  });
}

runExample().catch(console.error);
