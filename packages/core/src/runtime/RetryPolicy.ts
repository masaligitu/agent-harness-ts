import { ErrorCodes } from '../errors/ErrorCodes.js';

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  multiplier?: number;
  retryableErrors?: string[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 2,
  backoffMs: 50,
  multiplier: 2,
  retryableErrors: [
    ErrorCodes.TOOL_TIMEOUT,
    ErrorCodes.TOOL_EXECUTION_FAILED,
  ],
};

export function isErrorRetryable(errorCode: string, policy: RetryPolicy): boolean {
  if (!policy.retryableErrors || policy.retryableErrors.length === 0) {
    return false;
  }
  return policy.retryableErrors.includes(errorCode);
}
