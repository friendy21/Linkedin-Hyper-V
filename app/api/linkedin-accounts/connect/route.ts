import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { forwardToBackend } from '@/lib/server/backend-api';

// POST /api/linkedin-accounts/connect
// Initiates the Playwright-based LinkedIn login capture flow.
// Times out at 5.5 minutes (matching worker-side).
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return forwardToBackend({
    method: 'POST',
    path:   '/linkedin-accounts/connect',
    body:   { userId: session.userId },
    timeoutMs: 330_000, // 5.5 minutes
  });
}
