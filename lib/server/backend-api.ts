import { NextRequest, NextResponse } from 'next/server';

const API_URL    = process.env.API_URL    ?? 'http://localhost:3001';
const API_SECRET = process.env.API_SECRET ?? '';

/**
 * Authenticate incoming requests to the BFF.
 * Enforces Same-Origin and optional API_ROUTE_AUTH_TOKEN.
 */
export function authenticateCaller(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  if (origin) {
    const requestOrigin  = req.nextUrl.origin;
    const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? '')
      .split(',').map((o) => o.trim()).filter(Boolean);

    const isTrusted = origin === requestOrigin || trustedOrigins.includes(origin);
    if (!isTrusted) {
      return NextResponse.json({ error: 'Forbidden: Invalid Origin' }, { status: 403 });
    }
  }

  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    return NextResponse.json({ error: 'Forbidden: Invalid Sec-Fetch-Site' }, { status: 403 });
  }

  const expectedToken = process.env.API_ROUTE_AUTH_TOKEN;
  if (expectedToken) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return null;
}

interface ForwardOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  query?: URLSearchParams;
  body?: unknown;
  /** Extra headers to pass to the worker (e.g. 'x-user-id'). */
  headers?: Record<string, string>;
  /** Custom AbortSignal timeout in ms. Defaults to 120_000 (120s). */
  timeoutMs?: number;
}

/**
 * Forward a request to the worker Express API with X-Api-Key.
 */
export async function forwardToBackend(opts: ForwardOptions): Promise<NextResponse> {
  const { method, path, query, body, headers: extraHeaders, timeoutMs = 120_000 } = opts;
  const qs  = query ? `?${query.toString()}` : '';
  const url = `${API_URL}${path}${qs}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key':    API_SECRET,
        ...extraHeaders,
      },
      body:   body != null ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });

    const data = await res.text();

    const responseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (method === 'GET' && res.ok) {
      responseHeaders['Cache-Control'] = 'public, max-age=60, stale-while-revalidate=30';
    }

    return new NextResponse(data, { status: res.status, headers: responseHeaders });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
    return NextResponse.json(
      { error: isTimeout ? 'Backend request timed out' : 'Backend unreachable' },
      { status: 502 }
    );
  }
}

export function requireString(value: string | null, name: string): string {
  if (!value || value.trim() === '') throw new Error(`Missing required field: ${name}`);
  return value.trim();
}

interface IntegerOptions { min?: number; max?: number; fallback?: number; }

export function requireInteger(value: string | null, name: string, opts: IntegerOptions = {}): number {
  const { min, max, fallback } = opts;
  if (value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required integer: ${name}`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) throw new Error(`Invalid integer for ${name}: "${value}"`);
  if (min !== undefined && parsed < min) throw new Error(`${name} must be >= ${min}`);
  if (max !== undefined && parsed > max) throw new Error(`${name} must be <= ${max}`);
  return parsed;
}

export function badRequest(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'Bad request';
  return NextResponse.json({ error: message }, { status: 400 });
}
