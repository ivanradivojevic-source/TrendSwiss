/**
 * Voucher / coupon codes. Edit here to add or change codes and discounts.
 */
export type VoucherType = 'percent' | 'fixed';

export interface Voucher {
  code: string; // uppercase for comparison
  type: VoucherType;
  value: number; // percent (e.g. 10) or fixed amount in CHF (e.g. 5)
  minOrderCHF?: number; // optional minimum order to apply
}

export const vouchers: Voucher[] = [
  { code: 'WELCOME10', type: 'percent', value: 10, minOrderCHF: 30 },
  { code: 'SWISS20', type: 'percent', value: 20, minOrderCHF: 80 },
  { code: 'CHF5OFF', type: 'fixed', value: 5, minOrderCHF: 25 },
];

export function findVoucher(code: string, subtotalCHF: number): Voucher | null {
  const normalized = code.trim().toUpperCase();
  const v = vouchers.find((x) => x.code === normalized);
  if (!v) return null;
  if (v.minOrderCHF != null && subtotalCHF < v.minOrderCHF) return null;
  return v;
}

export function applyVoucher(voucher: Voucher, subtotalCHF: number): number {
  if (voucher.type === 'percent') {
    return Math.round((subtotalCHF * voucher.value) / 100 * 100) / 100;
  }
  return Math.min(voucher.value, subtotalCHF);
}
