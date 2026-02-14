'use client';

import type { ComponentProps, MouseEvent } from 'react';
import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';

type ConfirmSubmitButtonProps = ComponentProps<typeof Button> & {
  confirmTitle?: string;
  confirmMessage: string;
  confirmConfirmLabel?: string;
  confirmCancelLabel?: string;
  pendingLabel?: string;
};

export function ConfirmSubmitButton({
  confirmTitle = 'Підтвердіть видалення',
  confirmMessage,
  confirmConfirmLabel,
  confirmCancelLabel,
  pendingLabel = 'Обробка...',
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [isOpen, setIsOpen] = useState(false);
  const submitterRef = useRef<HTMLButtonElement>(null);
  const isDisabled = Boolean(props.disabled) || pending;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || isDisabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleConfirm = () => {
    const submitter = submitterRef.current;
    setIsOpen(false);
    if (!submitter) {
      return;
    }

    submitter.form?.requestSubmit(submitter);
  };

  return (
    <>
      <Button
        {...props}
        ref={submitterRef}
        onClick={handleClick}
        disabled={isDisabled}
        aria-busy={pending}
      >
        {pending ? pendingLabel : props.children}
      </Button>
      <ConfirmModal
        open={isOpen}
        title={confirmTitle}
        description={confirmMessage}
        confirmLabel={confirmConfirmLabel}
        cancelLabel={confirmCancelLabel}
        confirmDisabled={pending}
        cancelDisabled={pending}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </>
  );
}
