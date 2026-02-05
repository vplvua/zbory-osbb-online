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
  const owner = await prisma.owner.findFirst({
    where: {
      id: ownerId,
      protocol: {
        id: protocolId,
        osbb: { id: osbbId, userId: session.sub, isDeleted: false },
      },
    },
    include: {
      protocol: true,
    },
  });

  if (!owner) {
    redirect('/osbb');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-sm text-neutral-600">
          <Link
            href={`/osbb/${owner.protocol.osbbId}/protocols/${owner.protocolId}/owners`}
            className="text-blue-600 hover:underline"
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

      <div className="rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold">Видалення</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Співвласник буде видалений без можливості відновлення.
        </p>
        <div className="mt-4">
          <OwnerDeleteForm action={deleteOwnerAction} ownerId={owner.id} />
        </div>
      </div>
    </main>
  );
}
