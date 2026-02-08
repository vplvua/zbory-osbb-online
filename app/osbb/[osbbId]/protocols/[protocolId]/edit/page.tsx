import Link from 'next/link';
import { redirect } from 'next/navigation';
import ProtocolEditForm from '@/app/osbb/[osbbId]/protocols/[protocolId]/edit/_components/protocol-edit-form';
import ProtocolEditSaveButton from '@/app/osbb/[osbbId]/protocols/[protocolId]/edit/_components/protocol-edit-save-button';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { deleteProtocolAction, updateProtocolAction } from '@/app/osbb/[osbbId]/protocols/actions';
import DeleteProtocolForm from '@/app/osbb/[osbbId]/protocols/_components/protocol-delete-form';
import AppHeader from '@/components/app-header';

const PROTOCOL_EDIT_FORM_ID = 'protocol-edit-form';

export default async function ProtocolEditPage({
  params,
}: {
  params: Promise<{ osbbId: string; protocolId: string }>;
}) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const { osbbId, protocolId } = await params;
  const protocol = await prisma.protocol.findFirst({
    where: {
      id: protocolId,
      osbb: { id: osbbId, userId: session.sub, isDeleted: false },
    },
    include: {
      questions: { orderBy: { orderNumber: 'asc' } },
      osbb: true,
    },
  });

  if (!protocol) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title={protocol.osbb.shortName}
        containerClassName="max-w-4xl"
        actionNode={<ProtocolEditSaveButton formId={PROTOCOL_EDIT_FORM_ID} />}
        backLink={{ href: `/osbb/${protocol.osbbId}/protocols`, label: '← Назад до протоколів' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
          <ProtocolEditForm
            formId={PROTOCOL_EDIT_FORM_ID}
            action={updateProtocolAction}
            defaultValues={{
              protocolId: protocol.id,
              number: protocol.number,
              date: protocol.date.toISOString().split('T')[0],
              type: protocol.type,
              questions: protocol.questions.map((question) => ({
                id: question.id,
                text: question.text,
                proposal: question.proposal,
                requiresTwoThirds: question.requiresTwoThirds,
              })),
            }}
          />

          <section className="border-border rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Співвласники</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Оберіть співвласників з реєстру ОСББ або створіть нового, після чого сформуйте листки.
            </p>
            <div className="mt-4">
              <Link
                href={`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners`}
                className="bg-brand text-brand-foreground hover:bg-brand-hover inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
              >
                Перейти до співвласників
              </Link>
            </div>
          </section>

          <section className="border-border rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Видалення протоколу</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Протокол буде видалено без можливості відновлення.
            </p>
            <div className="mt-4">
              <DeleteProtocolForm protocolId={protocol.id} action={deleteProtocolAction} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
