'use server';

import { redirect } from 'next/navigation';
import { getSessionPayload } from '@/lib/auth/session-token';
import { setSelectedOsbbForUser } from '@/lib/osbb/selected-osbb';

export async function selectOsbbAction(formData: FormData) {
  const session = await getSessionPayload();
  if (!session) {
    redirect('/login');
  }

  const osbbId = String(formData.get('osbbId') ?? '');
  if (!osbbId) {
    redirect('/dashboard');
  }

  try {
    await setSelectedOsbbForUser(session.sub, osbbId);
  } catch {
    redirect('/dashboard');
  }

  redirect('/dashboard');
}
