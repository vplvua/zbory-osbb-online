import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SheetStatus } from '@prisma/client';
import SheetDownloadActions from '@/app/sheets/_components/sheet-download-actions';
import SheetDeleteForm from '@/app/sheets/_components/sheet-delete-form';
import SheetOrganizerSignActions from '@/app/sheets/_components/sheet-organizer-sign-actions';
import SheetPublicLinkActions from '@/app/sheets/_components/sheet-public-link-actions';
import SheetsFilters from '@/app/sheets/_components/sheets-filters';
import SheetRetryForm from '@/app/sheets/_components/sheet-retry-form';
import SheetsSearch from '@/app/sheets/_components/sheets-search';
import {
  deleteSheetAction,
  organizerSignSheetAction,
  refreshSheetSigningStatusAction,
  retrySheetPdfAction,
} from '@/app/sheets/actions';
import AppHeader from '@/components/app-header';
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
const VALID_SHEET_STATUSES = [
  SheetStatus.DRAFT,
  SheetStatus.PENDING_ORGANIZER,
  SheetStatus.SIGNED,
  SheetStatus.EXPIRED,
] as const;

const DATE_FORMATTER = new Intl.DateTimeFormat('uk-UA');

function getDisplaySheetStatus(status: SheetStatus, expiresAt: Date): SheetStatus {
  if (status === SheetStatus.DRAFT && expiresAt <= new Date()) {
    return SheetStatus.EXPIRED;
  }

  return status;
}

type SheetsPageProps = {
  searchParams?: Promise<{
    protocolId?: string;
    apartment?: string;
    ownerId?: string;
    status?: string;
    q?: string;
    from?: string;
    fromOwnerId?: string;
    fromProtocolId?: string;
  }>;
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
  const statusParam = params?.status?.trim() ?? '';
  const statusFilter = VALID_SHEET_STATUSES.includes(statusParam as SheetStatus)
    ? (statusParam as SheetStatus)
    : '';
  const query = params?.q?.trim() ?? '';
  const navigationSourceParam = params?.from?.trim() ?? '';
  const navigationOwnerIdParam = params?.fromOwnerId?.trim() ?? '';
  const navigationProtocolIdParam = params?.fromProtocolId?.trim() ?? '';
  const navigationSource =
    navigationSourceParam === 'owners' ||
    navigationSourceParam === 'owner-edit' ||
    navigationSourceParam === 'protocol-edit'
      ? navigationSourceParam
      : 'dashboard';
  const ownerEditBackOwnerId =
    navigationSource === 'owner-edit' ? navigationOwnerIdParam || selectedOwnerId : '';

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
  const protocolEditBackProtocolId =
    navigationSource === 'protocol-edit'
      ? protocols.some((protocol) => protocol.id === navigationProtocolIdParam)
        ? navigationProtocolIdParam
        : protocolFilter
      : '';

  const owners = await prisma.owner.findMany({
    where: {
      osbbId: selectedOsbb.id,
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' },
      { middleName: 'asc' },
      { apartmentNumber: 'asc' },
    ],
    select: {
      id: true,
      lastName: true,
      firstName: true,
      middleName: true,
      apartmentNumber: true,
    },
  });

  const ownerFilter = selectedOwnerId ? owners.find((owner) => owner.id === selectedOwnerId) : null;

  function buildSheetsHref(filters?: {
    protocolId?: string;
    apartment?: string;
    ownerId?: string;
    status?: string;
    query?: string;
  }) {
    const query = new URLSearchParams();

    if (filters?.protocolId) {
      query.set('protocolId', filters.protocolId);
    }
    if (filters?.apartment) {
      query.set('apartment', filters.apartment);
    }
    if (filters?.ownerId) {
      query.set('ownerId', filters.ownerId);
    }
    if (filters?.status) {
      query.set('status', filters.status);
    }
    if (filters?.query) {
      query.set('q', filters.query);
    }

    if (navigationSource === 'owners') {
      query.set('from', 'owners');
    }
    if (navigationSource === 'owner-edit') {
      query.set('from', 'owner-edit');
      if (ownerEditBackOwnerId) {
        query.set('fromOwnerId', ownerEditBackOwnerId);
      }
    }
    if (navigationSource === 'protocol-edit') {
      query.set('from', 'protocol-edit');
      if (protocolEditBackProtocolId) {
        query.set('fromProtocolId', protocolEditBackProtocolId);
      }
    }

    const queryString = query.toString();
    return queryString ? `/sheets?${queryString}` : '/sheets';
  }

  const backLink =
    navigationSource === 'owners'
      ? { href: '/owners', label: '← Назад до співвласників' }
      : navigationSource === 'owner-edit' && ownerEditBackOwnerId
        ? {
            href: `/owners/${ownerEditBackOwnerId}/edit`,
            label: '← Назад до картки співвласника',
          }
        : navigationSource === 'protocol-edit' && protocolEditBackProtocolId
          ? {
              href: `/osbb/${selectedOsbb.id}/protocols/${protocolEditBackProtocolId}/edit`,
              label: '← Назад до протоколу',
            }
          : { href: '/dashboard', label: '← Назад на головну' };

  const sheetsNewQuery = new URLSearchParams();
  if (navigationSource === 'owners') {
    sheetsNewQuery.set('from', 'owners');
  }
  if (navigationSource === 'owner-edit') {
    sheetsNewQuery.set('from', 'owner-edit');
    if (ownerEditBackOwnerId) {
      sheetsNewQuery.set('fromOwnerId', ownerEditBackOwnerId);
    }
  } else if (navigationSource === 'protocol-edit') {
    sheetsNewQuery.set('from', 'protocol-edit');
    if (protocolEditBackProtocolId) {
      sheetsNewQuery.set('fromProtocolId', protocolEditBackProtocolId);
    }
  } else if (navigationSource !== 'owners') {
    sheetsNewQuery.set('from', 'sheets');
  }

  const sheetsNewHref = sheetsNewQuery.toString()
    ? `/sheets/new?${sheetsNewQuery.toString()}`
    : '/sheets/new';

  const sheets = await prisma.sheet.findMany({
    where: {
      protocol: {
        osbbId: selectedOsbb.id,
      },
      ...(protocolFilter ? { protocolId: protocolFilter } : {}),
      ...(ownerFilter ? { ownerId: ownerFilter.id } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(apartmentFilter || query
        ? {
            owner: {
              ...(apartmentFilter ? { apartmentNumber: apartmentFilter } : {}),
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
                      {
                        apartmentNumber: {
                          contains: query,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  }
                : {}),
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

  const currentSheetsHref = buildSheetsHref({
    protocolId: protocolFilter || undefined,
    apartment: apartmentFilter || undefined,
    ownerId: ownerFilter?.id,
    status: statusFilter || undefined,
    query: query || undefined,
  });
  const protocolOptions = protocols.map((protocol) => ({
    id: protocol.id,
    number: protocol.number,
    dateLabel: DATE_FORMATTER.format(protocol.date),
  }));
  const ownerOptions = owners.map((owner) => ({
    id: owner.id,
    shortName: formatOwnerShortName(owner),
    apartmentNumber: owner.apartmentNumber,
  }));

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title={selectedOsbb.shortName}
        containerClassName="max-w-5xl"
        backLink={backLink}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">Листки опитування</h1>
            <Link href={sheetsNewHref}>
              <Button type="button">
                <AddIcon className="h-4 w-4" />
                Додати листок опитування
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <SheetsSearch initialQuery={query} className="w-full md:w-80" />

            <SheetsFilters
              className="w-full md:w-auto"
              renderMode="controls"
              protocols={protocolOptions}
              owners={ownerOptions}
              selectedProtocolId={protocolFilter}
              selectedOwnerId={ownerFilter?.id ?? ''}
              selectedStatus={statusFilter}
              selectedApartment={apartmentFilter || undefined}
            />
          </div>

          <SheetsFilters
            renderMode="badges"
            protocols={protocolOptions}
            owners={ownerOptions}
            selectedProtocolId={protocolFilter}
            selectedOwnerId={ownerFilter?.id ?? ''}
            selectedStatus={statusFilter}
            selectedApartment={apartmentFilter || undefined}
          />

          {sheets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {query
                ? 'Нічого не знайдено за вказаним запитом.'
                : ownerFilter
                  ? `Для співвласника ${formatOwnerShortName(ownerFilter)} листків опитування не знайдено.`
                  : apartmentFilter
                    ? `Для квартири ${apartmentFilter} листків опитування не знайдено.`
                    : statusFilter
                      ? 'За обраним статусом листків опитування не знайдено.'
                      : 'Листків опитування ще не створено.'}
            </p>
          ) : (
            <div className="space-y-4">
              {sheets.map((sheet) => {
                const displayStatus = getDisplaySheetStatus(sheet.status, sheet.expiresAt);
                const votePath = `/vote/${sheet.publicToken}`;
                const downloadBasePath = `/api/sheets/${sheet.id}/downloads`;
                const hasPdf = Boolean(sheet.pdfFileUrl);
                const isSigned = sheet.status === SheetStatus.SIGNED;
                const protocolNumberLabel = sheet.protocol.number.trim().startsWith('№')
                  ? sheet.protocol.number.trim()
                  : `№${sheet.protocol.number}`;
                const canRetryPdf =
                  !sheet.pdfUploadPending &&
                  (sheet.errorPending || (sheet.status !== SheetStatus.DRAFT && !hasPdf));
                const canDeleteSheet =
                  (sheet.status === SheetStatus.DRAFT || sheet.status === SheetStatus.EXPIRED) &&
                  sheet.ownerSignedAt === null &&
                  sheet.organizerSignedAt === null;
                const canOrganizerSign =
                  sheet.status === SheetStatus.PENDING_ORGANIZER &&
                  sheet.ownerSignedAt !== null &&
                  sheet.organizerSignedAt === null;

                return (
                  <Card key={sheet.id}>
                    <CardHeader className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle
                            className="min-w-0 truncate text-base sm:text-lg"
                            title={formatOwnerShortName(sheet.owner)}
                          >
                            {formatOwnerShortName(sheet.owner)}
                          </CardTitle>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="border-border bg-surface-muted text-foreground/80 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">
                              кв. {sheet.owner.apartmentNumber}
                            </span>
                            <span className="border-border bg-surface-muted text-foreground/80 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">
                              {protocolNumberLabel} від {DATE_FORMATTER.format(sheet.protocol.date)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex max-w-[9.75rem] shrink-0 items-center rounded-full px-2.5 py-1 text-center text-[11px] leading-tight font-medium whitespace-normal sm:max-w-none sm:text-xs sm:whitespace-nowrap ${SHEET_STATUS_STYLES[displayStatus]}`}
                        >
                          {displayStatus === SheetStatus.PENDING_ORGANIZER ? (
                            <>
                              <span className="sm:hidden">
                                Очікує підпису
                                <br />
                                відповідальної особи
                              </span>
                              <span className="hidden sm:inline">
                                {SHEET_STATUS_LABELS[displayStatus]}
                              </span>
                            </>
                          ) : (
                            SHEET_STATUS_LABELS[displayStatus]
                          )}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-4 sm:p-5 sm:pt-5">
                      <div className="space-y-3 text-sm">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <p className="text-muted-foreground">
                            Дата опитування:{' '}
                            <span className="text-foreground font-medium">
                              {DATE_FORMATTER.format(sheet.surveyDate)}
                            </span>
                          </p>
                          <p className="text-muted-foreground">
                            Підписати до:{' '}
                            <span className="text-foreground font-medium">
                              {DATE_FORMATTER.format(sheet.expiresAt)}
                            </span>
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Публічне посилання</p>
                          <SheetPublicLinkActions votePath={votePath} />
                        </div>
                      </div>

                      {canOrganizerSign ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Підпис відповідальної особи</p>
                          {sheet.dubidocSignPending ? (
                            <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-800">
                              Триває підготовка або синхронізація Dubidoc
                            </span>
                          ) : null}
                          {sheet.dubidocLastError ? (
                            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                              {sheet.dubidocLastError}
                            </span>
                          ) : null}
                          <SheetOrganizerSignActions
                            sheetId={sheet.id}
                            redirectTo={currentSheetsHref}
                            disabled={sheet.dubidocSignPending}
                            signAction={organizerSignSheetAction}
                            refreshAction={refreshSheetSigningStatusAction}
                          />
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Завантаження</p>
                        <div className="space-y-2">
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
                          <SheetDownloadActions
                            downloadBasePath={downloadBasePath}
                            hasPdf={hasPdf}
                            isSigned={isSigned}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          {canRetryPdf ? (
                            <SheetRetryForm
                              action={retrySheetPdfAction}
                              sheetId={sheet.id}
                              redirectTo={currentSheetsHref}
                            />
                          ) : null}
                        </div>
                        <div>
                          {canDeleteSheet ? (
                            <SheetDeleteForm
                              action={deleteSheetAction}
                              sheetId={sheet.id}
                              redirectTo={currentSheetsHref}
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Видалення недоступне
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
