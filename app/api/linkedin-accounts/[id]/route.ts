import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/nextauth';
import { forwardToBackend } from '@/lib/server/backend-api';

interface Params {
  params: { id: string };
}

// DELETE /api/linkedin-accounts/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return forwardToBackend({
    method:  'DELETE',
    path:    `/linkedin-accounts/${params.id}`,
    headers: { 'x-user-id': session.user.id },
  });
}

// POST /api/linkedin-accounts/[id]/reconnect is handled by the reconnect route file
