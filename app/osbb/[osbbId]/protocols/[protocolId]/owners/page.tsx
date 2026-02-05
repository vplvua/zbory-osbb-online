import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
                  <TableHead className="text-right">Дії</TableHead>
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
