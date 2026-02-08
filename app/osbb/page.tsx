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

export default async function OsbbListPage() {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const osbbs = await prisma.oSBB.findMany({
    where: {
      userId: session.sub,
      isDeleted: false,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { protocols: true },
      },
    },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">ОСББ</h1>
          <p className="text-muted-foreground text-sm">Список зареєстрованих ОСББ.</p>
        </div>
        <Link
          href="/osbb/new"
          className="bg-brand text-brand-foreground hover:bg-brand-hover inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
        >
          Додати ОСББ
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ваші ОСББ</CardTitle>
        </CardHeader>
        <CardContent>
          {osbbs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Поки що немає ОСББ.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Повна назва</TableHead>
                  <TableHead>Коротка назва</TableHead>
                  <TableHead>Адреса</TableHead>
                  <TableHead>ЄДРПОУ</TableHead>
                  <TableHead>Протоколи</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {osbbs.map((osbb) => (
                  <TableRow key={osbb.id}>
                    <TableCell className="font-medium">{osbb.name}</TableCell>
                    <TableCell>{osbb.shortName}</TableCell>
                    <TableCell>{osbb.address}</TableCell>
                    <TableCell>{osbb.edrpou}</TableCell>
                    <TableCell>{osbb._count.protocols}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          className="text-brand text-sm underline-offset-4 hover:underline"
                          href={`/osbb/${osbb.id}/protocols`}
                        >
                          Протоколи
                        </Link>
                        <Link
                          className="text-brand text-sm underline-offset-4 hover:underline"
                          href={`/osbb/${osbb.id}/edit`}
                        >
                          Редагувати
                        </Link>
                      </div>
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
