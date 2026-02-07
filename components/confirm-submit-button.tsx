'use client';

import type { ComponentProps, MouseEvent } from 'react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';

type ConfirmSubmitButtonProps = ComponentProps<typeof Button> & {
  confirmTitle?: string;
  confirmMessage: string;
  confirmConfirmLabel?: string;
  confirmCancelLabel?: string;
};

export function ConfirmSubmitButton({
  confirmTitle = 'Підтвердіть видалення',
  confirmMessage,
  confirmConfirmLabel,
  confirmCancelLabel,
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const submitterRef = useRef<HTMLButtonElement>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || props.disabled) {
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
      <Button {...props} ref={submitterRef} onClick={handleClick} />
      <ConfirmModal
        open={isOpen}
        title={confirmTitle}
        description={confirmMessage}
        confirmLabel={confirmConfirmLabel}
        cancelLabel={confirmCancelLabel}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </>
  );
}
