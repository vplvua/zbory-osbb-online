'use client';

import { useEffect, useRef } from 'react';
import { toast } from '@/lib/toast/client';

export function useActionErrorToast(error?: string) {
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      lastErrorRef.current = null;
      return;
    }

    if (lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error(error);
  }, [error]);
}
