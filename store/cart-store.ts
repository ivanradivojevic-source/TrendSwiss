'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/lib/cart-types';

type CartStore = {
  lines: CartLine[];
  voucherCode: string | null;
  discountCHF: number;
  addLine: (line: Omit<CartLine, 'quantity'> | CartLine) => void;
  setQuantity: (index: number, quantity: number) => void;
  removeLine: (index: number) => void;
  setVoucher: (code: string | null, discountCHF: number) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      lines: [],
      voucherCode: null,
      discountCHF: 0,
      addLine: (line) =>
        set((state) => {
          const withQty = 'quantity' in line ? line : { ...line, quantity: 1 };
          const key = (l: CartLine) =>
            `${l.productId}-${l.size}-${l.color}`;
          const existing = state.lines.findIndex(
            (l) => key(l) === key(withQty as CartLine)
          );
          let next = [...state.lines];
          if (existing >= 0) {
            next[existing] = {
              ...next[existing],
              quantity: next[existing].quantity + (withQty as CartLine).quantity,
            };
          } else {
            next.push(withQty as CartLine);
          }
          return { lines: next };
        }),
      setQuantity: (index, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            const next = state.lines.filter((_, i) => i !== index);
            return { lines: next };
          }
          const next = [...state.lines];
          next[index] = { ...next[index], quantity };
          return { lines: next };
        }),
      removeLine: (index) =>
        set((state) => ({
          lines: state.lines.filter((_, i) => i !== index),
        })),
      setVoucher: (voucherCode, discountCHF) =>
        set({ voucherCode, discountCHF }),
      clearCart: () =>
        set({ lines: [], voucherCode: null, discountCHF: 0 }),
    }),
    { name: 'swiss-trend-cart' }
  )
);
