import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionPayload } from '@/lib/auth/session-token';
import OsbbForm from '@/app/osbb/_components/osbb-form';
import { createOsbbAction } from '@/app/osbb/actions';

export default async function OsbbNewPage() {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link href="/osbb" className="text-brand underline-offset-4 hover:underline">
            ← Назад до списку
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Нове ОСББ</h1>
      </div>

      <OsbbForm action={createOsbbAction} submitLabel="Створити" />
    </main>
  );
}
