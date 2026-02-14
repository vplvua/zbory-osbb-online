'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Input } from '@/components/ui/input';
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

type VerifyFormProps = {
  initialPhone: string;
};

const UNKNOWN_VERIFY_ERROR_MESSAGE = 'Сталася помилка. Спробуйте ще раз.';
const VERIFY_ERROR_MAP: ApiErrorCodeMap = {
  AUTH_VERIFY_INVALID_JSON: 'Перевірте код та спробуйте ще раз.',
  AUTH_VERIFY_INVALID_INPUT: 'Перевірте код та спробуйте ще раз.',
  AUTH_VERIFY_CODE_EXPIRED: 'Код більше не дійсний. Запросіть новий код.',
  AUTH_VERIFY_FAILED: 'Не вдалося підтвердити код. Спробуйте пізніше.',
  AUTH_VERIFY_RATE_LIMIT: (error: ApiErrorDto) => {
    const retryMinutes = readNumericErrorDetail(error, 'retryMinutes');
    if (retryMinutes && retryMinutes > 0) {
      return `Забагато спроб. Спробуйте через ${retryMinutes} хв.`;
    }

    return 'Забагато спроб. Спробуйте пізніше.';
  },
  AUTH_VERIFY_CODE_INVALID: (error: ApiErrorDto) => {
    const remainingAttempts = readNumericErrorDetail(error, 'remainingAttempts');
    if (typeof remainingAttempts === 'number' && remainingAttempts > 0) {
      return `Невірний код. Залишилось спроб: ${remainingAttempts}`;
    }

    return 'Невірний код. Спробуйте ще раз.';
  },
};

export default function VerifyForm({ initialPhone }: VerifyFormProps) {
  const router = useRouter();
  const requestInFlightRef = useRef(false);
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestInFlightRef.current || isLoading) {
      return;
    }

    requestInFlightRef.current = true;
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const payload = await readJsonBody(response);
      if (!response.ok || !isApiOkDto(payload)) {
        const message = resolveApiErrorMessage(payload, {
          codeMap: VERIFY_ERROR_MAP,
          fallbackMessage: UNKNOWN_VERIFY_ERROR_MESSAGE,
        });
        setError(message);
        toast.error(message);
        return;
      }

      toast.success('Вхід виконано успішно.');
      router.push('/dashboard');
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
    <form className="space-y-4" onSubmit={handleSubmit}>
      <fieldset disabled={isLoading} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Телефон</Label>
          <PhoneInput
            id="phone"
            name="phone"
            value={phone}
            onValueChange={setPhone}
            disabled
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Код</Label>
          <Input
            id="code"
            className="tracking-[0.2em]"
            type="text"
            name="code"
            inputMode="numeric"
            placeholder="1234"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </div>

        {error ? <ErrorAlert>{error}</ErrorAlert> : null}

        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? <LoadingSpinner className="h-4 w-4" /> : null}
          {isLoading ? 'Перевірка...' : 'Підтвердити'}
        </Button>
      </fieldset>
    </form>
  );
}
