'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';

const SEARCH_DEBOUNCE_MS = 350;

type OwnersSearchProps = {
  initialQuery: string;
};

export default function OwnersSearch({ initialQuery }: OwnersSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentQuery = searchParams.get('q')?.trim() ?? '';
      const nextQuery = value.trim();

      if (nextQuery === currentQuery) {
        return;
      }

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      if (nextQuery.length > 0) {
        nextSearchParams.set('q', nextQuery);
      } else {
        nextSearchParams.delete('q');
      }

      const nextQueryString = nextSearchParams.toString();
      router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, {
        scroll: false,
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [value, pathname, router, searchParams]);

  return (
    <div className="relative md:w-80">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Пошук за прізвищем, ім'ям, телефоном або квартирою"
        className="w-full pl-9"
        aria-label="Пошук співвласника"
      />
    </div>
  );
}
