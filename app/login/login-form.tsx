'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PhoneInput } from '@/components/ui/phone-input';

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

      const result = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setError(result.message ?? 'Не вдалося надіслати код.');
        return;
      }

      router.push(`/verify?phone=${encodeURIComponent(phone)}`);
    } catch {
      setError('Сталася помилка. Спробуйте ще раз.');
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
