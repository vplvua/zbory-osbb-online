import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SheetStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { createSheetAction } from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/actions';
import SheetCreateForm from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/_components/sheet-create-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const SHEET_STATUS_LABELS: Record<SheetStatus, string> = {
  DRAFT: 'Чернетка',
  PENDING_ORGANIZER: 'Очікує підпису відповідальної особи',
  SIGNED: 'Підписано',
  EXPIRED: 'Термін минув',
};

const SHEET_STATUS_STYLES: Record<SheetStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-700',
  PENDING_ORGANIZER: 'bg-amber-100 text-amber-800',
  SIGNED: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-red-100 text-red-700',
};

const DATE_FORMATTER = new Intl.DateTimeFormat('uk-UA');

function getDisplaySheetStatus(status: SheetStatus, expiresAt: Date): SheetStatus {
  if (status === SheetStatus.DRAFT && expiresAt <= new Date()) {
    return SheetStatus.EXPIRED;
  }

  return status;
}

type OwnersPageProps = {
  params: Promise<{ osbbId: string; protocolId: string }>;
  searchParams?: Promise<{ q?: string }>;
};

export default async function OwnersPage({ params, searchParams }: OwnersPageProps) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const { osbbId, protocolId } = await params;
  const query = (await searchParams)?.q?.trim() ?? '';

  const protocol = await prisma.protocol.findFirst({
    where: {
      id: protocolId,
      osbb: { id: osbbId, userId: session.sub, isDeleted: false },
    },
    include: { osbb: true },
  });

  if (!protocol) {
    redirect('/osbb');
  }

  const owners = await prisma.owner.findMany({
    where: {
      protocolId: protocol.id,
      ...(query
        ? {
            fullName: {
              contains: query,
              mode: 'insensitive',
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  const sheets = await prisma.sheet.findMany({
    where: { protocolId: protocol.id },
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          apartmentNumber: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const defaultSurveyDate = new Date().toISOString().split('T')[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-sm text-neutral-600">
          <Link
            href={`/osbb/${protocol.osbbId}/protocols/${protocol.id}/edit`}
            className="text-blue-600 hover:underline"
          >
            ← Назад до протоколу
          </Link>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Співвласники</h1>
            <p className="text-sm text-neutral-600">{protocol.osbb.name}</p>
          </div>
          <Link
            href={`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners/new`}
            className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Додати співвласника
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список співвласників</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap items-center gap-3" method="get">
            <input
              name="q"
              placeholder="Пошук за ПІБ"
              defaultValue={query}
              className="h-10 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm md:w-64"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium"
            >
              Шукати
            </button>
          </form>

          {owners.length === 0 ? (
            <p className="text-sm text-neutral-600">Співвласників ще не додано.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ПІБ</TableHead>
                  <TableHead>Квартира</TableHead>
                  <TableHead>Площа</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead className="text-right">Редагування</TableHead>
                  <TableHead className="text-right">Новий листок</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell className="font-medium">{owner.fullName}</TableCell>
                    <TableCell>{owner.apartmentNumber}</TableCell>
                    <TableCell>{owner.ownedArea.toString()}</TableCell>
                    <TableCell>{owner.phone ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners/${owner.id}/edit`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Редагувати
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <SheetCreateForm
                        action={createSheetAction}
                        protocolId={protocol.id}
                        ownerId={owner.id}
                        defaultSurveyDate={defaultSurveyDate}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Листки опитування</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sheets.length === 0 ? (
            <p className="text-sm text-neutral-600">Листки для цього протоколу ще не створені.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Співвласник</TableHead>
                  <TableHead>Дата опитування</TableHead>
                  <TableHead>Дедлайн</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Публічне посилання</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.map((sheet) => {
                  const displayStatus = getDisplaySheetStatus(sheet.status, sheet.expiresAt);
                  const votePath = `/vote/${sheet.publicToken}`;

                  return (
                    <TableRow key={sheet.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{sheet.owner.fullName}</p>
                          <p className="text-xs text-neutral-600">
                            кв. {sheet.owner.apartmentNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{DATE_FORMATTER.format(sheet.surveyDate)}</TableCell>
                      <TableCell>{DATE_FORMATTER.format(sheet.expiresAt)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${SHEET_STATUS_STYLES[displayStatus]}`}
                        >
                          {SHEET_STATUS_LABELS[displayStatus]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={votePath}
                          className="text-sm break-all text-blue-600 hover:underline"
                        >
                          {votePath}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <p className="text-xs text-neutral-600">
            PDF для листків буде додано на наступному етапі інтеграції.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
