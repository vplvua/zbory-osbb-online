import type { SVGProps } from 'react';

type AddIconProps = SVGProps<SVGSVGElement>;

export default function AddIcon({ className, ...props }: AddIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      className={className}
      {...props}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
