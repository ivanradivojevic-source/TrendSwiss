export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  image: string;
  size: string;
  color: string;
  colorHex?: string;
  priceCHF: number;
  quantity: number;
  sku: string;
}

export interface CartState {
  lines: CartLine[];
  voucherCode: string | null;
  discountCHF: number;
}
