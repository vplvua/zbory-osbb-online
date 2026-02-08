import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import OwnerForm from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/_components/owner-form';
import OwnerDeleteForm from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/_components/owner-delete-form';
import {
  deleteOwnerAction,
  updateOwnerAction,
} from '@/app/osbb/[osbbId]/protocols/[protocolId]/owners/actions';

export default async function OwnerEditPage({
  params,
}: {
  params: Promise<{ osbbId: string; protocolId: string; ownerId: string }>;
}) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const { osbbId, protocolId, ownerId } = await params;

  const protocol = await prisma.protocol.findFirst({
    where: {
      id: protocolId,
      osbb: {
        id: osbbId,
        userId: session.sub,
        isDeleted: false,
      },
    },
    select: {
      id: true,
      osbbId: true,
    },
  });

  if (!protocol) {
    redirect('/dashboard');
  }

  const [owner, protocolOwner] = await Promise.all([
    prisma.owner.findFirst({
      where: {
        id: ownerId,
        osbbId: protocol.osbbId,
      },
    }),
    prisma.protocolOwner.findFirst({
      where: {
        protocolId: protocol.id,
        ownerId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!owner || !protocolOwner) {
    redirect(`/osbb/${protocol.osbbId}/protocols/${protocol.id}/owners`);
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
        <h1 className="text-2xl font-semibold">Редагувати співвласника</h1>
      </div>

      <OwnerForm
        action={updateOwnerAction}
        submitLabel="Зберегти"
        defaultValues={{
          ownerId: owner.id,
          protocolId: protocol.id,
          fullName: owner.fullName,
          apartmentNumber: owner.apartmentNumber,
          totalArea: owner.totalArea.toString(),
          ownershipNumerator: String(owner.ownershipNumerator),
          ownershipDenominator: String(owner.ownershipDenominator),
          ownershipDocument: owner.ownershipDocument,
          email: owner.email ?? '',
          phone: owner.phone ?? '',
          representativeName: owner.representativeName ?? '',
          representativeDocument: owner.representativeDocument ?? '',
        }}
      />

      <div className="border-border rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Видалення з протоколу</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Співвласник буде видалений лише з поточного протоколу. Дані співвласника в ОСББ
          залишаться.
        </p>
        <div className="mt-4">
          <OwnerDeleteForm action={deleteOwnerAction} ownerId={owner.id} protocolId={protocol.id} />
        </div>
      </div>
    </main>
  );
}
