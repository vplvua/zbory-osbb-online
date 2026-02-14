import { InlineSpinner, Skeleton } from '@/components/ui/skeleton';

export default function OsbbLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-12">
      <section className="border-border bg-surface w-full max-w-md rounded-xl border p-6">
        <InlineSpinner label="Переходимо до потрібного розділу..." />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-4 w-44 max-w-full" />
        </div>
      </section>
    </main>
  );
}
