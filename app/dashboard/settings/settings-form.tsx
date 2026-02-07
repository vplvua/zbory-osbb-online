'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SettingsFormState = {
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  organizerPosition: string;
  // Kept for forward compatibility with per-user integrations (hidden in MVP UI).
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
    <p className="text-muted-foreground text-sm">Завантаження...</p>
  ) : (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Уповноважена особа</h2>

        <div className="space-y-2">
          <Label htmlFor="organizerName">ПІБ</Label>
          <Input
            id="organizerName"
            value={form.organizerName}
            onChange={updateField('organizerName')}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="organizerPosition">Посада</Label>
          <Input
            id="organizerPosition"
            value={form.organizerPosition}
            onChange={updateField('organizerPosition')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="organizerEmail">Email</Label>
          <Input
            id="organizerEmail"
            type="email"
            value={form.organizerEmail}
            onChange={updateField('organizerEmail')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="organizerPhone">Телефон</Label>
          <Input
            id="organizerPhone"
            placeholder="+380XXXXXXXXX"
            value={form.organizerPhone}
            onChange={updateField('organizerPhone')}
          />
        </div>
      </section>

      {status ? <p className="text-muted-foreground text-sm">{status}</p> : null}

      <Button className="w-full" type="submit" disabled={isSaving}>
        {isSaving ? 'Збереження...' : 'Зберегти'}
      </Button>
    </form>
  );
}
