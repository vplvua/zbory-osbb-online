'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const UA_COUNTRY_CODE = '+380';
const LOCAL_PHONE_DIGITS = 9;

function UkraineFlagIcon() {
  return (
    <svg viewBox="0 0 3 2" aria-hidden className="h-[14px] w-[21px] overflow-hidden rounded-[2px]">
      <rect width="3" height="1" fill="#0057B7" />
      <rect y="1" width="3" height="1" fill="#FFD700" />
    </svg>
  );
}

function extractLocalDigits(value: string): string {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('380')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('0') && digits.length === 10) {
    digits = digits.slice(1);
  }

  return digits.slice(0, LOCAL_PHONE_DIGITS);
}

function formatLocalDigits(localDigits: string): string {
  const part1 = localDigits.slice(0, 2);
  const part2 = localDigits.slice(2, 5);
  const part3 = localDigits.slice(5, 7);
  const part4 = localDigits.slice(7, 9);

  return [part1, part2, part3, part4].filter(Boolean).join('-');
}

function toFullPhone(localDigits: string): string {
  if (!localDigits) {
    return '';
  }

  return `${UA_COUNTRY_CODE}${localDigits}`;
}

type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  | 'type'
  | 'inputMode'
  | 'pattern'
  | 'maxLength'
  | 'placeholder'
  | 'value'
  | 'defaultValue'
  | 'onChange'
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (fullPhone: string) => void;
};

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    { className, value, defaultValue, name, id, required, disabled, onValueChange, ...props },
    ref,
  ) => {
    const isControlled = value !== undefined;
    const [internalDigits, setInternalDigits] = React.useState(() =>
      extractLocalDigits(defaultValue ?? ''),
    );

    const localDigits = isControlled ? extractLocalDigits(value ?? '') : internalDigits;
    const formattedValue = formatLocalDigits(localDigits);
    const fullPhone = toFullPhone(localDigits);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextDigits = extractLocalDigits(event.target.value);
      if (!isControlled) {
        setInternalDigits(nextDigits);
      }

      onValueChange?.(toFullPhone(nextDigits));
    };

    return (
      <>
        {name ? <input type="hidden" name={name} value={fullPhone} /> : null}
        <div
          className={cn(
            'border-border bg-surface text-foreground focus-within:ring-ring focus-within:ring-offset-background flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm shadow-sm focus-within:ring-2 focus-within:ring-offset-2',
            disabled ? 'cursor-not-allowed opacity-50' : '',
            className,
          )}
        >
          <span className="mr-2 inline-flex">
            <UkraineFlagIcon />
          </span>
          <span className="text-foreground text-sm font-medium">{UA_COUNTRY_CODE}</span>
          <span className="bg-border mx-2 h-4 w-px" aria-hidden />
          <input
            {...props}
            ref={ref}
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            pattern="[0-9]{2}-[0-9]{3}-[0-9]{2}-[0-9]{2}"
            maxLength={12}
            placeholder="XX-XXX-XX-XX"
            value={formattedValue}
            onChange={handleChange}
            required={required}
            disabled={disabled}
            className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none disabled:cursor-not-allowed"
          />
        </div>
      </>
    );
  },
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
