import type { SVGProps } from 'react';

type SignatureIconProps = SVGProps<SVGSVGElement>;

export default function SignatureIcon({ className, ...props }: SignatureIconProps) {
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
        d="M3 16c1.2 0 2.2-1 3.4-2.2l3.1-3.1a2.2 2.2 0 0 1 3.1 3.1l-1.8 1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 19h6.5c1.3 0 2.1-.4 3-1.3l2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16.2 7.8 2 2" strokeLinecap="round" />
    </svg>
  );
}
