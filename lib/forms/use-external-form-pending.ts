'use client';

import { useEffect, useState } from 'react';

export function useExternalFormPending(formId: string) {
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const syncPendingState = () => {
      setIsPending(form.dataset.submitting === 'true');
    };

    const handleSubmit = (event: Event) => {
      if (event.defaultPrevented || !form.checkValidity()) {
        return;
      }

      setIsPending(true);
    };

    syncPendingState();
    const observer = new MutationObserver(syncPendingState);
    observer.observe(form, { attributes: true, attributeFilter: ['data-submitting'] });
    form.addEventListener('submit', handleSubmit);

    return () => {
      observer.disconnect();
      form.removeEventListener('submit', handleSubmit);
    };
  }, [formId]);

  return isPending;
}
