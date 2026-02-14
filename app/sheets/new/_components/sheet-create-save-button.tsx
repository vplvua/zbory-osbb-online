'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useExternalFormPending } from '@/lib/forms/use-external-form-pending';

type SheetCreateSaveButtonProps = {
  formId: string;
};

function hasValueField(form: HTMLFormElement, fieldName: string): boolean {
  const field = form.elements.namedItem(fieldName);
  if (!(field instanceof HTMLInputElement)) {
    return false;
  }

  return field.value.trim().length > 0;
}

function hasOwnerSelection(form: HTMLFormElement): boolean {
  return form.querySelectorAll('input[name="ownerIds"]').length > 0;
}

export default function SheetCreateSaveButton({ formId }: SheetCreateSaveButtonProps) {
  const [canSubmit, setCanSubmit] = useState(false);
  const isPending = useExternalFormPending(formId);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const updateState = () => {
      const hasProtocol = hasValueField(form, 'protocolId');
      const hasOwner = hasOwnerSelection(form);
      setCanSubmit(form.checkValidity() && hasProtocol && hasOwner);
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
      {isPending ? 'Створення...' : 'Створити листок'}
    </Button>
  );
}
