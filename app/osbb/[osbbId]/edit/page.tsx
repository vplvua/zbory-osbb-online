import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getSessionPayload } from '@/lib/auth/session-token';
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
    redirect('/osbb');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-sm text-neutral-600">
          <Link href="/osbb" className="text-blue-600 hover:underline">
            ← Назад до списку
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Редагувати ОСББ</h1>
      </div>

      <OsbbForm
        action={updateOsbbAction}
        submitLabel="Зберегти"
        defaultValues={{
          id: osbb.id,
          name: osbb.name,
          address: osbb.address,
          edrpou: osbb.edrpou,
        }}
      />

      <div className="rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold">Протоколи</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Керуйте протоколами зборів та питаннями порядку денного.
        </p>
        <div className="mt-4">
          <Link
            href={`/osbb/${osbb.id}/protocols`}
            className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Перейти до протоколів
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold">Видалення</h2>
        <p className="mt-2 text-sm text-neutral-600">
          ОСББ буде позначене як видалене, але дані залишаться у системі.
        </p>
        <div className="mt-4">
          <OsbbDeleteForm action={deleteOsbbAction} id={osbb.id} />
        </div>
      </div>
    </main>
  );
}
