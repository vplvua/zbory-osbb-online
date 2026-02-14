export type ApiErrorDetails = Record<string, unknown>;

export type ApiErrorDto<TDetails extends ApiErrorDetails = ApiErrorDetails> = {
  ok: false;
  message: string;
  code: string;
  details?: TDetails;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isApiErrorDto(value: unknown): value is ApiErrorDto {
  if (!isRecord(value)) {
    return false;
  }

  const ok = value.ok;
  const message = value.message;
  const code = value.code;
  const details = value.details;

  if (ok !== false) {
    return false;
  }

  if (typeof message !== 'string' || message.trim().length === 0) {
    return false;
  }

  if (typeof code !== 'string' || code.trim().length === 0) {
    return false;
  }

  if (details === undefined) {
    return true;
  }

  return isRecord(details);
}

export function isApiOkDto(value: unknown): value is { ok: true } {
  if (!isRecord(value)) {
    return false;
  }

  return value.ok === true;
}
