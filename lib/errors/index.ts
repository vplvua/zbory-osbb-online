export type IntegrationErrorType = 'TEMPORARY' | 'PERMANENT' | 'CRITICAL';

type IntegrationErrorOptions = {
  code?: string;
  cause?: unknown;
};

abstract class IntegrationError extends Error {
  abstract readonly type: IntegrationErrorType;
  readonly code?: string;
  override readonly cause?: unknown;

  constructor(message: string, options?: IntegrationErrorOptions) {
    super(message);
    this.name = new.target.name;
    this.code = options?.code;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TemporaryError extends IntegrationError {
  readonly type = 'TEMPORARY' as const;
}

export class PermanentError extends IntegrationError {
  readonly type = 'PERMANENT' as const;
}

export class CriticalError extends IntegrationError {
  readonly type = 'CRITICAL' as const;
}

export type ClassifiedError = TemporaryError | PermanentError | CriticalError;

const TEMPORARY_ERROR_NAMES = new Set(['AbortError', 'TimeoutError']);
const TEMPORARY_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);
const CRITICAL_ERROR_CODES = new Set(['ENOMEM', 'ERR_OUT_OF_MEMORY']);

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || !error || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code: unknown }).code;
  return typeof code === 'string' && code.trim().length > 0 ? code : undefined;
}

function readErrorMessage(error: Error): string {
  const message = error.message.trim();
  if (message.length > 0) {
    return message;
  }

  const fallback = error.name.trim();
  return fallback.length > 0 ? fallback : 'Unknown integration error.';
}

export function isClassifiedError(error: unknown): error is ClassifiedError {
  return (
    error instanceof TemporaryError ||
    error instanceof PermanentError ||
    error instanceof CriticalError
  );
}

export function classifyError(error: unknown): ClassifiedError {
  if (isClassifiedError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const code = readErrorCode(error);
    const message = readErrorMessage(error);

    if (code && CRITICAL_ERROR_CODES.has(code)) {
      return new CriticalError(message, { code, cause: error });
    }

    if (TEMPORARY_ERROR_NAMES.has(error.name) || (code && TEMPORARY_ERROR_CODES.has(code))) {
      return new TemporaryError(message, { code, cause: error });
    }

    if (
      error instanceof TypeError ||
      error instanceof ReferenceError ||
      error instanceof SyntaxError ||
      error instanceof RangeError ||
      error instanceof URIError
    ) {
      return new CriticalError(message, { code, cause: error });
    }

    return new PermanentError(message, { code, cause: error });
  }

  return new CriticalError('Unknown non-error value was thrown.', {
    code: 'UNKNOWN_THROWN_VALUE',
    cause: error,
  });
}
