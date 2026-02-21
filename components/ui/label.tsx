import * as React from 'react';

import { cn } from '@/lib/utils';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required = false, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-foreground text-sm font-medium', className)}
      data-required={required ? 'true' : undefined}
      data-required-manual={required ? 'true' : undefined}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

export { Label };
