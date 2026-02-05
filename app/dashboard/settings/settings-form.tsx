'use client';

import { useEffect, useState } from 'react';

type SettingsFormState = {
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  organizerPosition: string;
  dubidocApiKey: string;
  dubidocOrgId: string;
  turboSmsApiKey: string;
  openAiApiKey: string;
};

const initialState: SettingsFormState = {
  organizerName: '',
  organizerEmail: '',
  organizerPhone: '',
  organizerPosition: '',
  dubidocApiKey: '',
  dubidocOrgId: '',
  turboSmsApiKey: '',
  openAiApiKey: '',
};

export default function SettingsForm() {
  const [form, setForm] = useState<SettingsFormState>(initialState);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await fetch('/api/settings');
        const result = (await response.json()) as {
          ok: boolean;
          message?: string;
          settings?: SettingsFormState;
        };

        if (!response.ok || !result.ok || !result.settings) {
          throw new Error(result.message ?? 'Не вдалося завантажити налаштування.');
        }

        if (isMounted) {
          setForm(result.settings);
        }
      } catch (error) {
        if (isMounted) {
          setStatus(error instanceof Error ? error.message : 'Помилка завантаження.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateField =
    (field: keyof SettingsFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsSaving(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? 'Не вдалося зберегти налаштування.');
      }

      setStatus('Налаштування збережено.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Сталася помилка.');
    } finally {
      setIsSaving(false);
    }
  };

  return isLoading ? (
    <p className="text-sm text-neutral-600">Завантаження...</p>
  ) : (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Уповноважена особа</h2>

        <label className="flex flex-col gap-2 text-sm">
          ПІБ
          <input
            className="rounded border border-neutral-300 px-3 py-2"
            value={form.organizerName}
            onChange={updateField('organizerName')}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Посада
          <input
            className="rounded border border-neutral-300 px-3 py-2"
            value={form.organizerPosition}
            onChange={updateField('organizerPosition')}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Email
          <input
            className="rounded border border-neutral-300 px-3 py-2"
            type="email"
            value={form.organizerEmail}
            onChange={updateField('organizerEmail')}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Телефон
          <input
            className="rounded border border-neutral-300 px-3 py-2"
            placeholder="+380XXXXXXXXX"
            value={form.organizerPhone}
            onChange={updateField('organizerPhone')}
          />
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Інтеграції</h2>

        <button
          className="w-fit rounded border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700"
          type="button"
          onClick={() => setShowKeys((value) => !value)}
        >
          {showKeys ? 'Приховати ключі' : 'Показати ключі'}
        </button>

        <label className="flex flex-col gap-2 text-sm">
          Dubidoc API key
          <input
            className="rounded border border-neutral-300 px-3 py-2"
            type={showKeys ? 'text' : 'password'}
            value={form.dubidocApiKey}
            onChange={updateField('dubidocApiKey')}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Dubidoc Org ID
          <input
            className="rounded border border-neutral-300 px-3 py-2"
            type={showKeys ? 'text' : 'password'}
            value={form.dubidocOrgId}
            onChange={updateField('dubidocOrgId')}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          TurboSMS API key
          <input
            className="rounded border border-neutral-300 px-3 py-2"
            type={showKeys ? 'text' : 'password'}
            value={form.turboSmsApiKey}
            onChange={updateField('turboSmsApiKey')}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          OpenAI API key
          <input
            className="rounded border border-neutral-300 px-3 py-2"
            type={showKeys ? 'text' : 'password'}
            value={form.openAiApiKey}
            onChange={updateField('openAiApiKey')}
          />
        </label>
      </section>

      {status ? <p className="text-sm text-neutral-600">{status}</p> : null}

      <button
        className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        type="submit"
        disabled={isSaving}
      >
        {isSaving ? 'Збереження...' : 'Зберегти'}
      </button>
    </form>
  );
}
