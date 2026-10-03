import { ModelAdapter, ModelRequest, ModelResponse, ModelGenerateOptions } from '../../core/src/model/ModelTypes.js';
import { HarnessError } from '../../core/src/errors/HarnessError.js';
import { ErrorCodes } from '../../core/src/errors/ErrorCodes.js';

export interface LocalModelConfig {
  endpoint?: string;
  model?: string;
}

export class LocalModelAdapter implements ModelAdapter {
  public readonly name = 'LocalModelAdapter';
  private endpoint: string;
  private model: string;

  constructor(config?: LocalModelConfig) {
    this.endpoint = config?.endpoint ?? process.env.LOCAL_MODEL_ENDPOINT ?? 'http://127.0.0.1:11434/api/chat';
    this.model = config?.model ?? 'llama3';
  }

  public async generate(
    request: ModelRequest,
    options?: ModelGenerateOptions
  ): Promise<ModelResponse> {
    try {
      const resp = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
          format: 'json',
          stream: false,
        }),
        signal: options?.signal,
      });

      if (!resp.ok) {
        throw new HarnessError({
          code: ErrorCodes.MODEL_ERROR,
          message: `Local model endpoint returned status ${resp.status}`,
        });
      }

      const data: any = await resp.json();
      const rawText = data.message?.content ?? '{}';
      const parsedDecision = JSON.parse(rawText);

      return {
        decision: parsedDecision,
        rawText,
      };
    } catch (err: any) {
      if (err instanceof HarnessError) throw err;
      throw new HarnessError({
        code: ErrorCodes.MODEL_ERROR,
        message: `Local model call failed: ${err.message}`,
        cause: err,
      });
    }
  }
}
