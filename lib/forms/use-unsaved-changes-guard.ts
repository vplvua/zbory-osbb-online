'use client';

import { useRouter } from 'next/navigation';
import { type RefObject, useEffect, useRef, useState } from 'react';

function serializeForm(form: HTMLFormElement): string {
  return JSON.stringify(
    Array.from(new FormData(form).entries())
      .map(([key, value]) => [key, String(value)] as const)
      .sort((a, b) => a[0].localeCompare(b[0])),
  );
}

function defaultShouldBlockNavigation(destination: URL, current: URL) {
  if (destination.origin !== current.origin) {
    return false;
  }

  return (
    destination.pathname !== current.pathname ||
    destination.search !== current.search ||
    destination.hash !== current.hash
  );
}

type UseUnsavedChangesGuardOptions = {
  formRef: RefObject<HTMLFormElement | null>;
  enabled?: boolean;
  shouldBlockNavigation?: (destination: URL, current: URL) => boolean;
};

type UseUnsavedChangesGuardResult = {
  isLeaveModalOpen: boolean;
  handleConfirmLeave: () => void;
  handleCloseLeaveModal: () => void;
};

export function useUnsavedChangesGuard({
  formRef,
  enabled = true,
  shouldBlockNavigation = defaultShouldBlockNavigation,
}: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardResult {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const initialSnapshotRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);
  const shouldBlockNavigationRef = useRef(shouldBlockNavigation);

  useEffect(() => {
    shouldBlockNavigationRef.current = shouldBlockNavigation;
  }, [shouldBlockNavigation]);

  useEffect(() => {
    const form = formRef.current;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const updateDirtyState = () => {
      const initialSnapshot = initialSnapshotRef.current;
      if (initialSnapshot === null) {
        return;
      }

      setIsDirty(serializeForm(form) !== initialSnapshot);
    };

    initialSnapshotRef.current = serializeForm(form);
    updateDirtyState();

    form.addEventListener('input', updateDirtyState);
    form.addEventListener('change', updateDirtyState);
    form.addEventListener('reset', updateDirtyState);

    const observer = new MutationObserver(updateDirtyState);
    observer.observe(form, { childList: true, subtree: true });

    return () => {
      form.removeEventListener('input', updateDirtyState);
      form.removeEventListener('change', updateDirtyState);
      form.removeEventListener('reset', updateDirtyState);
      observer.disconnect();
    };
  }, [formRef]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== '_self') {
        return;
      }

      if (!isDirtyRef.current) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (!shouldBlockNavigationRef.current(destination, current)) {
        return;
      }

      event.preventDefault();
      setPendingNavigationHref(`${destination.pathname}${destination.search}${destination.hash}`);
      setIsLeaveModalOpen(true);
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [enabled]);

  const handleConfirmLeave = () => {
    const href = pendingNavigationHref ?? '/dashboard';
    setIsLeaveModalOpen(false);
    setPendingNavigationHref(null);
    router.push(href);
  };

  const handleCloseLeaveModal = () => {
    setIsLeaveModalOpen(false);
    setPendingNavigationHref(null);
  };

  return {
    isLeaveModalOpen,
    handleConfirmLeave,
    handleCloseLeaveModal,
  };
}
