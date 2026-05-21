import { NextResponse } from 'next/server';
import type { Locale } from '@/data/products';
import searchIndexData from '@/data/product-search-index.json';
import {
  searchProductIndex,
  type ProductSearchIndexEntry,
} from '@/src/lib/productSearchClient';

const LOCALES = new Set(['de', 'fr', 'en', 'it']);
const searchIndex = searchIndexData as ProductSearchIndexEntry[];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const localeParam = searchParams.get('locale') ?? 'de';
  const locale = (LOCALES.has(localeParam) ? localeParam : 'de') as Locale;
  const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit')) || 8));

  if (q.trim().length < 1) {
    return NextResponse.json({ hits: [] });
  }

  const hits = searchProductIndex(q, searchIndex, locale, limit);
  return NextResponse.json(
    { hits },
    { headers: { 'Cache-Control': 'public, max-age=60' } }
  );
}
