import { ModelAdapter, ModelRequest, ModelResponse, ModelGenerateOptions } from '../../core/src/model/ModelTypes.js';
import { HarnessError } from '../../core/src/errors/HarnessError.js';
import { ErrorCodes } from '../../core/src/errors/ErrorCodes.js';

export interface AnthropicConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class AnthropicModelAdapter implements ModelAdapter {
  public readonly name = 'AnthropicModelAdapter';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config?: AnthropicConfig) {
    this.apiKey = config?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '';
    this.model = config?.model ?? 'claude-3-5-sonnet-20241022';
    this.baseUrl = config?.baseUrl ?? 'https://api.anthropic.com/v1';
  }

  public async generate(
    request: ModelRequest,
    options?: ModelGenerateOptions
  ): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new HarnessError({
        code: ErrorCodes.MODEL_ERROR,
        message: 'Anthropic API key is missing. Set ANTHROPIC_API_KEY or use MockModelAdapter for zero-key evaluation.',
      });
    }

    try {
      const systemMsg = request.messages.find((m) => m.role === 'system')?.content;
      const nonSystemMsgs = request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));

      const resp = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          system: systemMsg,
          messages: nonSystemMsgs,
          max_tokens: 1024,
        }),
        signal: options?.signal,
      });

      if (!resp.ok) {
        throw new HarnessError({
          code: ErrorCodes.MODEL_ERROR,
          message: `Anthropic returned status ${resp.status}: ${await resp.text()}`,
        });
      }

      const data: any = await resp.json();
      const rawText = data.content?.[0]?.text ?? '{}';
      const parsedDecision = JSON.parse(rawText);

      return {
        decision: parsedDecision,
        rawText,
        tokenUsage: {
          prompt: data.usage?.input_tokens ?? 0,
          completion: data.usage?.output_tokens ?? 0,
        },
      };
    } catch (err: any) {
      if (err instanceof HarnessError) throw err;
      throw new HarnessError({
        code: ErrorCodes.MODEL_ERROR,
        message: `Anthropic generation failed: ${err.message}`,
        cause: err,
      });
    }
  }
}
