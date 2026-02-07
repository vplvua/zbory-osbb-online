import * as React from 'react';

import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
};

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand text-brand-foreground hover:bg-brand-hover',
  default: 'bg-brand text-brand-foreground hover:bg-brand-hover',
  secondary: 'border border-border bg-surface text-foreground hover:bg-surface-muted',
  outline: 'border border-border bg-background text-foreground hover:bg-surface-muted',
  ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { Button };
