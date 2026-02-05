export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET is required in production for auth.');
  }

  return secret ?? 'dev-secret';
}
