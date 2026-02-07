'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

      <Button
        className="h-8 w-fit px-3 text-xs"
        variant="outline"
        type="button"
        onClick={() => setShowKeys((value) => !value)}
      >
        {showKeys ? 'Приховати ключі' : 'Показати ключі'}
      </Button>

      <div className="space-y-2">
        <Label htmlFor="dubidocApiKey">Dubidoc API key</Label>
        <Input
          id="dubidocApiKey"
          type={showKeys ? 'text' : 'password'}
          value={form.dubidocApiKey}
          onChange={(event) => onFieldChange('dubidocApiKey', event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dubidocOrgId">Dubidoc Org ID</Label>
        <Input
          id="dubidocOrgId"
          type={showKeys ? 'text' : 'password'}
          value={form.dubidocOrgId}
          onChange={(event) => onFieldChange('dubidocOrgId', event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="turboSmsApiKey">TurboSMS API key</Label>
        <Input
          id="turboSmsApiKey"
          type={showKeys ? 'text' : 'password'}
          value={form.turboSmsApiKey}
          onChange={(event) => onFieldChange('turboSmsApiKey', event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="openAiApiKey">OpenAI API key</Label>
        <Input
          id="openAiApiKey"
          type={showKeys ? 'text' : 'password'}
          value={form.openAiApiKey}
          onChange={(event) => onFieldChange('openAiApiKey', event.target.value)}
        />
      </div>
    </section>
  );
}
