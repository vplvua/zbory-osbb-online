import type { ApiErrorDto } from '@/lib/api/error-dto';
import { isApiErrorDto } from '@/lib/api/error-dto';

type ApiErrorMessageResolver = string | ((error: ApiErrorDto) => string);

export type ApiErrorCodeMap = Record<string, ApiErrorMessageResolver>;

export async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function readNumericErrorDetail(error: ApiErrorDto, key: string): number | null {
  const value = error.details?.[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export function resolveApiErrorMessage(
  payload: unknown,
  options: {
    codeMap: ApiErrorCodeMap;
    fallbackMessage: string;
  },
): string {
  if (!isApiErrorDto(payload)) {
    return options.fallbackMessage;
  }

  const resolver = options.codeMap[payload.code];
  if (resolver === undefined) {
    return options.fallbackMessage;
  }

  const message = typeof resolver === 'function' ? resolver(payload) : resolver;
  return message.trim().length > 0 ? message : options.fallbackMessage;
}
