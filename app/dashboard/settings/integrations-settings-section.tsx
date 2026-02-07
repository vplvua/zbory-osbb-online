'use client';

import { useState } from 'react';

export type IntegrationSettingsFormState = {
  dubidocApiKey: string;
  dubidocOrgId: string;
  turboSmsApiKey: string;
  openAiApiKey: string;
};

type IntegrationSettingsSectionProps = {
  form: IntegrationSettingsFormState;
  onFieldChange: (field: keyof IntegrationSettingsFormState, value: string) => void;
};

export default function IntegrationSettingsSection({
  form,
  onFieldChange,
}: IntegrationSettingsSectionProps) {
  const [showKeys, setShowKeys] = useState(false);

  return (
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
          onChange={(event) => onFieldChange('dubidocApiKey', event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Dubidoc Org ID
        <input
          className="rounded border border-neutral-300 px-3 py-2"
          type={showKeys ? 'text' : 'password'}
          value={form.dubidocOrgId}
          onChange={(event) => onFieldChange('dubidocOrgId', event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        TurboSMS API key
        <input
          className="rounded border border-neutral-300 px-3 py-2"
          type={showKeys ? 'text' : 'password'}
          value={form.turboSmsApiKey}
          onChange={(event) => onFieldChange('turboSmsApiKey', event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        OpenAI API key
        <input
          className="rounded border border-neutral-300 px-3 py-2"
          type={showKeys ? 'text' : 'password'}
          value={form.openAiApiKey}
          onChange={(event) => onFieldChange('openAiApiKey', event.target.value)}
        />
      </label>
    </section>
  );
}
