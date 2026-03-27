// FILE: app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  
  // Return userId so the frontend can join the correct Socket.IO user room
  return NextResponse.json({ authenticated: true, userId: session.userId ?? null });
}
