import { z } from 'zod';
import { classifyError, CriticalError, PermanentError, TemporaryError } from '@/lib/errors';
import { retryPresets, withRetry } from '@/lib/retry/withRetry';

export interface SmsService {
  sendCode(phone: string, code: string): Promise<boolean>;
}

const ENV_PLACEHOLDER_PREFIX = 'replace-with-';
const TURBOSMS_BASE_URL = 'https://api.turbosms.ua';
const TURBOSMS_SEND_PATH = '/message/send.json';

const turboSmsPayloadSchema = z
  .object({
    recipients: z
      .array(
        z
          .string()
          .trim()
          .regex(/^\+\d{8,15}$/),
      )
      .min(1),
    sms: z
      .object({
        sender: z.string().trim().min(1).max(32),
        text: z.string().trim().min(1).max(765),
      })
      .strict(),
  })
  .strict();

const turboSmsSendResultSchema = z
  .object({
    response_code: z.number().int(),
    response_status: z.string().min(1),
  })
  .passthrough();

const turboSmsSendResponseSchema = z
  .object({
    response_code: z.number().int(),
    response_status: z.string().min(1),
    response_error: z.string().optional(),
    response_result: z.unknown().optional(),
  })
  .passthrough();

type TurboSmsSendPayload = z.infer<typeof turboSmsPayloadSchema>;
type TurboSmsSendResult = z.infer<typeof turboSmsSendResultSchema>;
type TurboSmsSendResponse = z.infer<typeof turboSmsSendResponseSchema>;

const TURBOSMS_SUCCESS_CODES = new Set([0, 800, 801, 802, 803]);

function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function classifyTurboSmsHttpStatus(status: number, message: string) {
  const code = `TURBOSMS_HTTP_${status}`;

  if (status === 401 || status === 403) {
    return new CriticalError(message, { code });
  }

  if (isRetryableHttpStatus(status)) {
    return new TemporaryError(message, { code });
  }

  return new PermanentError(message, { code });
}

function classifyTurboSmsRequestError(error: unknown) {
  if (error instanceof TypeError) {
    return new TemporaryError(error.message || '[TurboSMS] Network request failed.', {
      code: 'TURBOSMS_NETWORK_ERROR',
      cause: error,
    });
  }

  return classifyError(error);
}

function createProviderError(
  type: 'TEMPORARY' | 'PERMANENT' | 'CRITICAL',
  message: string,
  code: string,
) {
  if (type === 'TEMPORARY') {
    return new TemporaryError(message, { code });
  }

  if (type === 'CRITICAL') {
    return new CriticalError(message, { code });
  }

  return new PermanentError(message, { code });
}

function mapProviderFailure(providerCode: number, providerStatus: string) {
  const status = providerStatus.trim();
  const prefixedStatus = status.length > 0 ? status : `Provider code ${providerCode}`;
  const providerCodeSuffix = String(providerCode).padStart(3, '0');
  const providerStatusSuffix = prefixedStatus
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  const fallbackCode = providerStatusSuffix
    ? `TURBOSMS_PROVIDER_${providerCodeSuffix}_${providerStatusSuffix}`
    : `TURBOSMS_PROVIDER_${providerCodeSuffix}`;

  switch (providerCode) {
    case 203:
      return createProviderError(
        'CRITICAL',
        `[TurboSMS] Недостатньо кредитів: ${prefixedStatus}.`,
        'TURBOSMS_INSUFFICIENT_CREDITS',
      );
    case 103:
    case 104:
    case 105:
    case 106:
    case 301:
      return createProviderError(
        'CRITICAL',
        `[TurboSMS] Невірна авторизація або конфігурація провайдера: ${prefixedStatus}.`,
        'TURBOSMS_AUTH_FAILED',
      );
    case 500:
    case 501:
    case 502:
    case 503:
    case 504:
    case 505:
    case 506:
    case 999:
      return createProviderError(
        'TEMPORARY',
        `[TurboSMS] Тимчасова помилка провайдера: ${prefixedStatus}.`,
        'TURBOSMS_PROVIDER_INTERNAL_ERROR',
      );
    default:
      return createProviderError(
        'PERMANENT',
        `[TurboSMS] Помилка провайдера (${providerCode}): ${prefixedStatus}.`,
        fallbackCode,
      );
  }
}

function buildOtpMessage(code: string): string {
  return `Ваш код підтвердження: ${code}`;
}

function readProviderStatus(response: TurboSmsSendResponse): string {
  if (typeof response.response_error === 'string' && response.response_error.trim().length > 0) {
    return response.response_error.trim();
  }

  return response.response_status.trim();
}

function parseSendResults(response: TurboSmsSendResponse): TurboSmsSendResult[] {
  if (Array.isArray(response.response_result) && response.response_result.length > 0) {
    return response.response_result.map((item) => {
      const parsed = turboSmsSendResultSchema.safeParse(item);
      if (!parsed.success) {
        throw new CriticalError('[TurboSMS] Unexpected send response item format.', {
          code: 'TURBOSMS_INVALID_SEND_RESULT',
        });
      }

      return parsed.data;
    });
  }

  const single = turboSmsSendResultSchema.safeParse(response.response_result);
  if (single.success) {
    return [single.data];
  }

  if (response.response_code === 803) {
    // Accepted but deferred mode may have no per-recipient details immediately.
    return [{ response_code: 803, response_status: response.response_status }];
  }

  if (response.response_code === 507) {
    // Duplicate request may omit response_result; classify from top-level code/status.
    return [{ response_code: 507, response_status: response.response_status }];
  }

  if (TURBOSMS_SUCCESS_CODES.has(response.response_code)) {
    return [{ response_code: response.response_code, response_status: response.response_status }];
  }

  if (response.response_result === undefined || response.response_result === null) {
    throw new CriticalError(
      '[TurboSMS] Unexpected send response format: response_result missing.',
      {
        code: 'TURBOSMS_INVALID_SEND_RESPONSE',
      },
    );
  }

  throw new CriticalError('[TurboSMS] Unexpected send response item format.', {
    code: 'TURBOSMS_INVALID_SEND_RESULT',
  });
}

function assertSuccessfulProviderResponse(payload: unknown): void {
  const parsed = turboSmsSendResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new CriticalError('[TurboSMS] Unexpected send response format.', {
      code: 'TURBOSMS_INVALID_RESPONSE',
    });
  }

  const response = parsed.data;
  if (!TURBOSMS_SUCCESS_CODES.has(response.response_code) && response.response_code !== 507) {
    throw mapProviderFailure(response.response_code, readProviderStatus(response));
  }

  const results = parseSendResults(response);
  let hasAcceptedRecipient = false;
  let firstRecipientError: TurboSmsSendResult | null = null;
  for (const result of results) {
    if (TURBOSMS_SUCCESS_CODES.has(result.response_code)) {
      hasAcceptedRecipient = true;
      continue;
    }

    if (!firstRecipientError) {
      firstRecipientError = result;
    }
  }

  if (!hasAcceptedRecipient && firstRecipientError) {
    throw mapProviderFailure(
      firstRecipientError.response_code,
      firstRecipientError.response_status,
    );
  }
}

function hasEnvValue(value: string | undefined): boolean {
  return Boolean(
    value && value.trim().length > 0 && !value.trim().startsWith(ENV_PLACEHOLDER_PREFIX),
  );
}

function assertSmsPayload(phone: string, code: string): void {
  if (!phone.trim()) {
    throw new PermanentError('[TurboSMS] Phone is required.', {
      code: 'TURBOSMS_PHONE_REQUIRED',
    });
  }

  if (!code.trim()) {
    throw new PermanentError('[TurboSMS] OTP code is required.', {
      code: 'TURBOSMS_CODE_REQUIRED',
    });
  }
}

export class TurboSmsAdapter implements SmsService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly sender: string;

  constructor() {
    this.baseUrl = TURBOSMS_BASE_URL;
    this.apiKey = process.env.TURBOSMS_API_KEY?.trim() ?? '';
    this.sender = process.env.TURBOSMS_SENDER?.trim() ?? '';
  }

  private get authHeader(): string {
    if (!this.apiKey) {
      throw new CriticalError('[TurboSMS] API key is not configured.', {
        code: 'TURBOSMS_API_KEY_REQUIRED',
      });
    }

    return `Bearer ${this.apiKey}`;
  }

  private buildPayload(phone: string, code: string): TurboSmsSendPayload {
    if (!this.sender) {
      throw new CriticalError('[TurboSMS] Sender is not configured.', {
        code: 'TURBOSMS_SENDER_NOT_CONFIGURED',
      });
    }

    const parsed = turboSmsPayloadSchema.safeParse({
      recipients: [phone],
      sms: {
        sender: this.sender,
        text: buildOtpMessage(code),
      },
    });

    if (!parsed.success) {
      throw new PermanentError('[TurboSMS] Invalid send payload.', {
        code: 'TURBOSMS_INVALID_PAYLOAD',
        cause: parsed.error,
      });
    }

    return parsed.data;
  }

  private async sendWithProvider(
    phone: string,
    code: string,
    signal: AbortSignal,
  ): Promise<boolean> {
    const payload = this.buildPayload(phone, code);

    try {
      const response = await fetch(`${this.baseUrl}${TURBOSMS_SEND_PATH}`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok) {
        let detail = '';
        try {
          detail = (await response.text()).trim();
        } catch {
          detail = '';
        }

        const message =
          detail.length > 0
            ? `[TurboSMS] POST ${TURBOSMS_SEND_PATH} failed with status ${response.status}. ${detail}`
            : `[TurboSMS] POST ${TURBOSMS_SEND_PATH} failed with status ${response.status}.`;
        throw classifyTurboSmsHttpStatus(response.status, message);
      }

      const rawResponse = (await response.json()) as unknown;
      assertSuccessfulProviderResponse(rawResponse);
      return true;
    } catch (error) {
      throw classifyTurboSmsRequestError(error);
    }
  }

  async sendCode(phone: string, code: string): Promise<boolean> {
    assertSmsPayload(phone, code);

    return withRetry(async ({ signal }) => this.sendWithProvider(phone, code, signal), {
      ...retryPresets.turbosms,
      shouldRetry: (error) => classifyError(error) instanceof TemporaryError,
      onRetry: ({ attempt, nextDelayMs }) => {
        console.warn('[turbosms:http] request retry scheduled', {
          path: TURBOSMS_SEND_PATH,
          attempt,
          retryInMs: nextDelayMs,
        });
      },
    });
  }
}

export class DevMockSmsAdapter implements SmsService {
  async sendCode(phone: string, code: string): Promise<boolean> {
    assertSmsPayload(phone, code);

    // Dev-only mock: log the code instead of sending SMS.
    console.info(`[SMS:MOCK] ${phone} -> ${code}`);
    return true;
  }
}

export function getSmsAdapter(): SmsService {
  if (hasEnvValue(process.env.TURBOSMS_API_KEY)) {
    return new TurboSmsAdapter();
  }

  return new DevMockSmsAdapter();
}
