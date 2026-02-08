import Link from 'next/link';
import { redirect } from 'next/navigation';
import SheetCreateForm from '@/app/sheets/_components/sheet-create-form';
import { createSheetAction } from '@/app/sheets/actions';
import AddIcon from '@/components/icons/add-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionPayload } from '@/lib/auth/session-token';
import { prisma } from '@/lib/db/prisma';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

const DATE_FORMATTER = new Intl.DateTimeFormat('uk-UA');

export default async function SheetNewPage() {
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

  const [protocols, owners] = await Promise.all([
    prisma.protocol.findMany({
      where: { osbbId: selectedOsbb.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        number: true,
        date: true,
      },
    }),
    prisma.owner.findMany({
      where: { osbbId: selectedOsbb.id },
      orderBy: [{ fullName: 'asc' }, { apartmentNumber: 'asc' }],
      select: {
        id: true,
        fullName: true,
        apartmentNumber: true,
      },
    }),
  ]);

  const defaultSurveyDate = new Date().toISOString().split('T')[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link href="/sheets" className="text-brand underline-offset-4 hover:underline">
            ← Назад до листків опитування
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Новий листок опитування</h1>
      </div>

      {protocols.length === 0 || owners.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-6">
            <p className="text-muted-foreground text-sm">
              Для створення листка потрібні хоча б один протокол і один співвласник у вибраному
              ОСББ.
            </p>
            <div className="flex flex-wrap gap-2">
              {protocols.length === 0 ? (
                <Link href="/protocols/new">
                  <Button type="button">
                    <AddIcon className="h-4 w-4" />
                    Додати протокол
                  </Button>
                </Link>
              ) : null}
              {owners.length === 0 ? (
                <Link href="/owners/new">
                  <Button type="button" variant="outline">
                    <AddIcon className="h-4 w-4" />
                    Додати співвласника
                  </Button>
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <SheetCreateForm
          action={createSheetAction}
          protocols={protocols.map((protocol) => ({
            id: protocol.id,
            number: protocol.number,
            dateLabel: DATE_FORMATTER.format(protocol.date),
          }))}
          owners={owners}
          defaultSurveyDate={defaultSurveyDate}
        />
      )}
    </main>
  );
}
