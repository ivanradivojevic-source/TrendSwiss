export type ShopPerPage = 20 | 50 | 'all';

export function parseShopPerPage(value: string | undefined): ShopPerPage {
  if (value === '50') return 50;
  if (value === 'all') return 'all';
  return 20;
}

export function parseShopPage(value: string | undefined): number {
  const n = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function paginateProducts<T>(items: T[], perPage: ShopPerPage, page: number) {
  const total = items.length;
  if (perPage === 'all' || total === 0) {
    return {
      items,
      total,
      page: 1,
      totalPages: 1,
      pageSize: total,
      from: total ? 1 : 0,
      to: total,
    };
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const slice = items.slice(start, start + perPage);

  return {
    items: slice,
    total,
    page: safePage,
    totalPages,
    pageSize: perPage,
    from: total ? start + 1 : 0,
    to: start + slice.length,
  };
}
