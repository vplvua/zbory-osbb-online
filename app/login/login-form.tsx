'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  readJsonBody,
  readNumericErrorDetail,
  resolveApiErrorMessage,
  type ApiErrorCodeMap,
} from '@/lib/api/client-error';
import type { ApiErrorDto } from '@/lib/api/error-dto';
import { isApiOkDto } from '@/lib/api/error-dto';
import { toast } from '@/lib/toast/client';

const UNKNOWN_AUTH_ERROR_MESSAGE = 'Сталася помилка. Спробуйте ще раз.';
const REQUEST_CODE_ERROR_MAP: ApiErrorCodeMap = {
  AUTH_REQUEST_INVALID_JSON: 'Перевірте номер телефону та спробуйте ще раз.',
  AUTH_REQUEST_INVALID_PHONE: 'Перевірте формат номера телефону.',
  AUTH_REQUEST_SMS_SEND_FAILED: 'Не вдалося надіслати код. Спробуйте пізніше.',
  AUTH_REQUEST_FAILED: 'Не вдалося надіслати код. Спробуйте пізніше.',
  AUTH_REQUEST_RATE_LIMIT: (error: ApiErrorDto) => {
    const retryMinutes = readNumericErrorDetail(error, 'retryMinutes');
    if (retryMinutes && retryMinutes > 0) {
      return `Забагато спроб. Спробуйте через ${retryMinutes} хв.`;
    }

    return 'Забагато спроб. Спробуйте пізніше.';
  },
};

export default function LoginForm() {
  const router = useRouter();
  const requestInFlightRef = useRef(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isPhoneComplete = /^\+380\d{9}$/.test(phone);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestInFlightRef.current || isLoading) {
      return;
    }

    requestInFlightRef.current = true;
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const payload = await readJsonBody(response);
      if (!response.ok || !isApiOkDto(payload)) {
        const message = resolveApiErrorMessage(payload, {
          codeMap: REQUEST_CODE_ERROR_MAP,
          fallbackMessage: UNKNOWN_AUTH_ERROR_MESSAGE,
        });
        setError(message);
        toast.error(message);
        return;
      }

      toast.success('Код підтвердження надіслано.');
      router.push(`/verify?phone=${encodeURIComponent(phone)}`);
    } catch {
      const message = 'Сталася помилка. Спробуйте ще раз.';
      setError(message);
      toast.error(message);
    } finally {
      requestInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <fieldset disabled={isLoading} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Ваш номер телефону</Label>
            <PhoneInput id="phone" name="phone" value={phone} onValueChange={setPhone} required />
          </div>

          {error ? <ErrorAlert>{error}</ErrorAlert> : null}

          <Button className="w-full" type="submit" disabled={isLoading || !isPhoneComplete}>
            {isLoading ? <LoadingSpinner className="h-4 w-4" /> : null}
            {isLoading ? 'Надсилання...' : 'Надіслати код'}
          </Button>
        </fieldset>
      </form>
    </>
  );
}
