export const SEARCH_NAV_FLAG = 'trendswiss-search-nav';

export function markSearchNav(): void {
  try {
    sessionStorage.setItem(SEARCH_NAV_FLAG, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Ms to wait before enabling PDP image zoom after search navigation. */
export function searchNavZoomDelayMs(): number {
  try {
    const ts = sessionStorage.getItem(SEARCH_NAV_FLAG);
    if (!ts) return 0;
    const age = Date.now() - Number(ts);
    sessionStorage.removeItem(SEARCH_NAV_FLAG);
    return age < 800 ? 800 - age : 0;
  } catch {
    return 0;
  }
}
