'use client';

import type { MouseEvent, ReactNode, SVGProps } from 'react';
import { useActionState, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ErrorAlert } from '@/components/ui/error-alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { ProtocolFormState } from '@/app/osbb/[osbbId]/protocols/actions';

const initialState: ProtocolFormState = {};

type ButtonVariant = 'primary' | 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';

function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

type ProtocolDeleteFormProps = {
  protocolId: string;
  action: (state: ProtocolFormState, formData: FormData) => Promise<ProtocolFormState>;
  className?: string;
  buttonClassName?: string;
  buttonVariant?: ButtonVariant;
  buttonContent?: ReactNode;
  confirmMessage?: string;
  showTrashIcon?: boolean;
  hasSheets?: boolean;
  hasSignedSheets?: boolean;
};

export default function DeleteProtocolForm({
  protocolId,
  action,
  className,
  buttonClassName,
  buttonVariant = 'destructive',
  buttonContent = 'Видалити протокол',
  confirmMessage = 'Ви впевнені, що хочете видалити цей протокол?',
  showTrashIcon = false,
  hasSheets = false,
  hasSignedSheets = false,
}: ProtocolDeleteFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [isOpen, setIsOpen] = useState(false);
  const submitterRef = useRef<HTMLButtonElement>(null);

  const isDeletionBlocked = hasSignedSheets;
  const modalTitle = isDeletionBlocked ? 'Видалення заборонене' : 'Підтвердіть видалення';
  const modalDescription = isDeletionBlocked
    ? 'Протокол містить підписані листки опитування, видалення заборонене.'
    : hasSheets
      ? `${confirmMessage} Листки опитування до цього протоколу будуть видалені.`
      : confirmMessage;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isPending) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (isDeletionBlocked || isPending) {
      setIsOpen(false);
      return;
    }

    const submitter = submitterRef.current;
    setIsOpen(false);
    if (!submitter) {
      return;
    }

    submitter.form?.requestSubmit(submitter);
  };

  return (
    <>
      <form
        action={formAction}
        className={className ?? 'space-y-2'}
        data-submitting={isPending ? 'true' : 'false'}
      >
        <input type="hidden" name="protocolId" value={protocolId} />
        {state.error ? <ErrorAlert>{state.error}</ErrorAlert> : null}
        <Button
          ref={submitterRef}
          type="submit"
          variant={buttonVariant}
          className={buttonClassName}
          onClick={handleButtonClick}
          disabled={isPending}
        >
          {isPending ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : showTrashIcon ? (
            <TrashIcon className="h-4 w-4" />
          ) : null}
          {isPending ? 'Видалення...' : buttonContent}
        </Button>
      </form>
      <ConfirmModal
        open={isOpen}
        title={modalTitle}
        description={modalDescription}
        confirmLabel={isDeletionBlocked ? 'Закрити' : 'Видалити'}
        confirmVariant={isDeletionBlocked ? 'outline' : 'destructive'}
        showCancel={!isDeletionBlocked}
        confirmDisabled={isPending}
        cancelDisabled={isPending}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </>
  );
}
