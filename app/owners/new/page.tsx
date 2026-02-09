import { redirect } from 'next/navigation';
import OwnerForm from '@/app/owners/_components/owner-form';
import { createOwnerAction } from '@/app/owners/actions';
import OwnerCreateSaveButton from '@/app/owners/new/_components/owner-create-save-button';
import AppHeader from '@/components/app-header';
import { getSessionPayload } from '@/lib/auth/session-token';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

const OWNER_CREATE_FORM_ID = 'owner-create-form';

type OwnerNewPageProps = {
  searchParams?: Promise<{ from?: string }>;
};

export default async function OwnerNewPage({ searchParams }: OwnerNewPageProps) {
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

  const from = (await searchParams)?.from;
  const backLink =
    from === 'dashboard'
      ? { href: '/dashboard', label: '← Назад на головну' }
      : { href: '/owners', label: '← Назад до співвласників' };

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        title={selectedOsbb.shortName}
        containerClassName="max-w-4xl"
        actionNode={<OwnerCreateSaveButton formId={OWNER_CREATE_FORM_ID} />}
        backLink={backLink}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
          <OwnerForm
            action={createOwnerAction}
            submitLabel="Додати"
            formId={OWNER_CREATE_FORM_ID}
            showSubmitButton={false}
          />
        </div>
      </main>
    </div>
  );
}
