export type RetryBackoffStrategy = 'exponential' | 'linear';

export type RetryBackoffOptions = {
  strategy: RetryBackoffStrategy;
  delayMs: number;
  maxDelayMs?: number;
};

export type RetryAttemptContext = {
  attempt: number;
  maxAttempts: number;
  signal: AbortSignal;
};

export type RetryDecisionContext = {
  attempt: number;
  maxAttempts: number;
};

export type RetryEvent = {
  attempt: number;
  maxAttempts: number;
  nextDelayMs: number;
  error: unknown;
};

export type RetryOptions = {
  maxAttempts: number;
  timeoutMs?: number;
  backoff?: RetryBackoffOptions;
  shouldRetry?: (error: unknown, context: RetryDecisionContext) => boolean;
  onRetry?: (event: RetryEvent) => void | Promise<void>;
};

export const retryPresets = {
  dubidoc: {
    maxAttempts: 3,
    timeoutMs: 30_000,
    backoff: {
      strategy: 'exponential',
      delayMs: 1_000,
    },
  },
  turbosms: {
    maxAttempts: 3,
    timeoutMs: 10_000,
    backoff: {
      strategy: 'linear',
      delayMs: 5_000,
    },
  },
  pdf: {
    maxAttempts: 2,
    timeoutMs: 60_000,
  },
} as const satisfies Record<string, RetryOptions>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createTimeoutError(timeoutMs: number): Error & { code: string } {
  const error = new Error(`Retry attempt timed out after ${timeoutMs}ms.`) as Error & {
    code: string;
  };
  error.name = 'TimeoutError';
  error.code = 'RETRY_ATTEMPT_TIMEOUT';
  return error;
}

export function getBackoffDelayMs(
  backoff: RetryBackoffOptions | undefined,
  retryIndex: number,
): number {
  if (!backoff || retryIndex <= 0) {
    return 0;
  }

  const rawDelay =
    backoff.strategy === 'linear'
      ? backoff.delayMs * retryIndex
      : backoff.delayMs * 2 ** (retryIndex - 1);

  if (backoff.maxDelayMs === undefined) {
    return rawDelay;
  }

  return Math.min(rawDelay, backoff.maxDelayMs);
}

export async function withRetry<T>(
  fn: (context: RetryAttemptContext) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) {
    throw new Error('withRetry maxAttempts must be an integer >= 1.');
  }

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const operationPromise = fn({
        attempt,
        maxAttempts: options.maxAttempts,
        signal: controller.signal,
      });

      if (options.timeoutMs === undefined) {
        return await operationPromise;
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(createTimeoutError(options.timeoutMs!));
        }, options.timeoutMs);
      });

      operationPromise.catch(() => {
        // Avoid unhandled rejections when timeout wins the race.
      });

      return await Promise.race([operationPromise, timeoutPromise]);
    } catch (error) {
      const canRetry = attempt < options.maxAttempts;
      const shouldRetry = options.shouldRetry
        ? options.shouldRetry(error, { attempt, maxAttempts: options.maxAttempts })
        : true;

      if (!canRetry || !shouldRetry) {
        throw error;
      }

      const delayMs = getBackoffDelayMs(options.backoff, attempt);
      if (options.onRetry) {
        await options.onRetry({
          attempt,
          maxAttempts: options.maxAttempts,
          nextDelayMs: delayMs,
          error,
        });
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  throw new Error('withRetry exhausted unexpectedly.');
}
