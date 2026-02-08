'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

type ProtocolEditSaveButtonProps = {
  formId: string;
};

function buildFormSnapshot(form: HTMLFormElement): string {
  const data = new FormData(form);
  const entries = Array.from(data.entries())
    .map(([key, value]) => [key, String(value)] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return JSON.stringify(entries);
}

export default function ProtocolEditSaveButton({ formId }: ProtocolEditSaveButtonProps) {
  const initialSnapshotRef = useRef<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const setDirtyState = () => {
      const current = buildFormSnapshot(form);
      const initial = initialSnapshotRef.current;
      setIsDirty(initial !== null && current !== initial);
    };
    const resetDirtyState = () => {
      setIsDirty(false);
    };

    initialSnapshotRef.current = buildFormSnapshot(form);

    form.addEventListener('input', setDirtyState);
    form.addEventListener('change', setDirtyState);
    form.addEventListener('reset', resetDirtyState);
    const observer = new MutationObserver(setDirtyState);
    observer.observe(form, { childList: true, subtree: true });

    return () => {
      form.removeEventListener('input', setDirtyState);
      form.removeEventListener('change', setDirtyState);
      form.removeEventListener('reset', resetDirtyState);
      observer.disconnect();
    };
  }, [formId]);

  return (
    <Button type="submit" form={formId} disabled={!isDirty}>
      Зберегти
    </Button>
  );
}
