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

    let detachFormListeners: (() => void) | null = null;

    const attachToForm = () => {
      if (detachFormListeners) {
        return true;
      }

      const form = document.getElementById(formId);
      if (!(form instanceof HTMLFormElement)) {
        return false;
      }

      const initialSnapshot = serializeForm(form);
      const updateState = () => {
        const isDirty = serializeForm(form) !== initialSnapshot;
        setCanSubmit(isDirty);
      };

      updateState();
      form.addEventListener('input', updateState);
      form.addEventListener('change', updateState);
      form.addEventListener('reset', updateState);
      detachFormListeners = () => {
        form.removeEventListener('input', updateState);
        form.removeEventListener('change', updateState);
        form.removeEventListener('reset', updateState);
      };

      return true;
    };

    if (attachToForm()) {
      return () => {
        detachFormListeners?.();
      };
    }

    const observer = new MutationObserver(() => {
      const attached = attachToForm();
      if (attached) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      detachFormListeners?.();
    };
  }, [formId, isLocked]);

  return (
    <Button type="submit" form={formId} disabled={isDisabled}>
      {isPending ? <LoadingSpinner className="h-4 w-4" /> : null}
      {isPending ? 'Збереження...' : 'Зберегти'}
    </Button>
  );
}
