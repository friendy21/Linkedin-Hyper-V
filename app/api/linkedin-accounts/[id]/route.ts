import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { forwardToBackend } from '@/lib/server/backend-api';

interface Params {
  params: Promise<{ id: string }>;
}

// DELETE /api/linkedin-accounts/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession(_req);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return forwardToBackend({
    method:  'DELETE',
    path:    `/linkedin-accounts/${id}`,
    headers: { 'x-user-id': session.userId },
  });
}

// POST /api/linkedin-accounts/[id]/reconnect is handled by the reconnect route file
