import { redirect } from 'next/navigation';
import { getSessionPayload } from '@/lib/auth/session-token';

export default async function Home() {
  const session = await getSessionPayload();
  redirect(session ? '/dashboard' : '/login');
}
