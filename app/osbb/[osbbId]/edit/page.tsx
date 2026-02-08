import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppHeader from '@/components/app-header';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
import OsbbEditSaveButton from '@/app/osbb/[osbbId]/edit/_components/osbb-edit-save-button';
import OsbbForm from '@/app/osbb/_components/osbb-form';
import OsbbDeleteForm from '@/app/osbb/_components/osbb-delete-form';
import { deleteOsbbAction, updateOsbbAction } from '@/app/osbb/actions';

type EditPageProps = {
  params: Promise<{ osbbId: string }>;
};

export default async function OsbbEditPage({ params }: EditPageProps) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const { osbbId } = await params;
  const osbb = await prisma.oSBB.findFirst({
    where: {
      id: osbbId,
      userId: session.sub,
      isDeleted: false,
    },
  });

  if (!osbb) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title={osbb.shortName}
        containerClassName="max-w-3xl"
        actionNode={<OsbbEditSaveButton formId="osbb-edit-form" />}
        backLink={{ href: '/dashboard', label: '← Назад на головну' }}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
          <OsbbForm
            action={updateOsbbAction}
            formId="osbb-edit-form"
            showSubmitButton={false}
            submitLabel="Зберегти"
            defaultValues={{
              id: osbb.id,
              name: osbb.name,
              shortName: osbb.shortName,
              address: osbb.address,
              edrpou: osbb.edrpou,
              organizerName: osbb.organizerName ?? '',
              organizerEmail: osbb.organizerEmail ?? '',
              organizerPhone: osbb.organizerPhone ?? '',
            }}
          />

          <div className="border-border rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Протоколи</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Керуйте протоколами зборів та питаннями порядку денного.
            </p>
            <div className="mt-4">
              <Link
                href={`/osbb/${osbb.id}/protocols`}
                className="bg-brand text-brand-foreground hover:bg-brand-hover inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
              >
                Перейти до протоколів
              </Link>
            </div>
          </div>

          <div className="border-border rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Видалення</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              ОСББ буде позначене як видалене, але дані залишаться у системі.
            </p>
            <div className="mt-4">
              <OsbbDeleteForm action={deleteOsbbAction} id={osbb.id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
