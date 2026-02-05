'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
        <p className="text-sm text-neutral-600">Введіть номер телефону у форматі +380XXXXXXXXX.</p>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm">
          Телефон
          <input
            className="rounded border border-neutral-300 px-3 py-2"
            type="tel"
            name="phone"
            placeholder="+380XXXXXXXXX"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Надсилання...' : 'Надіслати код'}
        </button>
      </form>
    </main>
  );
}
