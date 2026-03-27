import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/nextauth';
import { forwardToBackend } from '@/lib/server/backend-api';

// GET /api/linkedin-accounts — list all LinkedIn accounts for the current user
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return forwardToBackend({
    method:  'GET',
    path:    '/linkedin-accounts',
    headers: { 'x-user-id': session.user.id },
  });
}
