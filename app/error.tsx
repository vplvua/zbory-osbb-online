'use client';

import { useEffect } from 'react';

type AppError = Error & {
  digest?: string;
};

function isDatabaseUnavailableError(error: AppError): boolean {
  const message = `${error.message} ${error.digest ?? ''}`.toLowerCase();

  return (
    message.includes("can't reach database server") ||
    message.includes('prismaclientinitializationerror') ||
    message.includes('p1001') ||
    message.includes('localhost:5432')
  );
}

export default function RootError({ error, reset }: { error: AppError; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleRetry = () => {
    reset();
    window.location.reload();
  };

  const dbUnavailable = isDatabaseUnavailableError(error);

  if (dbUnavailable) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold">База даних недоступна</h1>
        <p className="text-foreground/80 text-sm">
          Додаток не може підʼєднатися до PostgreSQL за адресою `localhost:5432`.
        </p>
        <div className="border-border bg-surface rounded-md border p-4 text-sm">
          <p className="font-medium">Що зробити:</p>
          <p className="text-foreground/80 mt-2">1. Запустіть БД: `docker compose up -d`</p>
          <p className="text-foreground/80">2. Перевірте статус: `docker compose ps`</p>
          <p className="text-foreground/80">3. Після запуску натисніть кнопку нижче.</p>
        </div>
        <div>
          <button
            type="button"
            onClick={handleRetry}
            className="bg-brand text-brand-foreground hover:bg-brand-hover inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium"
          >
            Спробувати знову
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold">Сталася помилка</h1>
      <p className="text-foreground/80 text-sm">
        Не вдалося відобразити сторінку. Спробуйте оновити сторінку або повторити дію.
      </p>
      <div>
        <button
          type="button"
          onClick={handleRetry}
          className="bg-brand text-brand-foreground hover:bg-brand-hover inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium"
        >
          Спробувати знову
        </button>
      </div>
    </main>
  );
}
