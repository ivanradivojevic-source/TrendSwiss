import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminSession } from '@/src/lib/adminAuth';

export default async function AdminLoginPage() {
  const token = (await cookies()).get(getAdminCookieName())?.value;
  if (verifyAdminSession(token)) redirect('/admin/orders');

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-neutral-900">Admin login</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Unesi admin email i lozinku (podešeno u server env).
      </p>

      <form action="/admin/login/submit" method="post" className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}

