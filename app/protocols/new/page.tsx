import { redirect } from 'next/navigation';
import { getSessionPayload } from '@/lib/auth/session-token';
import { resolveSelectedOsbb } from '@/lib/osbb/selected-osbb';

type ProtocolNewRouteProps = {
  searchParams?: Promise<{ from?: string }>;
};

export default async function ProtocolNewPage({ searchParams }: ProtocolNewRouteProps) {
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

  const from = (await searchParams)?.from;
  const normalizedFrom =
    from === 'dashboard' ? 'dashboard' : from === 'protocols' ? 'protocols' : null;
  const fromQuery = normalizedFrom ? `?from=${normalizedFrom}` : '';

  redirect(`/osbb/${selectedState.selectedOsbb.id}/protocols/new${fromQuery}`);
}
