import AppHeader from '@/components/app-header';
import { InlineSpinner, Skeleton } from '@/components/ui/skeleton';

export default function VerifyLoading() {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title="Підтвердження"
        containerClassName="max-w-md"
        backLink={{ href: '/login', label: '← Змінити номер телефону' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-6 py-8">
          <InlineSpinner label="Перевіряємо дані..." />

          <Skeleton className="h-4 w-36" />

          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>

          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    </div>
  );
}
