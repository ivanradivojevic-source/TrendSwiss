import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

type OrderRow = Prisma.OrderGetPayload<{
  include: { customer: true; shippingAddress: true; items: true };
}>;

function formatCHF(cents: number) {
  return `${(cents / 100).toFixed(2)} CHF`;
}

export default async function AdminOrdersPage() {
  const orders: OrderRow[] = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      customer: true,
      shippingAddress: true,
      items: { take: 50 },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Orders</h1>
      <p className="mt-1 text-sm text-neutral-600">Latest 200 orders.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Order</th>
              <th className="px-4 py-3 text-left font-semibold">Customer</th>
              <th className="px-4 py-3 text-left font-semibold">Total</th>
              <th className="px-4 py-3 text-left font-semibold">Payment</th>
              <th className="px-4 py-3 text-left font-semibold">Order status</th>
              <th className="px-4 py-3 text-left font-semibold">Delivery</th>
              <th className="px-4 py-3 text-left font-semibold">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-neutral-900">{o.orderNumber}</td>
                <td className="px-4 py-3 text-neutral-700">
                  <div>{o.customer?.email || '—'}</div>
                  <div className="text-xs text-neutral-500">{o.customer?.phone || ''}</div>
                </td>
                <td className="px-4 py-3 text-neutral-900">{formatCHF(o.totalAmount)}</td>
                <td className="px-4 py-3 text-neutral-700">{o.paymentStatus}</td>
                <td className="px-4 py-3 text-neutral-700">{o.orderStatus}</td>
                <td className="px-4 py-3 text-neutral-700">{o.deliveryStatus}</td>
                <td className="px-4 py-3 text-neutral-700">{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-neutral-500" colSpan={7}>
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

