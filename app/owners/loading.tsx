import AppHeader from '@/components/app-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { InlineSpinner, Skeleton } from '@/components/ui/skeleton';

function OwnerCardSkeleton() {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-5 w-48 max-w-full sm:h-6" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}

export default function OwnersLoading() {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title="Завантаження..."
        containerClassName="max-w-5xl"
        backLink={{ href: '/dashboard', label: '← Назад на головну' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <InlineSpinner label="Завантажуємо співвласників..." />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-52" />
          </div>

          <Skeleton className="h-10 w-full md:w-80" />

          <div className="space-y-4">
            <OwnerCardSkeleton />
            <OwnerCardSkeleton />
            <OwnerCardSkeleton />
          </div>
        </div>
      </main>
    </div>
  );
}
