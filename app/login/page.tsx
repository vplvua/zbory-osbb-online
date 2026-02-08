import { redirect } from 'next/navigation';
import AppHeader from '@/components/app-header';
import LoginForm from '@/app/login/login-form';
import { getSessionPayload } from '@/lib/auth/session-token';

export default async function LoginPage() {
  const session = await getSessionPayload();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen flex-col">
      <AppHeader title="МОЄ ОСББ" containerClassName="max-w-md" />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-md px-6 py-8">
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
