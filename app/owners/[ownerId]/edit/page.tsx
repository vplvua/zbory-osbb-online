import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SheetStatus } from '@prisma/client';
import type { SVGProps } from 'react';
import OwnerEditSaveButton from '@/app/owners/[ownerId]/edit/_components/owner-edit-save-button';
import OwnerForm from '@/app/owners/_components/owner-form';
import OwnerDeleteForm from '@/app/owners/_components/owner-delete-form';
import { deleteOwnerAction, updateOwnerAction } from '@/app/owners/actions';
import AppHeader from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { getSessionPayload } from '@/lib/auth/session-token';
import { prisma } from '@/lib/db/prisma';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

type OwnerEditPageProps = {
  params: Promise<{ ownerId: string }>;
};

const OWNER_EDIT_FORM_ID = 'owner-edit-form';

function SheetsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

function AlertTriangleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 9v6" />
      <path d="M12 18h.01" />
    </svg>
  );
}

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

  const [createdSheetsCount, signedSheetsCount, apartmentSheetsCount] = await Promise.all([
    prisma.sheet.count({
      where: {
        ownerId: owner.id,
      },
    }),
    prisma.sheet.count({
      where: {
        ownerId: owner.id,
        status: SheetStatus.SIGNED,
      },
    }),
    prisma.sheet.count({
      where: {
        owner: {
          osbbId: selectedOsbb.id,
          apartmentNumber: owner.apartmentNumber,
        },
      },
    }),
  ]);
  const isEditLocked = apartmentSheetsCount > 0;

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title={selectedOsbb.shortName}
        containerClassName="max-w-4xl"
        actionNode={<OwnerEditSaveButton formId={OWNER_EDIT_FORM_ID} isLocked={isEditLocked} />}
        backLink={{ href: '/owners', label: '← Назад до співвласників' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
          {isEditLocked ? (
            <section className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                По цьому співвласнику вже є створені листки опитування, внести зміни неможливо.
              </p>
            </section>
          ) : null}

          <OwnerForm
            action={updateOwnerAction}
            submitLabel="Зберегти"
            formId={OWNER_EDIT_FORM_ID}
            showSubmitButton={false}
            isDisabled={isEditLocked}
            defaultValues={{
              ownerId: owner.id,
              lastName: owner.lastName,
              firstName: owner.firstName,
              middleName: owner.middleName,
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

          <section className="border-border rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Листки опитування</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Створено: <span className="text-foreground font-medium">{createdSheetsCount}</span>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Підписано: <span className="text-foreground font-medium">{signedSheetsCount}</span>
            </p>
            <div className="mt-4">
              <Link
                href={`/sheets?ownerId=${encodeURIComponent(owner.id)}&from=owner-edit&fromOwnerId=${encodeURIComponent(owner.id)}`}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                >
                  <SheetsIcon className="h-4 w-4" />
                  Перейти до листків опитування
                </Button>
              </Link>
            </div>
          </section>

          <section className="border-border rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Видалення співвласника</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Видалення недоступне, якщо для співвласника вже є створені листки опитування.
            </p>
            <div className="mt-4">
              <OwnerDeleteForm action={deleteOwnerAction} ownerId={owner.id} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
