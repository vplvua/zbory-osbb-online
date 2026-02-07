import * as React from 'react';

import { cn } from '@/lib/utils';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

type CardPartProps = React.HTMLAttributes<HTMLDivElement>;

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('border-border bg-surface rounded-xl border shadow-sm', className)}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, CardPartProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('border-border border-b p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardContent = React.forwardRef<HTMLDivElement, CardPartProps>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-6', className)} {...props} />,
);
CardContent.displayName = 'CardContent';

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export { Card, CardContent, CardHeader, CardTitle };
