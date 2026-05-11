export const dynamic = 'force-dynamic';

export default function AdminQrPage() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">QR generator (vežba)</h1>
      <p className="mt-2 text-sm text-gray-600">
        Unesi vrednost (npr. model) i dobićeš QR kod kao PNG.
      </p>

      <form className="mt-6 space-y-3">
        <label className="block">
          <span className="text-sm font-medium">Vrednost</span>
          <input
            id="qrValue"
            name="value"
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="npr. MODEL-123"
            defaultValue="MODEL-123"
          />
        </label>

        <div className="rounded-md border bg-white p-4">
          <p className="text-sm text-gray-600">Preview:</p>
          <img
            className="mt-3 h-64 w-64 border bg-white object-contain"
            alt="QR preview"
            src="/api/admin/qr/model?value=MODEL-123"
          />
          <p className="mt-3 text-xs text-gray-500">
            Da promeniš preview, izmeni URL ručno ili koristi “Open image in new tab” nakon što
            promeniš vrednost i submituješ formu (forma je samo za lak copy/paste).
          </p>
        </div>
      </form>

      <div className="mt-6 rounded-md border p-4">
        <p className="text-sm font-medium">API</p>
        <p className="mt-1 text-sm">
          <code>/api/admin/qr/model?value=...</code>
        </p>
      </div>
    </div>
  );
}

