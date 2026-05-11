import { prisma } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  const variants = await prisma.productVariant.findMany({
    orderBy: [{ updatedAt: 'desc' }],
    take: 300,
    include: { product: true },
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Inventory</h1>
          <p className="mt-1 text-sm text-neutral-600">Latest 300 variants.</p>
        </div>
        <form action="/api/admin/catalog/sync" method="post">
          <button
            type="submit"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Sync catalog → DB
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">SKU</th>
              <th className="px-4 py-3 text-left font-semibold">Product</th>
              <th className="px-4 py-3 text-left font-semibold">Size</th>
              <th className="px-4 py-3 text-left font-semibold">Color</th>
              <th className="px-4 py-3 text-left font-semibold">Stock</th>
              <th className="px-4 py-3 text-left font-semibold">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {variants.map((v) => (
              <tr key={v.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-mono text-xs text-neutral-800">{v.sku}</td>
                <td className="px-4 py-3 text-neutral-900">{v.product.name}</td>
                <td className="px-4 py-3 text-neutral-700">{v.size || '—'}</td>
                <td className="px-4 py-3 text-neutral-700">{v.color || '—'}</td>
                <td className="px-4 py-3 font-semibold text-neutral-900">{v.stockQuantity}</td>
                <td className="px-4 py-3">
                  <form action="/api/admin/inventory/adjust" method="post" className="flex items-center gap-2">
                    <input type="hidden" name="variantId" value={v.id} />
                    <input
                      name="delta"
                      type="number"
                      className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                      placeholder="+/-"
                      required
                    />
                    <input
                      name="reason"
                      type="text"
                      className="w-56 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                      placeholder="Reason (optional)"
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800"
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {variants.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-neutral-500" colSpan={6}>
                  No variants yet. Click “Sync catalog → DB”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

