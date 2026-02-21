'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { isFormValid } from '@/lib/forms/is-form-valid';
import { useExternalFormPending } from '@/lib/forms/use-external-form-pending';

type OsbbEditSaveButtonProps = {
  formId: string;
};

function buildFormSnapshot(form: HTMLFormElement): string {
  const data = new FormData(form);
  const entries = Array.from(data.entries())
    .map(([key, value]) => [key, String(value)] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return JSON.stringify(entries);
}

export default function OsbbEditSaveButton({ formId }: OsbbEditSaveButtonProps) {
  const initialSnapshotRef = useRef<string | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const isPending = useExternalFormPending(formId);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const updateSubmitState = () => {
      const current = buildFormSnapshot(form);
      const initial = initialSnapshotRef.current;
      const isDirty = initial !== null && current !== initial;
      setCanSubmit(isDirty && isFormValid(form));
    };
    const resetDirtyState = () => {
      setCanSubmit(false);
    };

    initialSnapshotRef.current = buildFormSnapshot(form);

    updateSubmitState();
    form.addEventListener('input', updateSubmitState);
    form.addEventListener('change', updateSubmitState);
    form.addEventListener('reset', resetDirtyState);

    return () => {
      form.removeEventListener('input', updateSubmitState);
      form.removeEventListener('change', updateSubmitState);
      form.removeEventListener('reset', resetDirtyState);
    };
  }, [formId]);

  return (
    <Button type="submit" form={formId} disabled={!canSubmit || isPending}>
      {isPending ? <LoadingSpinner className="h-4 w-4" /> : null}
      {isPending ? 'Збереження...' : 'Зберегти'}
    </Button>
  );
}
