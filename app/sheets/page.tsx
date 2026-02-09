import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SheetStatus } from '@prisma/client';
import SheetDeleteForm from '@/app/sheets/_components/sheet-delete-form';
import SheetRetryForm from '@/app/sheets/_components/sheet-retry-form';
import { deleteSheetAction, retrySheetPdfAction } from '@/app/sheets/actions';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSessionPayload } from '@/lib/auth/session-token';
import { prisma } from '@/lib/db/prisma';
import { formatOwnerShortName } from '@/lib/owner/name';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

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

type SheetsPageProps = {
  searchParams?: Promise<{ protocolId?: string; apartment?: string; ownerId?: string }>;
};

export default async function SheetsPage({ searchParams }: SheetsPageProps) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const selectedState = await resolveSelectedOsbb(session.sub);
  if (selectedState.osbbs.length === 0) {
    redirect('/osbb/new');
  }

  const selectedOsbb = selectedState.selectedOsbb;
  if (!selectedOsbb) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const selectedProtocolId = params?.protocolId?.trim() ?? '';
  const apartmentFilter = params?.apartment?.trim() ?? '';
  const selectedOwnerId = params?.ownerId?.trim() ?? '';

  const protocols = await prisma.protocol.findMany({
    where: { osbbId: selectedOsbb.id },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      number: true,
      date: true,
    },
  });

  const protocolFilter = protocols.some((protocol) => protocol.id === selectedProtocolId)
    ? selectedProtocolId
    : '';

  const ownerFilter = selectedOwnerId
    ? await prisma.owner.findFirst({
        where: {
          id: selectedOwnerId,
          osbbId: selectedOsbb.id,
        },
        select: {
          id: true,
          lastName: true,
          firstName: true,
          middleName: true,
          apartmentNumber: true,
        },
      })
    : null;

  const sheets = await prisma.sheet.findMany({
    where: {
      protocol: {
        osbbId: selectedOsbb.id,
      },
      ...(protocolFilter ? { protocolId: protocolFilter } : {}),
      ...(ownerFilter ? { ownerId: ownerFilter.id } : {}),
      ...(apartmentFilter
        ? {
            owner: {
              apartmentNumber: apartmentFilter,
            },
          }
        : {}),
    },
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
      protocol: {
        select: {
          id: true,
          number: true,
          date: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link href="/dashboard" className="text-brand underline-offset-4 hover:underline">
            ← Назад до дашборду
          </Link>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Листки опитування</h1>
            <p className="text-muted-foreground text-sm">{selectedOsbb.name}</p>
          </div>
          <Link href="/sheets/new">
            <Button type="button">
              <AddIcon className="h-4 w-4" />
              Додати листок опитування
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список листків</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            {ownerFilter ? <input type="hidden" name="ownerId" value={ownerFilter.id} /> : null}
            {apartmentFilter ? (
              <input type="hidden" name="apartment" value={apartmentFilter} />
            ) : null}
            <div className="space-y-2">
              <label htmlFor="protocolId" className="text-sm font-medium">
                Фільтр за протоколом
              </label>
              <select
                id="protocolId"
                name="protocolId"
                defaultValue={protocolFilter}
                className="border-border bg-surface text-foreground focus-visible:ring-ring focus-visible:ring-offset-background h-10 min-w-[280px] rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="">Усі протоколи</option>
                {protocols.map((protocol) => (
                  <option key={protocol.id} value={protocol.id}>
                    {protocol.number} ({DATE_FORMATTER.format(protocol.date)})
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline">
              Застосувати
            </Button>
          </form>

          {apartmentFilter ? (
            <div className="border-border bg-surface-muted flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Фільтр за квартирою:</span>
              <span className="font-medium">кв. {apartmentFilter}</span>
              <Link
                href={
                  protocolFilter
                    ? `/sheets?protocolId=${encodeURIComponent(protocolFilter)}${
                        ownerFilter ? `&ownerId=${encodeURIComponent(ownerFilter.id)}` : ''
                      }`
                    : '/sheets'
                }
                className="text-brand underline-offset-4 hover:underline"
              >
                Скинути
              </Link>
            </div>
          ) : null}

          {ownerFilter ? (
            <div className="border-border bg-surface-muted flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Фільтр за співвласником:</span>
              <span className="font-medium">{formatOwnerShortName(ownerFilter)}</span>
              <span className="text-muted-foreground">кв. {ownerFilter.apartmentNumber}</span>
              <Link
                href={
                  protocolFilter
                    ? `/sheets?protocolId=${encodeURIComponent(protocolFilter)}${
                        apartmentFilter ? `&apartment=${encodeURIComponent(apartmentFilter)}` : ''
                      }`
                    : '/sheets'
                }
                className="text-brand underline-offset-4 hover:underline"
              >
                Скинути
              </Link>
            </div>
          ) : null}

          {sheets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {ownerFilter
                ? `Для співвласника ${formatOwnerShortName(ownerFilter)} листків опитування не знайдено.`
                : apartmentFilter
                  ? `Для квартири ${apartmentFilter} листків опитування не знайдено.`
                  : 'Листків опитування ще не створено.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-sm">
                <thead>
                  <tr className="border-border border-b text-left">
                    <th className="px-2 py-2 font-medium">Протокол</th>
                    <th className="px-2 py-2 font-medium">Співвласник</th>
                    <th className="px-2 py-2 font-medium">Дата опитування</th>
                    <th className="px-2 py-2 font-medium">Дедлайн</th>
                    <th className="px-2 py-2 font-medium">Статус</th>
                    <th className="px-2 py-2 font-medium">Публічне посилання</th>
                    <th className="px-2 py-2 font-medium">Завантаження</th>
                    <th className="px-2 py-2 text-right font-medium">Дії</th>
                  </tr>
                </thead>
                <tbody>
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
                      (sheet.status === SheetStatus.DRAFT ||
                        sheet.status === SheetStatus.EXPIRED) &&
                      sheet.ownerSignedAt === null &&
                      sheet.organizerSignedAt === null;

                    return (
                      <tr key={sheet.id} className="border-border border-b align-top">
                        <td className="px-2 py-3">
                          <div>
                            <p className="font-medium">{sheet.protocol.number}</p>
                            <p className="text-muted-foreground text-xs">
                              {DATE_FORMATTER.format(sheet.protocol.date)}
                            </p>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div>
                            <p className="font-medium">{formatOwnerShortName(sheet.owner)}</p>
                            <p className="text-muted-foreground text-xs">
                              кв. {sheet.owner.apartmentNumber}
                            </p>
                          </div>
                        </td>
                        <td className="px-2 py-3">{DATE_FORMATTER.format(sheet.surveyDate)}</td>
                        <td className="px-2 py-3">{DATE_FORMATTER.format(sheet.expiresAt)}</td>
                        <td className="px-2 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${SHEET_STATUS_STYLES[displayStatus]}`}
                          >
                            {SHEET_STATUS_LABELS[displayStatus]}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <Link
                            href={votePath}
                            className="text-brand break-all underline-offset-4 hover:underline"
                          >
                            {votePath}
                          </Link>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col gap-1">
                            {sheet.pdfUploadPending ? (
                              <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-800">
                                PDF формується
                              </span>
                            ) : null}
                            {sheet.errorPending ? (
                              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                                Є помилка PDF
                              </span>
                            ) : null}
                            {hasPdf ? (
                              <>
                                <a
                                  href={`${downloadBasePath}/original`}
                                  className="text-brand text-xs underline-offset-4 hover:underline"
                                >
                                  Оригінал PDF
                                </a>
                                <a
                                  href={`${downloadBasePath}/visualization`}
                                  className="text-brand text-xs underline-offset-4 hover:underline"
                                >
                                  Візуалізація PDF
                                </a>
                              </>
                            ) : (
                              <span className="text-muted-foreground text-xs">PDF недоступний</span>
                            )}
                            {isSigned ? (
                              <a
                                href={`${downloadBasePath}/signed`}
                                className="text-brand text-xs underline-offset-4 hover:underline"
                              >
                                Підписаний .p7s
                              </a>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col items-end gap-2">
                            {canRetryPdf ? (
                              <SheetRetryForm action={retrySheetPdfAction} sheetId={sheet.id} />
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                Повтор PDF недоступний
                              </span>
                            )}

                            {canDeleteSheet ? (
                              <SheetDeleteForm action={deleteSheetAction} sheetId={sheet.id} />
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                Видалення недоступне
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
