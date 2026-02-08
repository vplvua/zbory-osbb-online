import { redirect } from 'next/navigation';
import LoginForm from '@/app/login/login-form';
import { getSessionPayload } from '@/lib/auth/session-token';

export default async function LoginPage() {
  const session = await getSessionPayload();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="login-page mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <LoginForm />
    </main>
  );
}
