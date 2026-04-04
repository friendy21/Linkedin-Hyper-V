import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { forwardToBackend } from '@/lib/server/backend-api';

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/linkedin-accounts/[id]/reconnect
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession(_req);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return forwardToBackend({
    method:    'POST',
    path:      `/linkedin-accounts/${id}/reconnect`,
    headers:   { 'x-user-id': session.userId },
    body:      {},
    timeoutMs: 330_000, // 5.5 minutes
  });
}
