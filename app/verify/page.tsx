import { redirect } from 'next/navigation';
import AppHeader from '@/components/app-header';
import VerifyForm from '@/app/verify/verify-form';
import { getSessionPayload } from '@/lib/auth/session-token';

type VerifyPageProps = {
  searchParams?: Promise<{ phone?: string }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const session = await getSessionPayload();
  if (session) {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;
  const initialPhone = resolvedParams?.phone ?? '';

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title="Підтвердження"
        containerClassName="max-w-md"
        backLink={{ href: '/login', label: '← Змінити номер телефону' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-6 py-8">
          <p className="text-muted-foreground text-sm">Введіть код з SMS.</p>
          <VerifyForm initialPhone={initialPhone} />
        </div>
      </main>
    </div>
  );
}
