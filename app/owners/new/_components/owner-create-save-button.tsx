'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type OwnerCreateSaveButtonProps = {
  formId: string;
};

export default function OwnerCreateSaveButton({ formId }: OwnerCreateSaveButtonProps) {
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const updateState = () => {
      setCanSubmit(form.checkValidity());
    };

    updateState();
    form.addEventListener('input', updateState);
    form.addEventListener('change', updateState);

    return () => {
      form.removeEventListener('input', updateState);
      form.removeEventListener('change', updateState);
    };
  }, [formId]);

  return (
    <Button type="submit" form={formId} disabled={!canSubmit}>
      Зберегти
    </Button>
  );
}
