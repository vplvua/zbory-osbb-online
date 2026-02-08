import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import ProtocolForm from '@/app/osbb/[osbbId]/protocols/_components/protocol-form';
import ProtocolCreateSaveButton from '@/app/osbb/[osbbId]/protocols/new/_components/protocol-create-save-button';
import { createProtocolAction } from '@/app/osbb/[osbbId]/protocols/actions';
import AppHeader from '@/components/app-header';

const PROTOCOL_CREATE_FORM_ID = 'protocol-create-form';

type ProtocolNewPageProps = {
  params: Promise<{ osbbId: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function ProtocolNewPage({ params, searchParams }: ProtocolNewPageProps) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const { osbbId } = await params;
  const osbb = await prisma.oSBB.findFirst({
    where: { id: osbbId, userId: session.sub, isDeleted: false },
  });

  if (!osbb) {
    redirect('/dashboard');
  }

  const from = (await searchParams)?.from;
  const isFromDashboard = from === 'dashboard';
  const backLink = isFromDashboard
    ? { href: '/dashboard', label: '← Назад на головну' }
    : { href: `/osbb/${osbb.id}/protocols`, label: '← Назад до протоколів' };

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title={osbb.shortName}
        containerClassName="max-w-3xl"
        actionNode={<ProtocolCreateSaveButton formId={PROTOCOL_CREATE_FORM_ID} />}
        backLink={backLink}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
          <ProtocolForm
            action={createProtocolAction}
            submitLabel="Створити"
            formId={PROTOCOL_CREATE_FORM_ID}
            showSubmitButton={false}
            title="Новий протокол"
            defaultValues={{ osbbId: osbb.id, type: 'GENERAL' }}
          />
        </div>
      </main>
    </div>
  );
}
