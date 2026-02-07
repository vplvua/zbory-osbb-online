import { classifyError, CriticalError, PermanentError, TemporaryError } from '@/lib/errors';
import { retryPresets, withRetry } from '@/lib/retry/withRetry';

export interface SmsService {
  sendCode(phone: string, code: string): Promise<boolean>;
}

const ENV_PLACEHOLDER_PREFIX = 'replace-with-';

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
  private async sendWithProvider(_phone: string, _code: string): Promise<boolean> {
    void _phone;
    void _code;

    // TODO: Implement real TurboSMS API call.
    throw new CriticalError('[TurboSMS] Real provider adapter is not implemented yet.', {
      code: 'TURBOSMS_NOT_IMPLEMENTED',
    });
  }

  async sendCode(phone: string, code: string): Promise<boolean> {
    assertSmsPayload(phone, code);

    return withRetry(async () => this.sendWithProvider(phone, code), {
      ...retryPresets.turbosms,
      shouldRetry: (error) => classifyError(error) instanceof TemporaryError,
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
