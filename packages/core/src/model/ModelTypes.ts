import { HarnessMessage } from '../context/ContextManager.js';
import { ToolDefinition } from '../../../tools/src/ToolTypes.js';
import { AgentDecision } from '../agent/AgentDecision.js';

export interface ModelRequest {
  messages: HarnessMessage[];
  tools: ToolDefinition[];
  responseSchema?: unknown;
}

export interface ModelGenerateOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ModelResponse {
  decision: AgentDecision;
  rawText?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
  };
}

export interface ModelAdapter {
  readonly name: string;
  generate(request: ModelRequest, options?: ModelGenerateOptions): Promise<ModelResponse>;
}
