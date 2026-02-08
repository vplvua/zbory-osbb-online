'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginForm() {
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
    <>
      <div className="moeosbb-logo">
        <Link href="/" className="logo" aria-label="МОЄ ОСББ">
          <svg
            className="icon logo"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              fill="#4C3CFF"
              d="m25.4 12.3-7.6-5.7a3 3 0 0 0-3.6 0l-7.6 5.7A4 4 0 0 0 5 15.5V22a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4v-6.5a4 4 0 0 0-1.6-3.2"
            />
            <path
              fill="#2AD590"
              d="m21 14.5-4.2 5.6a1.2 1.2 0 0 1-.9.5h-.1a1.2 1.2 0 0 1-.85-.35l-2.4-2.4a1.2 1.2 0 0 1 1.7-1.7l1.42 1.43 2.77-3.7a1.2 1.2 0 1 1 1.92 1.44Z"
            />
          </svg>
          <span className="logo-text">МОЄ ОСББ</span>
        </Link>
      </div>

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
    </>
  );
}
