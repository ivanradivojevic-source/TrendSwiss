import { NextResponse } from 'next/server';
import { getAdminCookieName } from '@/src/lib/adminAuth';

export async function POST(req: Request) {
  const name = getAdminCookieName();
  // Clear root cookie (covers both /admin/* and /api/admin/*)
  const res = NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 });
  res.cookies.set(name, '', { path: '/', maxAge: 0 });
  return res;
}

