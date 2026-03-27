import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/nextauth';
import { forwardToBackend } from '@/lib/server/backend-api';

interface Params {
  params: { id: string };
}

// POST /api/linkedin-accounts/[id]/reconnect
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return forwardToBackend({
    method:    'POST',
    path:      `/linkedin-accounts/${params.id}/reconnect`,
    headers:   { 'x-user-id': session.user.id },
    body:      {},
    timeoutMs: 330_000, // 5.5 minutes
  });
}
