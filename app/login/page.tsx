'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Вхід</h1>
        <p className="text-muted-foreground text-sm">
          Введіть номер телефону у форматі +380XXXXXXXXX.
        </p>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="phone">Телефон</Label>
          <Input
            id="phone"
            type="tel"
            name="phone"
            placeholder="+380XXXXXXXXX"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? 'Надсилання...' : 'Надіслати код'}
        </Button>
      </form>
    </main>
  );
}
