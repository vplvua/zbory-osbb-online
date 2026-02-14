import * as React from 'react';
import { cn } from '@/lib/utils';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('bg-surface-muted animate-pulse rounded-md', className)}
    {...props}
  />
));
Skeleton.displayName = 'Skeleton';

function InlineSpinner({ label = 'Завантаження...' }: { label?: string }) {
  return (
    <div className="text-muted-foreground inline-flex items-center gap-2 text-sm">
      <span
        className="border-border border-brand h-4 w-4 animate-spin rounded-full border-2 border-r-transparent"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}

export { InlineSpinner, Skeleton };
