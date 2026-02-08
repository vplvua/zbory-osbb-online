'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';

export default function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isPhoneComplete = /^\+380\d{9}$/.test(phone);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      setIsLoading(false);
    }
  };

  return (
    <>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="phone">Ваш номер телефону</Label>
          <PhoneInput id="phone" name="phone" value={phone} onValueChange={setPhone} required />
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <Button className="w-full" type="submit" disabled={isLoading || !isPhoneComplete}>
          {isLoading ? 'Надсилання...' : 'Надіслати код'}
        </Button>
      </form>
    </>
  );
}
