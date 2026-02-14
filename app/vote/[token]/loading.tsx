import { InlineSpinner, Skeleton } from '@/components/ui/skeleton';

function QuestionSkeleton() {
  return (
    <article className="border-border rounded-md border p-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-5 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
    </article>
  );
}

export default function VoteLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
      <header className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </header>

      <section className="border-border bg-surface space-y-3 rounded-lg border p-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </section>

      <section className="border-border bg-surface space-y-4 rounded-lg border p-4">
        <InlineSpinner label="Завантажуємо листок опитування..." />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </section>

      <section className="border-border bg-surface space-y-3 rounded-lg border p-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-2">
          <QuestionSkeleton />
          <QuestionSkeleton />
          <QuestionSkeleton />
        </div>
      </section>
    </main>
  );
}
