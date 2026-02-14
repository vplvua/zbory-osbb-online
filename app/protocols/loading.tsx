import AppHeader from '@/components/app-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { InlineSpinner, Skeleton } from '@/components/ui/skeleton';

export default function ProtocolsLoading() {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader title="Протоколи" containerClassName="max-w-5xl" />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <InlineSpinner label="Завантажуємо протоколи..." />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-48" />
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-64 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
