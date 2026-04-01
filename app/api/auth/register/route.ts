import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signToken } from '@/lib/auth/jwt';
import { createUser, getUserByEmail } from '@/lib/models/user';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';
import bcrypt from 'bcrypt';

// Validation schema with proper sanitization
const registerSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .transform(val => val.replace(/[<>]/g, '')), // Basic XSS sanitization
  email: z.string()
    .email('Invalid email format')
    .min(1)
    .max(254)
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
});

// Type for register request
interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 3 registrations per hour per IP
    const ip = getClientIp(req);
    const { success: rateLimitOk, reset } = await rateLimit(`register:${ip}`, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
    });

    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
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
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data as RegisterRequestBody;
    
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' }, 
        { status: 409 }
      );
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 12);
    
    // Create new user (automatically set as role 'user')
    const user = await createUser({
      name,
      email,
      password_hash,
      role: 'user'
    });
    
    // Generate JWT specific to the user
    const token = await signToken({ userId: user.id, role: user.role });
    
    const response = NextResponse.json({ 
      ok: true, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role } 
    }, { status: 201 });
    
    // Set HTTP-only cookie
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
      console.error('Registration error:', error);
    }
    
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
