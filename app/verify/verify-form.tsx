'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';

type VerifyFormProps = {
  initialPhone: string;
};

export default function VerifyForm({ initialPhone }: VerifyFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const result = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setError(result.message ?? 'Не вдалося підтвердити код.');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Сталася помилка. Спробуйте ще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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
        {isLoading ? 'Перевірка...' : 'Підтвердити'}
      </Button>
    </form>
  );
}
