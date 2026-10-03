import { z } from 'zod';
import { RetryPolicy } from '../../core/src/runtime/RetryPolicy.js';

export interface ToolExecutionContext {
  runId: string;
  step: number;
  signal: AbortSignal;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolContract<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  execute(input: TInput, context: ToolExecutionContext): Promise<TOutput>;
}

export type AnyToolContract = ToolContract<any, any>;
