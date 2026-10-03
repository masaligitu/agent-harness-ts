import { z } from 'zod';
import { ToolContract } from '../../packages/tools/src/ToolTypes.js';
import { DEFAULT_RETRY_POLICY } from '../../packages/core/src/runtime/RetryPolicy.js';

export const SearchKnowledgeTool: ToolContract<
  { query: string },
  { results: string[] }
> = {
  name: 'search_knowledge',
  description: 'Searches local knowledgebase documents',
  inputSchema: z.object({ query: z.string().min(1) }),
  outputSchema: z.object({ results: z.array(z.string()) }),
  timeoutMs: 1500,
  retryPolicy: DEFAULT_RETRY_POLICY,
  execute: async (input) => {
    return {
      results: [
        `Knowledgebase excerpt matching: "${input.query}"`,
        `Doc #104: Tether treasury report audit highlights`,
      ],
    };
  },
};

export const GetMetricsTool: ToolContract<
  { metric: string },
  { value: number; unit: string }
> = {
  name: 'get_metrics',
  description: 'Retrieves verified system metrics',
  inputSchema: z.object({ metric: z.string() }),
  outputSchema: z.object({ value: z.number(), unit: z.string() }),
  timeoutMs: 1000,
  retryPolicy: DEFAULT_RETRY_POLICY,
  execute: async (input) => {
    return {
      value: 120500000000,
      unit: 'USD',
    };
  },
};
