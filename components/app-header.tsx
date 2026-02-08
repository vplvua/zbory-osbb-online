import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HeaderActionButton = {
  label: string;
  variant?: 'primary' | 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  href?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
};

type HeaderBackLink = {
  href: string;
  label: string;
};

type AppHeaderProps = {
  title: string;
  actionButton?: HeaderActionButton;
  actionNode?: ReactNode;
  backLink?: HeaderBackLink;
  containerClassName?: string;
};

function HeaderAction({ actionButton }: { actionButton: HeaderActionButton }) {
  if (actionButton.href) {
    return (
      <Link href={actionButton.href}>
        <Button type="button" variant={actionButton.variant ?? 'outline'}>
          {actionButton.label}
        </Button>
      </Link>
    );
  }

  if (actionButton.formAction) {
    return (
      <form action={actionButton.formAction}>
        <Button type="submit" variant={actionButton.variant ?? 'outline'}>
          {actionButton.label}
        </Button>
      </form>
    );
  }

  return (
    <Button type="button" variant={actionButton.variant ?? 'outline'}>
      {actionButton.label}
    </Button>
  );
}

export default function AppHeader({
  title,
  actionButton,
  actionNode,
  backLink,
  containerClassName,
}: AppHeaderProps) {
  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky top-0 z-40 border-b backdrop-blur">
      <div className={cn('mx-auto w-full px-6 py-4', containerClassName)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/moeosbb.svg" alt="Логотип МОЄ ОСББ" width={40} height={40} priority />
            <p className="text-xl font-semibold">{title}</p>
          </div>
          {actionNode ?? (actionButton ? <HeaderAction actionButton={actionButton} /> : null)}
        </div>

        {backLink ? (
          <div className="mt-3">
            <Link
              href={backLink.href}
              className="text-brand text-sm underline-offset-4 hover:underline"
            >
              {backLink.label}
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
