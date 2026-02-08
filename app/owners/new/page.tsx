import Link from 'next/link';
import { redirect } from 'next/navigation';
import OwnerForm from '@/app/owners/_components/owner-form';
import { createOwnerAction } from '@/app/owners/actions';
import { getSessionPayload } from '@/lib/auth/session-token';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

export default async function OwnerNewPage() {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const selectedState = await resolveSelectedOsbb(session.sub);
  if (selectedState.osbbs.length === 0) {
    redirect('/osbb/new');
  }

  if (!selectedState.selectedOsbb) {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link href="/owners" className="text-brand underline-offset-4 hover:underline">
            ← Назад до співвласників
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Новий співвласник ОСББ</h1>
      </div>

      <OwnerForm action={createOwnerAction} submitLabel="Додати" />
    </main>
  );
}
