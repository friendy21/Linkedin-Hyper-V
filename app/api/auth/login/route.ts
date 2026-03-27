import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/models/user';
import { signToken } from '@/lib/auth/jwt';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' }, 
        { status: 400 }
      );
    }
    
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' }, 
        { status: 401 }
      );
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' }, 
        { status: 401 }
      );
    }
    
    // Generate JWT specific to the user
    const token = await signToken({ userId: user.id, role: user.role });
    
    // Set HTTP-only cookie
    const response = NextResponse.json({ 
      ok: true, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role } 
    });
    
    response.cookies.set('app_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400', 10),
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
