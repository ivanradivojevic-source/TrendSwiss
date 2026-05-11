import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { prisma } from '@/src/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, req.headers.get('stripe-signature') || '', webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_details?.email || session.customer_email;

      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items.data.price.product'],
      });
      const lineItems = fullSession.line_items?.data ?? [];
      const itemsList = lineItems
        .map(
          (li) => {
            const prod = li.price?.product;
            const productName =
              typeof prod === 'string'
                ? prod
                : prod && typeof prod === 'object' && 'name' in prod
                  ? String((prod as Stripe.Product).name)
                  : '';
            return `• ${li.description || productName || 'Item'} – ${li.quantity}× ${((li.amount_total ?? 0) / 100).toFixed(2)} CHF`;
          }
        )
        .join('<br>');
      const totalCHF = ((fullSession.amount_total ?? 0) / 100).toFixed(2);
      const addr = session.customer_details?.address;
      const shipping =
        addr && typeof addr === 'object'
          ? [
              addr.line1,
              addr.line2,
              addr.postal_code,
              addr.city,
              addr.country,
            ]
            .filter(Boolean)
            .join(', ')
          : '–';

      const adminEmail = process.env.ADMIN_EMAIL || process.env.ORDER_NOTIFICATION_EMAIL;
      console.log('[Webhook] checkout.session.completed – customer:', email, '| adminEmail:', adminEmail || '(nije setovan)', '| Resend:', resend ? 'da' : 'NE – nema RESEND_API_KEY');

      if (email && resend) {
        const custResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Trend Swiss Shop <onboarding@resend.dev>',
          to: email,
          subject: 'Zahlung erfolgreich – Trend Swiss Shop',
          html: `
            <h1>Vielen Dank für Ihre Bestellung!</h1>
            <p>Ihre Zahlung wurde erfolgreich abgeschlossen.</p>
            <p><strong>Bestellung:</strong><br>${itemsList}</p>
            <p><strong>Gesamt: ${totalCHF} CHF</strong></p>
            <p>Bei Fragen: info@trendswiss.ch</p>
          `,
        });
        if (custResult.error) console.error('[Webhook] Resend kupcu error:', custResult.error);
      }

      if (adminEmail && resend) {
        const adminResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Trend Swiss Shop <onboarding@resend.dev>',
          to: adminEmail,
          subject: `Neue Bestellung – ${totalCHF} CHF – Trend Swiss Shop`,
          html: `
            <h1>Neue Bestellung</h1>
            <p><strong>Kunde:</strong> ${session.customer_details?.name || '–'}<br>
            <strong>E-Mail:</strong> ${email || '–'}</p>
            <p><strong>Lieferadresse:</strong><br>${shipping}</p>
            <p><strong>Bestellung:</strong><br>${itemsList}</p>
            <p><strong>Gesamt: ${totalCHF} CHF</strong></p>
            <p><small>Stripe Session: ${session.id}</small></p>
          `,
        });
        if (adminResult.error) console.error('[Webhook] Resend admin error:', adminResult.error);
      }

      // Persist order + items + inventory movements (best-effort).
      try {
        const currency = String(fullSession.currency || 'chf').toUpperCase();
        const totalAmount = fullSession.amount_total ?? 0;
        const name = session.customer_details?.name || '';
        const [firstName, ...rest] = name.split(' ').filter(Boolean);
        const lastName = rest.join(' ') || null;
        const phone = session.customer_details?.phone || null;

        const orderNumber = `STS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${session.id.slice(-8).toUpperCase()}`;

        await prisma.$transaction(async (tx) => {
          const customer =
            email
              ? await tx.customer.upsert({
                  where: { email },
                  update: { firstName: firstName || null, lastName, phone },
                  create: { email, firstName: firstName || null, lastName, phone },
                })
              : null;

          const order = await tx.order.upsert({
            where: { stripeSessionId: session.id },
            update: {
              customerId: customer?.id ?? null,
              currency,
              totalAmount,
              paymentStatus: 'paid',
              orderStatus: 'new',
              deliveryStatus: 'not_shipped',
              stripePaymentIntentId:
                typeof fullSession.payment_intent === 'string'
                  ? fullSession.payment_intent
                  : fullSession.payment_intent?.id ?? null,
            },
            create: {
              orderNumber,
              customerId: customer?.id ?? null,
              currency,
              totalAmount,
              paymentStatus: 'paid',
              orderStatus: 'new',
              deliveryStatus: 'not_shipped',
              stripeSessionId: session.id,
              stripePaymentIntentId:
                typeof fullSession.payment_intent === 'string'
                  ? fullSession.payment_intent
                  : fullSession.payment_intent?.id ?? null,
            },
          });

          const addr = session.customer_details?.address;
          if (addr && typeof addr === 'object') {
            await tx.shippingAddress.upsert({
              where: { orderId: order.id },
              update: {
                customerId: customer?.id ?? null,
                country: addr.country || null,
                city: addr.city || null,
                postalCode: addr.postal_code || null,
                street: addr.line1 || null,
                number: null,
                note: addr.line2 || null,
              },
              create: {
                orderId: order.id,
                customerId: customer?.id ?? null,
                country: addr.country || null,
                city: addr.city || null,
                postalCode: addr.postal_code || null,
                street: addr.line1 || null,
                number: null,
                note: addr.line2 || null,
              },
            });
          }

          // Replace items on each upsert (idempotent)
          await tx.orderItem.deleteMany({ where: { orderId: order.id } });

          for (const li of lineItems) {
            const prod = li.price?.product;
            const meta =
              prod && typeof prod === 'object' && 'metadata' in prod ? (prod as Stripe.Product).metadata : null;
            const sku = meta?.sku ? String(meta.sku) : null;
            const itemName = li.description || (typeof prod === 'object' ? (prod as Stripe.Product).name : '') || 'Item';

            const unitPrice = li.amount_subtotal && li.quantity ? Math.round(li.amount_subtotal / li.quantity) : 0;
            const totalPrice = li.amount_total ?? unitPrice * (li.quantity ?? 1);
            const quantity = li.quantity ?? 1;

            const variant = sku ? await tx.productVariant.findUnique({ where: { sku } }) : null;

            await tx.orderItem.create({
              data: {
                orderId: order.id,
                variantId: variant?.id ?? null,
                sku,
                name: itemName,
                quantity,
                unitPrice,
                totalPrice,
                currency,
              },
            });

            if (variant && sku && totalPrice >= 0) {
              // Decrement stock
              await tx.productVariant.update({
                where: { id: variant.id },
                data: { stockQuantity: { decrement: quantity } },
              });
              await tx.inventoryMovement.create({
                data: {
                  variantId: variant.id,
                  type: 'sale',
                  quantityChange: -quantity,
                  reason: `Stripe checkout ${session.id}`,
                  relatedOrderId: order.id,
                },
              });
            }
          }
        });
      } catch (e) {
        console.error('[Webhook] DB persist failed:', e);
      }

      console.log('[Webhook] Payment successful – session:', session.id);
      break;
    }
    default:
      console.log('Unhandled event type:', event.type);
  }

  return NextResponse.json({ received: true });
}
