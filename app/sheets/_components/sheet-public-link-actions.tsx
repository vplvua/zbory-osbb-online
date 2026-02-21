'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast/client';

type SheetPublicLinkActionsProps = {
  votePath: string;
};

type ShareChannel = 'viber' | 'telegram' | 'whatsapp';

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

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M14 5a3 3 0 1 1 5.292 1.932L9.946 12l9.346 5.068A3 3 0 1 1 18.11 19.1l-9.344-5.067a3 3 0 1 1 0-4.064l9.344-5.067A2.988 2.988 0 0 1 17 5a3 3 0 0 1-3-3Zm0 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      />
    </svg>
  );
}

function ViberIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M6.5 4A3.5 3.5 0 0 0 3 7.5v7A3.5 3.5 0 0 0 6.5 18H8v2.5c0 .4.45.64.78.42L12.5 18h5A3.5 3.5 0 0 0 21 14.5v-7A3.5 3.5 0 0 0 17.5 4h-11ZM9 9.5A1.5 1.5 0 0 1 10.5 8h3A1.5 1.5 0 0 1 15 9.5v.5a1 1 0 0 1-1 1h-.8c-.2 0-.38.12-.46.3-.15.33-.44.64-.76.85a.5.5 0 0 0-.23.4v.9a.6.6 0 0 1-.6.6h-.5a.6.6 0 0 1-.6-.6v-1a2 2 0 0 1 .95-1.7c.1-.06.19-.15.24-.25.09-.18.26-.3.46-.3H13v-.5a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0-.5.5V10a1 1 0 0 1-1 1V9.5Z"
      />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2Zm4.682 6.35-1.82 8.577c-.137.607-.5.758-1.013.472l-2.8-2.064-1.35 1.3c-.149.149-.274.273-.561.273l.2-2.85 5.185-4.685c.225-.2-.05-.312-.35-.112L7.77 13.26l-2.76-.863c-.6-.187-.612-.6.125-.887l10.79-4.16c.5-.187.937.112.756 1Z"
      />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-8.66 15l-1.19 4.35a.5.5 0 0 0 .62.62L7.12 20.8A10 10 0 1 0 12 2Zm0 18a7.95 7.95 0 0 1-4.07-1.12.5.5 0 0 0-.37-.06l-2.39.65.66-2.4a.5.5 0 0 0-.05-.36A8 8 0 1 1 12 20Zm4.23-5.24c-.23-.11-1.37-.68-1.58-.76-.21-.08-.36-.11-.51.12-.15.22-.58.76-.71.92-.13.15-.26.17-.48.06-.23-.12-.95-.35-1.8-1.11-.67-.6-1.12-1.34-1.25-1.56-.13-.23-.01-.35.1-.47.1-.1.23-.26.34-.39.11-.13.15-.22.23-.37.08-.15.04-.28-.02-.39-.06-.11-.51-1.24-.7-1.7-.18-.43-.37-.37-.51-.37h-.44a.84.84 0 0 0-.61.28c-.21.22-.8.78-.8 1.9 0 1.12.82 2.2.93 2.35.11.15 1.58 2.42 3.82 3.39.53.23.95.37 1.27.47.54.17 1.03.15 1.42.09.43-.07 1.37-.56 1.56-1.1.2-.54.2-1 .14-1.1-.06-.11-.21-.17-.44-.28Z"
      />
    </svg>
  );
}

export default function SheetPublicLinkActions({ votePath }: SheetPublicLinkActionsProps) {
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  function resolveVoteUrl() {
    if (/^https?:\/\//i.test(votePath)) {
      return votePath;
    }

    return new URL(votePath, window.location.origin).toString();
  }

  function getShareUrl(channel: ShareChannel, fullUrl: string) {
    const encodedUrl = encodeURIComponent(fullUrl);

    if (channel === 'viber') {
      return `viber://forward?text=${encodedUrl}`;
    }

    if (channel === 'telegram') {
      return `https://t.me/share/url?url=${encodedUrl}`;
    }

    return `https://wa.me/?text=${encodedUrl}`;
  }

  function handleShare(channel: ShareChannel) {
    const fullUrl = resolveVoteUrl();
    const shareUrl = getShareUrl(channel, fullUrl);

    setIsShareMenuOpen(false);
    window.location.href = shareUrl;
  }

  useEffect(() => {
    if (!isShareMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!shareMenuRef.current?.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsShareMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isShareMenuOpen]);

  async function handleCopy() {
    const fullUrl = resolveVoteUrl();

    if (!navigator.clipboard) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = fullUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error('COPY_FAILED');
        }

        toast.success('Посилання скопійовано.');
      } catch {
        toast.error('Не вдалося скопіювати посилання. Спробуйте ще раз.');
      }

      return;
    }

    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Посилання скопійовано.');
    } catch {
      try {
        await navigator.clipboard.writeText(votePath);
        toast.success('Посилання скопійовано.');
      } catch {
        toast.error('Не вдалося скопіювати посилання. Спробуйте ще раз.');
      }
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
      <div ref={shareMenuRef} className="relative inline-flex">
        <Button
          type="button"
          variant="outline"
          className="border-brand/40 bg-brand/5 text-brand hover:bg-brand/10 h-8 px-3 text-xs"
          onClick={() => setIsShareMenuOpen((isOpen) => !isOpen)}
          title="Поділитись посиланням"
          aria-haspopup="menu"
          aria-expanded={isShareMenuOpen}
        >
          <ShareIcon className="h-4 w-4 shrink-0" />
          <span>Поділитись</span>
        </Button>
        {isShareMenuOpen ? (
          <div
            role="menu"
            aria-label="Поділитись посиланням"
            className="border-border bg-background absolute top-full left-0 z-10 mt-1 min-w-44 rounded-md border p-1 shadow-sm"
          >
            <button
              type="button"
              role="menuitem"
              className="focus-visible:ring-ring focus-visible:ring-offset-background hover:bg-brand/15 focus-visible:bg-brand/10 hover:text-brand flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={() => handleShare('viber')}
            >
              <ViberIcon className="h-4 w-4 shrink-0" />
              <span>Viber</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="focus-visible:ring-ring focus-visible:ring-offset-background hover:bg-brand/15 focus-visible:bg-brand/10 hover:text-brand flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={() => handleShare('telegram')}
            >
              <TelegramIcon className="h-4 w-4 shrink-0" />
              <span>Telegram</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="focus-visible:ring-ring focus-visible:ring-offset-background hover:bg-brand/15 focus-visible:bg-brand/10 hover:text-brand flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={() => handleShare('whatsapp')}
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0" />
              <span>WhatsApp</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
