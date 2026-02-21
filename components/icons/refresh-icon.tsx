import type { SVGProps } from 'react';

type RefreshIconProps = SVGProps<SVGSVGElement>;

export default function RefreshIcon({ className, ...props }: RefreshIconProps) {
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
      <path
        d="M3 11a9 9 0 0 1 15.3-6.3L21 7m0-4v4h-4M21 13a9 9 0 0 1-15.3 6.3L3 17m0 4v-4h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
