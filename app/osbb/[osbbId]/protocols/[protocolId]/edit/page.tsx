import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SheetStatus } from '@prisma/client';
import type { SVGProps } from 'react';
import ProtocolEditForm from '@/app/osbb/[osbbId]/protocols/[protocolId]/edit/_components/protocol-edit-form';
import ProtocolEditSaveButton from '@/app/osbb/[osbbId]/protocols/[protocolId]/edit/_components/protocol-edit-save-button';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { deleteProtocolAction, updateProtocolAction } from '@/app/osbb/[osbbId]/protocols/actions';
import DeleteProtocolForm from '@/app/osbb/[osbbId]/protocols/_components/protocol-delete-form';
import AppHeader from '@/components/app-header';
import { Button } from '@/components/ui/button';

const PROTOCOL_EDIT_FORM_ID = 'protocol-edit-form';

function SheetsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

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

  const [createdSheetsCount, signedSheetsCount, sheetsWithSignaturesCount] = await Promise.all([
    prisma.sheet.count({
      where: {
        protocolId: protocol.id,
      },
    }),
    prisma.sheet.count({
      where: {
        protocolId: protocol.id,
        status: SheetStatus.SIGNED,
      },
    }),
    prisma.sheet.count({
      where: {
        protocolId: protocol.id,
        OR: [
          { status: SheetStatus.SIGNED },
          { ownerSignedAt: { not: null } },
          { organizerSignedAt: { not: null } },
        ],
      },
    }),
  ]);

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
            <h2 className="text-lg font-semibold">Листки опитування</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Створено: <span className="text-foreground font-medium">{createdSheetsCount}</span>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Підписано: <span className="text-foreground font-medium">{signedSheetsCount}</span>
            </p>
            <div className="mt-4">
              <Link
                href={`/sheets?protocolId=${encodeURIComponent(protocol.id)}&from=protocol-edit&fromProtocolId=${encodeURIComponent(protocol.id)}`}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                >
                  <SheetsIcon className="h-4 w-4" />
                  Перейти до листків опитування
                </Button>
              </Link>
            </div>
          </section>

          <section className="border-border rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Видалення протоколу</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Протокол буде видалено без можливості відновлення.
            </p>
            <div className="mt-4">
              <DeleteProtocolForm
                protocolId={protocol.id}
                action={deleteProtocolAction}
                hasSheets={createdSheetsCount > 0}
                hasSignedSheets={sheetsWithSignaturesCount > 0}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
