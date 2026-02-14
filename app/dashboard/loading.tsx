import AppHeader from '@/components/app-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { InlineSpinner, Skeleton } from '@/components/ui/skeleton';

function DashboardCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-44" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-44" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title="Завантаження..."
        containerClassName="max-w-5xl"
        actionNode={<Skeleton className="h-10 w-40" />}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
          <InlineSpinner label="Оновлюємо зведення ОСББ..." />

          <section className="grid gap-4 md:grid-cols-2">
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
          </section>

          <section className="mt-auto">
            <div className="border-border bg-surface rounded-xl border p-5">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="mt-3 h-4 w-72 max-w-full" />
              <Skeleton className="mt-4 h-10 w-52" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
