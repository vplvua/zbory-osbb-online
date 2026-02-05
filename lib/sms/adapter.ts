export interface SmsService {
  sendCode(phone: string, code: string): Promise<boolean>;
}

export class TurboSmsAdapter implements SmsService {
  async sendCode(phone: string, code: string): Promise<boolean> {
    void phone;
    void code;
    // TODO: Implement real TurboSMS API call.
    // Return false on provider errors once integrated.
    return true;
  }
}

export class DevMockSmsAdapter implements SmsService {
  async sendCode(phone: string, code: string): Promise<boolean> {
    // Dev-only mock: log the code instead of sending SMS.
    console.info(`[SMS:MOCK] ${phone} -> ${code}`);
    return true;
  }
}

export function getSmsAdapter(): SmsService {
  if (process.env.TURBOSMS_API_KEY) {
    return new TurboSmsAdapter();
  }

  return new DevMockSmsAdapter();
}
