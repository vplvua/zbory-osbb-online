import { redirect } from 'next/navigation';
import AppHeader from '@/components/app-header';
import { getSessionPayload } from '@/lib/auth/session-token';
import { logoutAction } from '@/app/dashboard/settings/actions';
import SettingsForm from '@/app/dashboard/settings/settings-form';

export default async function SettingsPage() {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title="Налаштування"
        containerClassName="max-w-3xl"
        actionButton={{ label: 'Вийти', variant: 'outline', formAction: logoutAction }}
        backLink={{ href: '/dashboard', label: '← Повернутись на головну' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
          <SettingsForm phone={session.phone} />
        </div>
      </main>
    </div>
  );
}
