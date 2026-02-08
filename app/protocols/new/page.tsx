import { redirect } from 'next/navigation';
import { getSessionPayload } from '@/lib/auth/session-token';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

export default async function ProtocolNewPage() {
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

  redirect(`/osbb/${selectedState.selectedOsbb.id}/protocols/new`);
}
