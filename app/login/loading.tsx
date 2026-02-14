import AppHeader from '@/components/app-header';
import { InlineSpinner, Skeleton } from '@/components/ui/skeleton';

export default function LoginLoading() {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader title="МОЄ ОСББ" containerClassName="max-w-md" />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-6 py-8">
          <InlineSpinner label="Завантажуємо форму входу..." />

          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full" />
          </div>

          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    </div>
  );
}
