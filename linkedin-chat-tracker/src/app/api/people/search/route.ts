import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { workerClient } from '@/lib/worker-client';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q         = searchParams.get('q');
    const accountId = searchParams.get('accountId');

    if (!q || q.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const account = await prisma.linkedInAccount.findFirst({
      where: { id: accountId, userId: session.user.id }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
    }

    const results = await workerClient.searchPeople(account.unipileAccountId, q);

    return NextResponse.json(results);
  } catch (error: unknown) {
    const isDev = process.env.NODE_ENV === 'development';
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[People Search] Error:', message);
    return NextResponse.json(
      { error: isDev ? message : 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
