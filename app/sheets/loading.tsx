import AppHeader from '@/components/app-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { InlineSpinner, Skeleton } from '@/components/ui/skeleton';

function SheetCardSkeleton() {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-5 w-52 max-w-full sm:h-6" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-44 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-4 sm:p-5 sm:pt-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-8 w-44" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-9 w-44" />
      </CardContent>
    </Card>
  );
}

export default function SheetsLoading() {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title="Завантаження..."
        containerClassName="max-w-5xl"
        backLink={{ href: '/dashboard', label: '← Назад на головну' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <InlineSpinner label="Завантажуємо листки опитування..." />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-56" />
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <Skeleton className="h-10 w-full md:w-80" />
            <Skeleton className="h-10 w-full md:w-72" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-36 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>

          <div className="space-y-4">
            <SheetCardSkeleton />
            <SheetCardSkeleton />
          </div>
        </div>
      </main>
    </div>
  );
}
