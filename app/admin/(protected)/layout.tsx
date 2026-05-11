import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminCookieName, verifyAdminSession } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(getAdminCookieName())?.value;
  const session = verifyAdminSession(token);
  console.log('[admin.protected.layout] cookiePresent=', Boolean(token), 'cookieLen=', token?.length ?? 0, 'session=', session?.email ?? null);
  if (!session) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/orders" className="font-bold text-neutral-900">
              Admin
            </Link>
            <nav className="text-sm text-neutral-700">
              <Link className="mr-4 hover:text-neutral-900" href="/admin/orders">
                Orders
              </Link>
              <Link className="hover:text-neutral-900" href="/admin/inventory">
                Inventory
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-neutral-500">{session.email}</div>
            <form action="/admin/logout" method="post">
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

