import { NextResponse } from 'next/server';
import { getAdminCookieName, signAdminSession } from '@/src/lib/adminAuth';

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');

  const expectedEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const expectedPassword = (process.env.ADMIN_PASSWORD || '').trim();

  if (!expectedEmail || !expectedPassword) {
    return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 500 });
  }

  if (email !== expectedEmail || password !== expectedPassword) {
    return NextResponse.redirect(new URL('/admin/login?error=1', req.url));
  }

  const token = signAdminSession({ email });
  // Use a single root-path cookie so it is sent to both `/admin/*` and `/api/admin/*`.
  // Also clear any legacy `/admin`-scoped cookie to avoid path conflicts.
  const base = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60,
  };
  // Use 303 after POST so browser switches to GET.
  const res = NextResponse.redirect(new URL('/admin/orders', req.url), { status: 303 });
  console.log('[admin.login.submit] setting cookie for', email);
  res.cookies.set(getAdminCookieName(), token, { ...base, path: '/' });
  return res;
}

