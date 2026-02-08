import Link from 'next/link';
import { redirect } from 'next/navigation';
import OwnerForm from '@/app/owners/_components/owner-form';
import OwnerDeleteForm from '@/app/owners/_components/owner-delete-form';
import { deleteOwnerAction, updateOwnerAction } from '@/app/owners/actions';
import { getSessionPayload } from '@/lib/auth/session-token';
import { prisma } from '@/lib/db/prisma';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

type OwnerEditPageProps = {
  params: Promise<{ ownerId: string }>;
};

export default async function OwnerEditPage({ params }: OwnerEditPageProps) {
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

  const { ownerId } = await params;
  const owner = await prisma.owner.findFirst({
    where: {
      id: ownerId,
      osbbId: selectedOsbb.id,
      osbb: {
        userId: session.sub,
        isDeleted: false,
      },
    },
  });

  if (!owner) {
    redirect('/owners');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link href="/owners" className="text-brand underline-offset-4 hover:underline">
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

      <div className="border-border rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Видалення співвласника</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Видалення недоступне, якщо для співвласника вже є створені листки опитування.
        </p>
        <div className="mt-4">
          <OwnerDeleteForm action={deleteOwnerAction} ownerId={owner.id} />
        </div>
      </div>
    </main>
  );
}
