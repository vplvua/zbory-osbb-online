import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SheetStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { createSheetAction } from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/actions';
import SheetCreateForm from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/_components/sheet-create-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  DRAFT: 'bg-surface-muted text-foreground/80',
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
  const signedSheetsCount = sheets.filter((sheet) => sheet.status === SheetStatus.SIGNED).length;

  const defaultSurveyDate = new Date().toISOString().split('T')[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link
            href={`/osbb/${protocol.osbbId}/protocols/${protocol.id}/edit`}
            className="text-brand underline-offset-4 hover:underline"
          >
            ← Назад до протоколу
          </Link>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Співвласники</h1>
            <p className="text-muted-foreground text-sm">{protocol.osbb.name}</p>
          </div>
          <Link
            href={`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners/new`}
            className="bg-brand text-brand-foreground hover:bg-brand-hover inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
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
            <Input name="q" placeholder="Пошук за ПІБ" defaultValue={query} className="md:w-64" />
            <Button type="submit" variant="outline">
              Шукати
            </Button>
          </form>

          {owners.length === 0 ? (
            <p className="text-muted-foreground text-sm">Співвласників ще не додано.</p>
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
                        className="text-brand text-sm underline-offset-4 hover:underline"
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
          {signedSheetsCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm text-emerald-800">
                Підписано листків: <strong>{signedSheetsCount}</strong>
              </p>
              <a
                href={`/api/osbb/${protocol.osbbId}/protocols/${protocol.id}/downloads/signed-zip`}
                className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                Завантажити ZIP підписаних листків
              </a>
            </div>
          ) : null}

          {sheets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Листки для цього протоколу ще не створені.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Співвласник</TableHead>
                  <TableHead>Дата опитування</TableHead>
                  <TableHead>Дедлайн</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Публічне посилання</TableHead>
                  <TableHead>Завантаження</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.map((sheet) => {
                  const displayStatus = getDisplaySheetStatus(sheet.status, sheet.expiresAt);
                  const votePath = `/vote/${sheet.publicToken}`;
                  const downloadBasePath = `/api/sheets/${sheet.id}/downloads`;
                  const hasPdf = Boolean(sheet.pdfFileUrl);
                  const isSigned = sheet.status === SheetStatus.SIGNED;

                  return (
                    <TableRow key={sheet.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{sheet.owner.fullName}</p>
                          <p className="text-muted-foreground text-xs">
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
                          className="text-brand text-sm break-all underline-offset-4 hover:underline"
                        >
                          {votePath}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {hasPdf ? (
                            <a
                              href={`${downloadBasePath}/original`}
                              className="text-brand text-xs underline-offset-4 hover:underline"
                            >
                              Оригінальний PDF
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              PDF ще не створено
                            </span>
                          )}
                          {hasPdf ? (
                            <a
                              href={`${downloadBasePath}/visualization`}
                              className="text-brand text-xs underline-offset-4 hover:underline"
                            >
                              PDF візуалізації
                            </a>
                          ) : null}
                          {isSigned ? (
                            <a
                              href={`${downloadBasePath}/signed`}
                              className="text-brand text-xs underline-offset-4 hover:underline"
                            >
                              Підписаний .p7s
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              .p7s після статусу «Підписано»
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <p className="text-muted-foreground text-xs">
            PDF листка генерується автоматично після подання голосу співвласником.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
