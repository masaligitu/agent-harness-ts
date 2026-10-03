import { ModelAdapter, ModelRequest, ModelResponse, ModelGenerateOptions } from '../../core/src/model/ModelTypes.js';
import { HarnessError } from '../../core/src/errors/HarnessError.js';
import { ErrorCodes } from '../../core/src/errors/ErrorCodes.js';

export interface OpenAIConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class OpenAIModelAdapter implements ModelAdapter {
  public readonly name = 'OpenAIModelAdapter';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config?: OpenAIConfig) {
    this.apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.model = config?.model ?? 'gpt-4o-mini';
    this.baseUrl = config?.baseUrl ?? 'https://api.openai.com/v1';
  }

  public async generate(
    request: ModelRequest,
    options?: ModelGenerateOptions
  ): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new HarnessError({
        code: ErrorCodes.MODEL_ERROR,
        message: 'OpenAI API key is missing. Set OPENAI_API_KEY or use MockModelAdapter for zero-key evaluation.',
      });
    }

    try {
      const resp = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
          response_format: { type: 'json_object' },
        }),
        signal: options?.signal,
      });

      if (!resp.ok) {
        throw new HarnessError({
          code: ErrorCodes.MODEL_ERROR,
          message: `OpenAI returned status ${resp.status}: ${await resp.text()}`,
        });
      }

      const data: any = await resp.json();
      const rawText = data.choices[0]?.message?.content ?? '{}';
      const parsedDecision = JSON.parse(rawText);

      return {
        decision: parsedDecision,
        rawText,
        tokenUsage: {
          prompt: data.usage?.prompt_tokens ?? 0,
          completion: data.usage?.completion_tokens ?? 0,
        },
      };
    } catch (err: any) {
      if (err instanceof HarnessError) throw err;
      throw new HarnessError({
        code: ErrorCodes.MODEL_ERROR,
        message: `OpenAI generation failed: ${err.message}`,
        cause: err,
      });
    }
  }
}
