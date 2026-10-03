import { HarnessError } from '../errors/HarnessError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';

export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  operationName = 'Operation'
): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new HarnessError({
          code: ErrorCodes.TOOL_TIMEOUT,
          message: `${operationName} timed out after ${timeoutMs}ms`,
          retryable: true,
          metadata: { timeoutMs, operationName },
        })
      );
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(controller.signal), timeoutPromise]);
    return result;
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }
}
