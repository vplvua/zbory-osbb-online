import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import AddIcon from '@/components/icons/add-icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ProtocolsPage({ params }: { params: Promise<{ osbbId: string }> }) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const { osbbId } = await params;
  const osbb = await prisma.oSBB.findFirst({
    where: { id: osbbId, userId: session.sub, isDeleted: false },
  });

  if (!osbb) {
    redirect('/dashboard');
  }

  const protocols = await prisma.protocol.findMany({
    where: { osbbId: osbb.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { questions: true } } },
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
            <h1 className="text-2xl font-semibold">Протоколи</h1>
            <p className="text-muted-foreground text-sm">{osbb.name}</p>
          </div>
          <Link
            href={`/osbb/${osbb.id}/protocols/new`}
            className="bg-brand text-brand-foreground hover:bg-brand-hover inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
          >
            <AddIcon className="h-4 w-4" />
            Додати протокол
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список протоколів</CardTitle>
        </CardHeader>
        <CardContent>
          {protocols.length === 0 ? (
            <p className="text-muted-foreground text-sm">Протоколи ще не створено.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Питань</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocols.map((protocol) => (
                  <TableRow key={protocol.id}>
                    <TableCell className="font-medium">{protocol.number}</TableCell>
                    <TableCell>{protocol.date.toLocaleDateString('uk-UA')}</TableCell>
                    <TableCell>{protocol.type === 'GENERAL' ? 'Загальні' : 'Установчі'}</TableCell>
                    <TableCell>{protocol._count.questions}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/osbb/${osbb.id}/protocols/${protocol.id}/edit`}
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
