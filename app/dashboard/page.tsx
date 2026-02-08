import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import OsbbSwitcher from '@/app/dashboard/osbb-switcher';
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

function CardActions({
  links,
}: {
  links: Array<{
    href: string;
    label: string;
    disabled?: boolean;
  }>;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map((link) =>
        link.disabled ? (
          <Button key={link.label} type="button" variant="outline" disabled>
            {link.label}
          </Button>
        ) : (
          <Link key={link.label} href={link.href}>
            <Button type="button" variant="outline">
              {link.label}
            </Button>
          </Link>
        ),
      )}
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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/moeosbb.svg" alt="Логотип Збори" width={40} height={40} priority />
          <p className="text-xl font-semibold">
            {selectedOsbb ? selectedOsbb.shortName : 'Оберіть ОСББ'}
          </p>
        </div>
        <OsbbSwitcher
          osbbs={selectedState.osbbs}
          selectedOsbbId={selectedOsbb?.id ?? null}
          requireSelection={selectedState.requiresSelection}
        />
      </header>

      {!selectedOsbb ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-sm">
              Оберіть ОСББ у діалоговому вікні, щоб перейти до роботи з протоколами, співвласниками
              та листками опитування.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Налаштування ОСББ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {selectedOsbb ? `${selectedOsbb.name}, ${selectedOsbb.address}` : 'ОСББ не обрано.'}
            </p>
            <CardActions
              links={[
                {
                  href: selectedOsbb ? `/osbb/${selectedOsbb.id}/edit` : '#',
                  label: 'Перейти до налаштувань',
                  disabled: !selectedOsbb,
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Протоколи</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Кількість протоколів: {counts.protocols}
            </p>
            <CardActions
              links={[
                {
                  href: '/protocols',
                  label: 'Перейти до протоколів',
                  disabled: !selectedOsbb,
                },
                {
                  href: '/protocols/new',
                  label: 'Додати новий протокол',
                  disabled: !selectedOsbb,
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Співвласники</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Кількість співвласників: {counts.owners}
            </p>
            <CardActions
              links={[
                {
                  href: '/owners',
                  label: 'Перейти до співвласників',
                  disabled: !selectedOsbb,
                },
                {
                  href: '/owners/new',
                  label: 'Додати співвласника',
                  disabled: !selectedOsbb,
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Листки опитування</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Кількість листків: {counts.sheets}</p>
            <CardActions
              links={[
                {
                  href: '/sheets',
                  label: 'Перейти до листків',
                  disabled: !selectedOsbb,
                },
                {
                  href: '/sheets/new',
                  label: 'Додати листок опитування',
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
    </main>
  );
}
