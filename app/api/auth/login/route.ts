import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail } from '@/lib/models/user';
import { signToken } from '@/lib/auth/jwt';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';
import bcrypt from 'bcrypt';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format').min(1).max(254),
  password: z.string().min(8).max(128),
});

// Type for login request
interface LoginRequestBody {
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const ip = getClientIp(req);
    const { success: rateLimitOk, reset } = await rateLimit(`login:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    });

    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait 15 minutes.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    // Parse and validate request body
    const body: unknown = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data as LoginRequestBody;
    
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
    // Log error securely (no stack traces in production)
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Login error:', error);
    }
    
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
