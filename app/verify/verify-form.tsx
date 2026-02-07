'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

      router.push('/osbb');
    } catch {
      setError('Сталася помилка. Спробуйте ще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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

      <label className="flex flex-col gap-2 text-sm">
        Код
        <input
          className="rounded border border-neutral-300 px-3 py-2 tracking-[0.2em]"
          type="text"
          name="code"
          inputMode="numeric"
          placeholder="1234"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? 'Перевірка...' : 'Підтвердити'}
      </button>
    </form>
  );
}
