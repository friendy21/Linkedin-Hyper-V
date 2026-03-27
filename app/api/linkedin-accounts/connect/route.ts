import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/nextauth';
import { forwardToBackend } from '@/lib/server/backend-api';

// POST /api/linkedin-accounts/connect
// Initiates the Playwright-based LinkedIn login capture flow.
// Times out at 5.5 minutes (matching worker-side).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return forwardToBackend({
    method: 'POST',
    path:   '/linkedin-accounts/connect',
    body:   { userId: session.user.id },
    timeoutMs: 330_000, // 5.5 minutes
  });
}
