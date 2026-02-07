import { redirect } from 'next/navigation';
import { getSessionPayload } from '@/lib/auth/session-token';
import SettingsForm from '@/app/dashboard/settings/settings-form';

export default async function SettingsPage() {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Налаштування</h1>
        <p className="text-sm text-neutral-600">
          Дані уповноваженої особи для роботи з документами.
        </p>
      </header>

      <SettingsForm />
    </main>
  );
}
