import Link from 'next/link';

type ShopProductPaginationProps = {
  locale: string;
  baseQuery: string;
  perPage: 20 | 50 | 'all';
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  labels: {
    perPage: string;
    per20: string;
    per50: string;
    perAll: string;
    showing: string;
    prev: string;
    next: string;
    pageOf: string;
  };
};

function hrefWith(locale: string, baseQuery: string, perPage: 20 | 50 | 'all', page: number) {
  const params = new URLSearchParams(baseQuery);
  if (perPage === 20) params.delete('perPage');
  else params.set('perPage', perPage === 'all' ? 'all' : String(perPage));
  if (page <= 1 || perPage === 'all') params.delete('page');
  else params.set('page', String(page));
  const qs = params.toString();
  return `/${locale}/shop${qs ? `?${qs}` : ''}`;
}

export default function ShopProductPagination({
  locale,
  baseQuery,
  perPage,
  page,
  totalPages,
  from,
  to,
  total,
  labels,
}: ShopProductPaginationProps) {
  if (total === 0) return null;

  const perPageBtn = (value: 20 | 50 | 'all', label: string) => {
    const active = perPage === value;
    return (
      <Link
        href={hrefWith(locale, baseQuery, value, 1)}
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          active
            ? 'bg-red-600 text-white shadow-sm'
            : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-red-50'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav
      className="mt-8 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
      aria-label={labels.perPage}
    >
      <p className="text-center text-sm text-neutral-600">{labels.showing}</p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="w-full text-center text-sm font-medium text-neutral-800 sm:w-auto sm:pr-2">
          {labels.perPage}
        </span>
        {perPageBtn(20, labels.per20)}
        {perPageBtn(50, labels.per50)}
        {perPageBtn('all', labels.perAll)}
      </div>

      {perPage !== 'all' && totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {page > 1 ? (
            <Link
              href={hrefWith(locale, baseQuery, perPage, page - 1)}
              className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-200"
            >
              ← {labels.prev}
            </Link>
          ) : (
            <span className="rounded-lg px-4 py-2 text-sm text-neutral-400">← {labels.prev}</span>
          )}
          <span className="text-sm font-medium text-neutral-700">
            {labels.pageOf}
          </span>
          {page < totalPages ? (
            <Link
              href={hrefWith(locale, baseQuery, perPage, page + 1)}
              className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-200"
            >
              {labels.next} →
            </Link>
          ) : (
            <span className="rounded-lg px-4 py-2 text-sm text-neutral-400">{labels.next} →</span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
