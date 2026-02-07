import Link from 'next/link';

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold">Дашборд</h1>
      <p className="text-muted-foreground text-sm">
        Тут буде список ОСББ та протоколів. Розділ у розробці.
      </p>
      <Link className="text-brand text-sm underline underline-offset-4" href="/dashboard/settings">
        Перейти до налаштувань
      </Link>
    </main>
  );
}
