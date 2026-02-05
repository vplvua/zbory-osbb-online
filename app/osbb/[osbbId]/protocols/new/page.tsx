import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import ProtocolForm from '@/app/osbb/[osbbId]/protocols/_components/protocol-form';
import { createProtocolAction } from '@/app/osbb/[osbbId]/protocols/actions';

export default async function ProtocolNewPage({ params }: { params: Promise<{ osbbId: string }> }) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const { osbbId } = await params;
  const osbb = await prisma.oSBB.findFirst({
    where: { id: osbbId, userId: session.sub, isDeleted: false },
  });

  if (!osbb) {
    redirect('/osbb');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-sm text-neutral-600">
          <Link href={`/osbb/${osbb.id}/protocols`} className="text-blue-600 hover:underline">
            ← Назад до протоколів
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Новий протокол</h1>
      </div>

      <ProtocolForm
        action={createProtocolAction}
        submitLabel="Створити"
        defaultValues={{ osbbId: osbb.id, type: 'GENERAL' }}
      />
    </main>
  );
}
