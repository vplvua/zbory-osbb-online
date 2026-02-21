import type { SVGProps } from 'react';

type DownloadIconProps = SVGProps<SVGSVGElement>;

export default function DownloadIcon({ className, ...props }: DownloadIconProps) {
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
      <path d="M12 4v11" strokeLinecap="round" />
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" strokeLinecap="round" />
    </svg>
  );
}
