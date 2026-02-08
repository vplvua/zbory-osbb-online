import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { SVGProps } from 'react';
import { SheetStatus } from '@prisma/client';
import { deleteProtocolAction } from '@/app/osbb/[osbbId]/protocols/actions';
import DeleteProtocolForm from '@/app/osbb/[osbbId]/protocols/_components/protocol-delete-form';
import AppHeader from '@/components/app-header';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DATE_FORMATTER = new Intl.DateTimeFormat('uk-UA');

function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function getProtocolTypeLabel(type: 'GENERAL' | 'ESTABLISHMENT') {
  return type === 'GENERAL' ? 'Загальні' : 'Установчі';
}

export default async function ProtocolsPage({ params }: { params: Promise<{ osbbId: string }> }) {
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

  const protocols = await prisma.protocol.findMany({
    where: { osbbId: osbb.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true, sheets: true } },
      sheets: {
        where: { status: SheetStatus.SIGNED },
        select: { id: true },
      },
    },
  });

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title={osbb.shortName}
        containerClassName="max-w-5xl"
        backLink={{ href: '/dashboard', label: '← Назад на головну' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">Протоколи</h1>
            <Link href={`/osbb/${osbb.id}/protocols/new?from=protocols`}>
              <Button type="button">
                <AddIcon className="h-4 w-4" />
                Додати протокол
              </Button>
            </Link>
          </div>

          {protocols.length === 0 ? (
            <p className="text-muted-foreground text-sm">Протоколи ще не створено.</p>
          ) : (
            <div className="space-y-4">
              {protocols.map((protocol) => (
                <Card key={protocol.id}>
                  <CardHeader className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="text-base sm:text-lg">
                        №{protocol.number} від {DATE_FORMATTER.format(protocol.date)}
                      </CardTitle>
                      <span className="border-border bg-surface-muted text-foreground/80 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">
                        {getProtocolTypeLabel(protocol.type)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p className="text-muted-foreground">
                        Питань на розгляд:{' '}
                        <span className="text-foreground font-medium">
                          {protocol._count.questions}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Листків опитування:{' '}
                        <span className="text-foreground font-medium">
                          {protocol._count.sheets}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Підписаних листків:{' '}
                        <span className="text-foreground font-medium">
                          {protocol.sheets.length}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/osbb/${osbb.id}/protocols/${protocol.id}/edit`}>
                        <Button type="button" variant="outline">
                          <EditIcon className="h-4 w-4" />
                          Редагувати
                        </Button>
                      </Link>
                      <DeleteProtocolForm
                        protocolId={protocol.id}
                        action={deleteProtocolAction}
                        className="space-y-2"
                        buttonVariant="outline"
                        buttonContent="Видалити"
                        showTrashIcon
                        hasSheets={protocol._count.sheets > 0}
                        hasSignedSheets={protocol.sheets.length > 0}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
