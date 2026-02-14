'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useExternalFormPending } from '@/lib/forms/use-external-form-pending';

type OwnerEditSaveButtonProps = {
  formId: string;
  isLocked?: boolean;
};

function serializeForm(form: HTMLFormElement): string {
  return JSON.stringify(
    Array.from(new FormData(form).entries())
      .map(([key, value]) => [key, String(value)])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

export default function OwnerEditSaveButton({
  formId,
  isLocked = false,
}: OwnerEditSaveButtonProps) {
  const [canSubmit, setCanSubmit] = useState(false);
  const isPending = useExternalFormPending(formId);
  const isDisabled = isLocked || !canSubmit || isPending;

  useEffect(() => {
    if (isLocked) {
      return;
    }

    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const initialSnapshot = serializeForm(form);

    const updateState = () => {
      const isValid = form.checkValidity();
      const isDirty = serializeForm(form) !== initialSnapshot;
      setCanSubmit(isValid && isDirty);
    };

    updateState();
    form.addEventListener('input', updateState);
    form.addEventListener('change', updateState);

    return () => {
      form.removeEventListener('input', updateState);
      form.removeEventListener('change', updateState);
    };
  }, [formId, isLocked]);

  return (
    <Button type="submit" form={formId} disabled={isDisabled}>
      {isPending ? <LoadingSpinner className="h-4 w-4" /> : null}
      {isPending ? 'Збереження...' : 'Зберегти'}
    </Button>
  );
}
