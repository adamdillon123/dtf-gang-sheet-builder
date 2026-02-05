import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
