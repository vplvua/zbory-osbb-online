import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SheetStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import {
  attachOwnerToProtocolAction,
  createSheetAction,
  retrySheetPdfAction,
  deleteSheetAction,
} from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/actions';
import OwnerAttachForm from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/_components/owner-attach-form';
import SheetCreateForm from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/_components/sheet-create-form';
import SheetRetryForm from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/_components/sheet-retry-form';
import SheetDeleteForm from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/_components/sheet-delete-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatOwnerShortName } from '@/lib/owner/name';
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
    redirect('/dashboard');
  }

  const protocolOwners = await prisma.protocolOwner.findMany({
    where: {
      protocolId: protocol.id,
      owner: {
        osbbId: protocol.osbbId,
        ...(query
          ? {
              OR: [
                {
                  lastName: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  firstName: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  middleName: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
    },
    include: {
      owner: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const owners = protocolOwners.map((protocolOwner) => protocolOwner.owner);

  const availableOwners = await prisma.owner.findMany({
    where: {
      osbbId: protocol.osbbId,
      protocolOwners: {
        none: {
          protocolId: protocol.id,
        },
      },
    },
    select: {
      id: true,
      lastName: true,
      firstName: true,
      middleName: true,
      apartmentNumber: true,
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' },
      { middleName: 'asc' },
      { apartmentNumber: 'asc' },
    ],
  });

  const sheets = await prisma.sheet.findMany({
    where: { protocolId: protocol.id },
    include: {
      owner: {
        select: {
          id: true,
          lastName: true,
          firstName: true,
          middleName: true,
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
            <h1 className="text-2xl font-semibold">Співвласники протоколу</h1>
            <p className="text-muted-foreground text-sm">{protocol.osbb.name}</p>
          </div>
          <Link
            href={`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners/new`}
            className="bg-brand text-brand-foreground hover:bg-brand-hover inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
          >
            Створити нового співвласника
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список співвласників</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-border space-y-2 rounded-md border p-4">
            <h3 className="font-medium">Додати співвласника до протоколу</h3>
            {availableOwners.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Усі співвласники цього ОСББ вже додані до протоколу.
              </p>
            ) : (
              <OwnerAttachForm
                action={attachOwnerToProtocolAction}
                protocolId={protocol.id}
                owners={availableOwners.map((owner) => ({
                  id: owner.id,
                  shortName: formatOwnerShortName(owner),
                  apartmentNumber: owner.apartmentNumber,
                }))}
              />
            )}
          </div>

          <form className="flex flex-wrap items-center gap-3" method="get">
            <Input
              name="q"
              placeholder="Пошук за прізвищем або ім'ям"
              defaultValue={query}
              className="md:w-64"
            />
            <Button type="submit" variant="outline">
              Шукати
            </Button>
          </form>

          {owners.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              До цього протоколу ще не додано співвласників.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Прізвище та ініціали</TableHead>
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
                    <TableCell className="font-medium">{formatOwnerShortName(owner)}</TableCell>
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
                  <TableHead className="text-right">Видалити</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.map((sheet) => {
                  const displayStatus = getDisplaySheetStatus(sheet.status, sheet.expiresAt);
                  const votePath = `/vote/${sheet.publicToken}`;
                  const downloadBasePath = `/api/sheets/${sheet.id}/downloads`;
                  const hasPdf = Boolean(sheet.pdfFileUrl);
                  const isSigned = sheet.status === SheetStatus.SIGNED;
                  const canRetryPdf =
                    !sheet.pdfUploadPending &&
                    (sheet.errorPending || (sheet.status !== SheetStatus.DRAFT && !hasPdf));
                  const canDeleteSheet =
                    (sheet.status === SheetStatus.DRAFT || sheet.status === SheetStatus.EXPIRED) &&
                    sheet.ownerSignedAt === null &&
                    sheet.organizerSignedAt === null;

                  return (
                    <TableRow key={sheet.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{formatOwnerShortName(sheet.owner)}</p>
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
                          {sheet.pdfUploadPending ? (
                            <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-800">
                              PDF формується
                            </span>
                          ) : null}
                          {sheet.errorPending ? (
                            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                              Помилка підготовки PDF
                            </span>
                          ) : null}

                          {hasPdf ? (
                            <a
                              href={`${downloadBasePath}/original`}
                              className="text-brand text-xs underline-offset-4 hover:underline"
                            >
                              Оригінальний PDF
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              PDF ще недоступний
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
                          {canRetryPdf ? (
                            <SheetRetryForm action={retrySheetPdfAction} sheetId={sheet.id} />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        {canDeleteSheet ? (
                          <SheetDeleteForm action={deleteSheetAction} sheetId={sheet.id} />
                        ) : (
                          <span className="text-muted-foreground text-xs">Недоступно</span>
                        )}
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
