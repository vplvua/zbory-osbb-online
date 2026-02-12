'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

type SheetPublicLinkActionsProps = {
  votePath: string;
};

function OpenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3Zm-9 2h6v2H7v10h10v-4h2v6H5V5Z"
      />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M16 1H4C2.896 1 2 1.896 2 3v12h2V3h12V1Zm3 4H8C6.896 5 6 5.896 6 7v14c0 1.104.896 2 2 2h11c1.104 0 2-.896 2-2V7c0-1.104-.896-2-2-2Zm0 16H8V7h11v14Z"
      />
    </svg>
  );
}

export default function SheetPublicLinkActions({ votePath }: SheetPublicLinkActionsProps) {
  async function handleCopy() {
    const fullUrl = `${window.location.origin}${votePath}`;
    if (!navigator.clipboard) {
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return;
    }

    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      await navigator.clipboard.writeText(votePath);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={votePath} className="inline-flex" title="Перейти за посиланням">
        <Button
          type="button"
          variant="outline"
          className="border-brand/40 bg-brand/5 text-brand hover:bg-brand/10 h-8 px-3 text-xs"
        >
          <OpenIcon className="h-4 w-4 shrink-0" />
          <span>Перейти</span>
        </Button>
      </Link>
      <Button
        type="button"
        variant="outline"
        className="border-brand/40 bg-brand/5 text-brand hover:bg-brand/10 h-8 px-3 text-xs"
        onClick={handleCopy}
        title="Скопіювати посилання"
      >
        <CopyIcon className="h-4 w-4 shrink-0" />
        <span>Копіювати</span>
      </Button>
    </div>
  );
}
