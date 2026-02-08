import Link from 'next/link';
import { redirect } from 'next/navigation';
import OsbbSwitcher from '@/app/dashboard/osbb-switcher';
import AppHeader from '@/components/app-header';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSessionPayload } from '@/lib/auth/session-token';
import { prisma } from '@/lib/db/prisma';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

type DashboardCounts = {
  protocols: number;
  owners: number;
  sheets: number;
};

function OsbbSettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.55V22a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06A2 2 0 1 1 4.2 17.9l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1.04H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 0 1 7.07 5.1l.06.06a1.7 1.7 0 0 0 1.87.34h0A1.7 1.7 0 0 0 10 3.91V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06A2 2 0 1 1 19.8 8.07l-.06.06a1.7 1.7 0 0 0-.34 1.87v0A1.7 1.7 0 0 0 20.95 11H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1.04Z" />
    </svg>
  );
}

function ProtocolsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
      <path d="M9 8h2" />
    </svg>
  );
}

function OwnersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SheetsIcon(props: React.SVGProps<SVGSVGElement>) {
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

function EditIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function ViewListIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}

function CardActions({
  links,
}: {
  links: Array<{
    href: string;
    label: string;
    disabled?: boolean;
    icon?: 'add' | 'edit' | 'view';
  }>;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map((link) => {
        const icon =
          link.icon === 'add' ? (
            <AddIcon className="h-4 w-4" />
          ) : link.icon === 'edit' ? (
            <EditIcon className="h-4 w-4" />
          ) : link.icon === 'view' ? (
            <ViewListIcon className="h-4 w-4" />
          ) : link.label.startsWith('Додати') ? (
            <AddIcon className="h-4 w-4" />
          ) : link.label === 'Редагувати' ? (
            <EditIcon className="h-4 w-4" />
          ) : null;

        return link.disabled ? (
          <Button key={link.label} type="button" variant="outline" disabled>
            {icon}
            {link.label}
          </Button>
        ) : (
          <Link key={link.label} href={link.href}>
            <Button type="button" variant="outline">
              {icon}
              {link.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const selectedState = await resolveSelectedOsbb(session.sub);
  if (selectedState.osbbs.length === 0) {
    redirect('/osbb/new');
  }

  const selectedOsbb = selectedState.selectedOsbb;

  let counts: DashboardCounts = {
    protocols: 0,
    owners: 0,
    sheets: 0,
  };

  if (selectedOsbb) {
    const [protocols, owners, sheets] = await Promise.all([
      prisma.protocol.count({ where: { osbbId: selectedOsbb.id } }),
      prisma.owner.count({ where: { osbbId: selectedOsbb.id } }),
      prisma.sheet.count({
        where: {
          protocol: {
            osbbId: selectedOsbb.id,
          },
        },
      }),
    ]);

    counts = { protocols, owners, sheets };
  }

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title={selectedOsbb ? selectedOsbb.shortName : 'Оберіть ОСББ'}
        containerClassName="max-w-5xl"
        actionNode={
          <OsbbSwitcher
            osbbs={selectedState.osbbs}
            selectedOsbbId={selectedOsbb?.id ?? null}
            requireSelection={selectedState.requiresSelection}
          />
        }
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
          {!selectedOsbb ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground text-sm">
                  Оберіть ОСББ у діалоговому вікні, щоб перейти до роботи з протоколами,
                  співвласниками та листками опитування.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <OsbbSettingsIcon className="text-brand h-5 w-5" />
                  Реквізити ОСББ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOsbb ? (
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{selectedOsbb.shortName}</p>
                    <p className="text-muted-foreground">{selectedOsbb.address}</p>
                    <p className="text-muted-foreground">
                      Опитування проводить: {selectedOsbb.organizerName ?? '—'}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">ОСББ не обрано.</p>
                )}
                <CardActions
                  links={[
                    {
                      href: selectedOsbb ? `/osbb/${selectedOsbb.id}/edit` : '#',
                      label: 'Редагувати',
                      icon: 'edit',
                      disabled: !selectedOsbb,
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ProtocolsIcon className="text-brand h-5 w-5" />
                  Протоколи
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Кількість протоколів: {counts.protocols}
                </p>
                <CardActions
                  links={[
                    {
                      href: '/protocols',
                      label: 'Переглянути',
                      icon: 'view',
                      disabled: !selectedOsbb,
                    },
                    {
                      href: '/protocols/new?from=dashboard',
                      label: 'Додати новий протокол',
                      icon: 'add',
                      disabled: !selectedOsbb,
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <OwnersIcon className="text-brand h-5 w-5" />
                  Співвласники
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Кількість співвласників: {counts.owners}
                </p>
                <CardActions
                  links={[
                    {
                      href: '/owners',
                      label: 'Переглянути',
                      icon: 'view',
                      disabled: !selectedOsbb,
                    },
                    {
                      href: '/owners/new',
                      label: 'Додати співвласника',
                      icon: 'add',
                      disabled: !selectedOsbb,
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SheetsIcon className="text-brand h-5 w-5" />
                  Листки опитування
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Кількість листків: {counts.sheets}</p>
                <CardActions
                  links={[
                    {
                      href: '/sheets',
                      label: 'Переглянути',
                      icon: 'view',
                      disabled: !selectedOsbb,
                    },
                    {
                      href: '/sheets/new',
                      label: 'Додати листок опитування',
                      icon: 'add',
                      disabled: !selectedOsbb,
                    },
                  ]}
                />
              </CardContent>
            </Card>
          </section>

          <section className="mt-auto">
            <div className="border-border bg-surface rounded-xl border p-5">
              <h2 className="text-lg font-semibold">Налаштування додатку</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Дані уповноваженої особи та загальні інтеграції.
              </p>
              <div className="mt-4">
                <Link href="/dashboard/settings">
                  <Button type="button" variant="outline">
                    Налаштування додатку
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
