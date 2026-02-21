'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { isFormValid } from '@/lib/forms/is-form-valid';
import { useExternalFormPending } from '@/lib/forms/use-external-form-pending';

type ProtocolCreateSaveButtonProps = {
  formId: string;
};

export default function ProtocolCreateSaveButton({ formId }: ProtocolCreateSaveButtonProps) {
  const [canSubmit, setCanSubmit] = useState(false);
  const isPending = useExternalFormPending(formId);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const updateState = () => {
      setCanSubmit(isFormValid(form));
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
    <Button type="submit" form={formId} disabled={!canSubmit || isPending}>
      {isPending ? <LoadingSpinner className="h-4 w-4" /> : null}
      {isPending ? 'Збереження...' : 'Зберегти'}
    </Button>
  );
}
