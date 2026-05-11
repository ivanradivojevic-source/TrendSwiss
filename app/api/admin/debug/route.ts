import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminSession } from '@/src/lib/adminAuth';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  const session = verifyAdminSession(token);
  return NextResponse.json({
    cookiePresent: Boolean(token),
    cookieLen: token?.length ?? 0,
    sessionEmail: session?.email ?? null,
  });
}

