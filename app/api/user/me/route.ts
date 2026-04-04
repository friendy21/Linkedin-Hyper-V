// FILE: app/api/user/me/route.ts
// Returns the current authenticated user's details
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserById } from '@/lib/models/user';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const user = await getUserById(session.userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return safe user data (exclude password_hash)
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      }
    });
  } catch (error) {
    // Log error securely
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('User fetch error:', error);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
