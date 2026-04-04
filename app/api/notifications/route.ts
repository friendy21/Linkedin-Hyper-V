import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { forwardToBackend } from '@/lib/server/backend-api';

// GET /api/notifications — list notifications for the current user
// Supports ?limit=50&offset=0 pagination
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = new URLSearchParams();
  if (searchParams.get('limit'))  query.set('limit',  searchParams.get('limit')!);
  if (searchParams.get('offset')) query.set('offset', searchParams.get('offset')!);

  return forwardToBackend({
    method:  'GET',
    path:    '/notifications',
    query,
    headers: { 'x-user-id': session.userId },
  });
}
