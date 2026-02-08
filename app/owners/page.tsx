import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import AddIcon from '@/components/icons/add-icon';
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
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

type OwnersPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

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
            fullName: {
              contains: query,
              mode: 'insensitive',
            },
          }
        : {}),
    },
    orderBy: [{ fullName: 'asc' }, { apartmentNumber: 'asc' }],
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link href="/dashboard" className="text-brand underline-offset-4 hover:underline">
            ← Назад до дашборду
          </Link>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Співвласники</h1>
            <p className="text-muted-foreground text-sm">{selectedOsbb.name}</p>
          </div>
          <Link href="/owners/new">
            <Button type="button">
              <AddIcon className="h-4 w-4" />
              Додати співвласника
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Реєстр співвласників</CardTitle>
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
                  <TableHead>Частка</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell className="font-medium">{owner.fullName}</TableCell>
                    <TableCell>{owner.apartmentNumber}</TableCell>
                    <TableCell>{owner.ownedArea.toString()}</TableCell>
                    <TableCell>
                      {owner.ownershipNumerator}/{owner.ownershipDenominator}
                    </TableCell>
                    <TableCell>{owner.phone ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/owners/${owner.id}/edit`}
                        className="text-brand text-sm underline-offset-4 hover:underline"
                      >
                        Редагувати
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
