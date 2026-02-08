import { redirect } from 'next/navigation';
import AppHeader from '@/components/app-header';
import OsbbCreateSaveButton from '@/app/osbb/new/_components/osbb-create-save-button';
import { getSessionPayload } from '@/lib/auth/session-token';
import OsbbForm from '@/app/osbb/_components/osbb-form';
import { createOsbbAction } from '@/app/osbb/actions';

export default async function OsbbNewPage() {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title="Нове ОСББ"
        containerClassName="max-w-3xl"
        actionNode={<OsbbCreateSaveButton formId="osbb-create-form" />}
        backLink={{ href: '/dashboard', label: '← Назад на головну' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
          <p className="text-muted-foreground text-sm">Усі поля обов&apos;язкові.</p>
          <OsbbForm
            action={createOsbbAction}
            formId="osbb-create-form"
            showSubmitButton={false}
            submitLabel="Зберегти"
          />
        </div>
      </main>
    </div>
  );
}
