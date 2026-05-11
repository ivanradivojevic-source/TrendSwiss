import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import QRCode from 'qrcode';
import { getAdminCookieName, verifyAdminSession } from '@/src/lib/adminAuth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  const session = verifyAdminSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const value = (url.searchParams.get('value') ?? '').trim();
  if (!value) return NextResponse.json({ error: 'Missing value' }, { status: 400 });
  if (value.length > 300) return NextResponse.json({ error: 'Value too long' }, { status: 400 });

  const png = await QRCode.toBuffer(value, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'no-store',
    },
  });
}

