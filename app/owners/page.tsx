import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SheetStatus } from '@prisma/client';
import type { SVGProps } from 'react';
import OwnersSearch from '@/app/owners/_components/owners-search';
import AppHeader from '@/components/app-header';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';
import { formatOwnerShortName } from '@/lib/owner/name';

type OwnersPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

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

export default async function OwnersPage({ searchParams }: OwnersPageProps) {
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

  const query = (await searchParams)?.q?.trim() ?? '';

  const owners = await prisma.owner.findMany({
    where: {
      osbbId: selectedOsbb.id,
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
                phone: {
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
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' },
      { middleName: 'asc' },
      { apartmentNumber: 'asc' },
    ],
  });

  const apartmentNumbers = Array.from(new Set(owners.map((owner) => owner.apartmentNumber)));
  const apartmentSheets =
    apartmentNumbers.length > 0
      ? await prisma.sheet.findMany({
          where: {
            protocol: {
              osbbId: selectedOsbb.id,
            },
            owner: {
              apartmentNumber: {
                in: apartmentNumbers,
              },
            },
          },
          select: {
            protocolId: true,
            status: true,
            owner: {
              select: {
                apartmentNumber: true,
              },
            },
          },
        })
      : [];

  const apartmentSheetStats = new Map<string, { signed: number; total: number }>();
  const apartmentProtocolSets = new Map<string, { all: Set<string>; signed: Set<string> }>();

  for (const apartmentNumber of apartmentNumbers) {
    apartmentProtocolSets.set(apartmentNumber, {
      all: new Set<string>(),
      signed: new Set<string>(),
    });
  }

  for (const sheet of apartmentSheets) {
    const stats = apartmentProtocolSets.get(sheet.owner.apartmentNumber) ?? {
      all: new Set<string>(),
      signed: new Set<string>(),
    };

    stats.all.add(sheet.protocolId);
    if (sheet.status === SheetStatus.SIGNED) {
      stats.signed.add(sheet.protocolId);
    }

    apartmentProtocolSets.set(sheet.owner.apartmentNumber, stats);
  }

  for (const [apartmentNumber, stats] of apartmentProtocolSets) {
    apartmentSheetStats.set(apartmentNumber, {
      signed: stats.signed.size,
      total: stats.all.size,
    });
  }

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title={selectedOsbb.shortName}
        containerClassName="max-w-5xl"
        backLink={{ href: '/dashboard', label: '← Назад на головну' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">Співвласники</h1>
            <Link href="/owners/new">
              <Button type="button">
                <AddIcon className="h-4 w-4" />
                Додати співвласника
              </Button>
            </Link>
          </div>

          <OwnersSearch initialQuery={query} />

          {owners.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {query ? 'Нічого не знайдено за вказаним запитом.' : 'Співвласників ще не додано.'}
            </p>
          ) : (
            <div className="space-y-4">
              {owners.map((owner) => {
                const ownerShortName = formatOwnerShortName(owner);
                const sheetStats = apartmentSheetStats.get(owner.apartmentNumber) ?? {
                  signed: 0,
                  total: 0,
                };
                const sheetsFilterHref = `/sheets?apartment=${encodeURIComponent(owner.apartmentNumber)}&from=owners`;

                return (
                  <Card key={owner.id}>
                    <CardHeader className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle
                            className="min-w-0 flex-1 truncate text-base sm:text-lg"
                            title={ownerShortName}
                          >
                            {ownerShortName}
                          </CardTitle>
                          <Link href={sheetsFilterHref}>
                            <Button
                              type="button"
                              variant="outline"
                              className="mt-3 h-8 border-emerald-300 bg-emerald-50 px-3 text-xs text-emerald-800 hover:bg-emerald-100"
                            >
                              <SheetsIcon className="h-4 w-4" />
                              Листків {sheetStats.signed}/{sheetStats.total}
                            </Button>
                          </Link>
                        </div>
                        <span className="border-border bg-surface-muted text-foreground/80 inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium">
                          Кв. {owner.apartmentNumber}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 sm:p-5">
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <p className="text-muted-foreground">
                          Площа:{' '}
                          <span className="text-foreground font-medium">
                            {owner.ownedArea.toString()} м²
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          Частка:{' '}
                          <span className="text-foreground font-medium">
                            {owner.ownershipNumerator}/{owner.ownershipDenominator}
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          Телефон:{' '}
                          <span className="text-foreground font-medium">{owner.phone ?? '—'}</span>
                        </p>
                        <p className="text-muted-foreground flex min-w-0 items-center gap-1">
                          <span className="shrink-0">Документ:</span>
                          <span
                            className="text-foreground block min-w-0 flex-1 truncate font-medium"
                            title={owner.ownershipDocument}
                          >
                            {owner.ownershipDocument}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/owners/${owner.id}/edit`}>
                          <Button type="button" variant="outline">
                            <EditIcon className="h-4 w-4" />
                            Редагувати
                          </Button>
                        </Link>
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
