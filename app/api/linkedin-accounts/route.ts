import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { forwardToBackend } from '@/lib/server/backend-api';

// GET /api/linkedin-accounts — list all LinkedIn accounts for the current user
export async function GET(_req: NextRequest) {
  const session = await getSession(_req);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return forwardToBackend({
    method:  'GET',
    path:    '/linkedin-accounts',
    headers: { 'x-user-id': session.userId },
  });
}
