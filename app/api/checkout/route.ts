import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
  try {
    const { lines, discountCHF = 0, voucherCode, locale = 'de' } = await req.json();
    if (!lines?.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const subtotalCents = lines.reduce(
      (sum: number, l: { priceCHF: number; quantity: number }) =>
        sum + Math.round(l.priceCHF * 100) * l.quantity,
      0
    );
    const discountCents = Math.round(discountCHF * 100);
    const totalCents = Math.max(0, subtotalCents - discountCents);
    if (totalCents === 0) {
      return NextResponse.json({ error: 'Invalid total' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      shipping_address_collection: { allowed_countries: ['CH'] },
      line_items: [
        ...lines.map(
          (l: { name: string; image: string; priceCHF: number; quantity: number; sku?: string; size?: string; color?: string; productId?: string }) => ({
            price_data: {
              currency: 'chf',
              product_data: {
                name: l.name,
                images: l.image.startsWith('http') ? [l.image] : [origin + l.image],
                metadata: {
                  sku: l.sku || '',
                  productId: l.productId || '',
                  size: l.size || '',
                  color: l.color || '',
                },
              },
              unit_amount: Math.round(l.priceCHF * 100),
            },
            quantity: l.quantity,
          })
        ),
        ...(discountCents > 0
          ? [
              {
                price_data: {
                  currency: 'chf',
                  product_data: {
                    name: `Rabatt${voucherCode ? ` (${voucherCode})` : ''}`,
                  },
                  unit_amount: -discountCents,
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      success_url: `${origin}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}

