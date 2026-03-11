import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { workerClient } from '@/lib/worker-client';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const accounts = await prisma.linkedInAccount.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { conversations: true } }
      }
    });

    return NextResponse.json(accounts);
  } catch (error: unknown) {
    const isDev = process.env.NODE_ENV === 'development';
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Accounts GET] Error:', message);
    return NextResponse.json(
      { error: isDev ? message : 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body as { name?: string };

    if (!name) {
      return NextResponse.json({ error: 'Name is required', code: 'BAD_REQUEST' }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;

    const { url: authUrl } = await workerClient.generateAuthLink({
      name,
      successRedirectUrl: `${baseUrl}/accounts?connected=1`,
      failureRedirectUrl: `${baseUrl}/accounts?error=1`,
    });

    return NextResponse.json({ authUrl });
  } catch (error: unknown) {
    const isDev = process.env.NODE_ENV === 'development';
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Accounts POST] Error:', message);
    return NextResponse.json(
      { error: isDev ? message : 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
