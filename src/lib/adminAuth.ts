import crypto from 'node:crypto';

const COOKIE_NAME = 'sts_admin';

function getSecret() {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret) throw new Error('Missing ADMIN_AUTH_SECRET');
  return secret;
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function signAdminSession(payload: { email: string }) {
  const secret = getSecret();
  const issuedAt = Date.now();
  const body = JSON.stringify({ ...payload, iat: issuedAt });
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `${Buffer.from(body).toString('base64url')}.${sig}`;
}

export function verifyAdminSession(token: string | undefined | null): { email: string } | null {
  if (!token) return null;
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return null;

  let body: string;
  try {
    body = Buffer.from(b64, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    // timingSafeEqual throws if buffer lengths differ
    return null;
  }

  try {
    const parsed = JSON.parse(body) as { email?: string; iat?: number };
    if (!parsed.email || !parsed.iat) return null;
    // 30 days
    if (Date.now() - parsed.iat > 30 * 24 * 60 * 60 * 1000) return null;
    return { email: parsed.email };
  } catch {
    return null;
  }
}

