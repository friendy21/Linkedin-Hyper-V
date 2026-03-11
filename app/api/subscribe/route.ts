import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:5603';
    const apiToken = process.env.STRAPI_API_TOKEN;

    if (!apiToken) {
      console.error('[Subscribe] STRAPI_API_TOKEN is not configured');
      return NextResponse.json({ error: 'Subscription service unavailable' }, { status: 503 });
    }

    const res = await fetch(`${strapiUrl}/api/regulatethis-subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        data: {
          email: email.trim().toLowerCase(),
          subscriptionStatus: 'subscribed',
          subscriptionMethod: 'Email',
        },
      }),
    });

    if (res.status === 409 || res.status === 422) {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 409 });
    }

    if (!res.ok) {
      console.error(`[Subscribe] Strapi responded with ${res.status}`);
      return NextResponse.json({ error: 'Subscription failed' }, { status: 502 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
