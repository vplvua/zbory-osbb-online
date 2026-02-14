'use client';

import type { ReactNode, SVGProps } from 'react';
import { cn } from '@/lib/utils';

type ErrorAlertProps = {
  children: ReactNode;
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  size?: 'default' | 'compact';
};

function AlertTriangleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 9v6" />
      <path d="M12 18h.01" />
    </svg>
  );
}

export function ErrorAlert({
  children,
  className,
  textClassName,
  iconClassName,
  size = 'default',
}: ErrorAlertProps) {
  const isCompact = size === 'compact';

  return (
    <section
      className={cn(
        'flex items-start border border-amber-300 bg-amber-50 text-amber-900',
        isCompact ? 'gap-2 rounded-md p-3' : 'gap-3 rounded-lg p-4',
        className,
      )}
    >
      <AlertTriangleIcon
        className={cn(
          isCompact ? 'mt-0.5 h-4 w-4 shrink-0' : 'mt-0.5 h-5 w-5 shrink-0',
          iconClassName,
        )}
      />
      <p className={cn(isCompact ? 'text-xs font-medium' : 'text-sm font-medium', textClassName)}>
        {children}
      </p>
    </section>
  );
}
