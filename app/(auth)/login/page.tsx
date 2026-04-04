// FILE: app/(auth)/login/page.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldState {
  touched: boolean;
  valid: boolean;
  message: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [shaking, setShaking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [emailState, setEmailState] = useState<FieldState>({ touched: false, valid: false, message: '' });
  const [passwordState, setPasswordState] = useState<FieldState>({ touched: false, valid: false, message: '' });

  const validateEmail = useCallback((val: string) => {
    const valid = EMAIL_REGEX.test(val);
    setEmailState({ touched: true, valid, message: valid ? '' : 'Enter a valid email address' });
    return valid;
  }, []);

  const validatePassword = useCallback((val: string) => {
    const valid = val.length >= 8;
    setPasswordState({ touched: true, valid, message: valid ? '' : 'Password must be at least 8 characters' });
    return valid;
  }, []);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    const emailOk = validateEmail(email);
    const passOk = validatePassword(password);
    if (!emailOk || !passOk) { triggerShake(); return; }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setServerError(
        msg.includes('429') || msg.includes('Too many')
          ? 'Too many attempts. Please wait 15 minutes.'
          : msg.includes('401') || msg.includes('Invalid')
          ? 'Incorrect email or password'
          : msg
      );
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase = `
    w-full pl-10 pr-4 py-3 rounded-xl text-sm text-[--text-primary] placeholder:text-[--text-muted]
    bg-[--bg-elevated] border transition-colors duration-150 outline-none
    focus:border-[--accent]
  `;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Radial glow behind card */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.12), transparent)',
        }}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-sm glass rounded-2xl p-8 shadow-2xl ${shaking ? 'animate-shake' : ''}`}
        style={{
          animation: shaking
            ? 'shake 0.5s ease-in-out'
            : 'slideIn 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Logo + Heading */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-xl mb-4"
            style={{ backgroundColor: 'var(--linkedin)' }}
          >
            in
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[--text-primary]">Hyper-V</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Sign in to your dashboard
          </p>
        </div>

        {/* Server error */}
        {serverError && (
          <div
            role="alert"
            className="mb-5 px-4 py-3 rounded-xl text-sm border"
            style={{
              background: 'rgba(239,68,68,0.08)',
              borderColor: 'rgba(239,68,68,0.3)',
              color: 'var(--danger)',
            }}
          >
            {serverError}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="label-xs block mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => validateEmail(email)}
                placeholder="you@company.com"
                disabled={isLoading}
                autoFocus
                className={inputBase}
                style={{
                  borderColor: emailState.touched
                    ? emailState.valid ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'
                    : 'var(--border-strong)',
                }}
              />
            </div>
            {emailState.touched && !emailState.valid && (
              <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{emailState.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" className="label-xs block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => validatePassword(password)}
                placeholder="••••••••"
                disabled={isLoading}
                className={`${inputBase} pr-10`}
                style={{
                  borderColor: passwordState.touched
                    ? passwordState.valid ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'
                    : 'var(--border-strong)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordState.touched && !passwordState.valid && (
              <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{passwordState.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            style={{ backgroundColor: isLoading ? 'var(--accent-hover)' : 'var(--accent)' }}
            onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = isLoading ? 'var(--accent-hover)' : 'var(--accent)'; }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
          New here?{' '}
          <a href="/register" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
            Create account
          </a>
        </p>
      </div>
    </div>
  );
}
