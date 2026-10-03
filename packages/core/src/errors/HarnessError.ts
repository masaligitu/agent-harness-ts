import { ErrorCodes, ErrorCode } from './ErrorCodes.js';

export interface HarnessErrorData {
  code: ErrorCode;
  message: string;
  retryable?: boolean;
  cause?: unknown;
  metadata?: Record<string, unknown>;
}

export class HarnessError extends Error {
  public readonly code: ErrorCode;
  public readonly retryable: boolean;
  public readonly metadata?: Record<string, unknown>;

  constructor(data: HarnessErrorData) {
    super(`[${data.code}] ${data.message}`);
    this.name = 'HarnessError';
    this.code = data.code;
    this.retryable = data.retryable ?? false;
    this.cause = data.cause;
    this.metadata = data.metadata;
    Object.setPrototypeOf(this, HarnessError.prototype);
  }
}
