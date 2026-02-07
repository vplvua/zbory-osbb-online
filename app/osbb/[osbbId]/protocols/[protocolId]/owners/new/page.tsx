import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import OwnerForm from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/_components/owner-form';
import { createOwnerAction } from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/actions';

export default async function OwnerNewPage({
  params,
}: {
  params: Promise<{ osbbId: string; protocolId: string }>;
}) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const { osbbId, protocolId } = await params;
  const protocol = await prisma.protocol.findFirst({
    where: {
      id: protocolId,
      osbb: { id: osbbId, userId: session.sub, isDeleted: false },
    },
  });

  if (!protocol) {
    redirect('/osbb');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link
            href={`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners`}
            className="text-brand underline-offset-4 hover:underline"
          >
            ← Назад до співвласників
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Новий співвласник</h1>
      </div>

      <OwnerForm action={createOwnerAction} submitLabel="Додати" defaultValues={{ protocolId }} />
    </main>
  );
}
