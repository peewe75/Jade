import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import crypto from 'crypto';

const nowPaymentsKey = defineSecret('NOWPAYMENTS_API_KEY');
const nowPaymentsIpnSecret = defineSecret('NOWPAYMENTS_IPN_SECRET');
const resendKey = defineSecret('RESEND_API_KEY');
const siteUrl = defineString('SITE_URL', { default: 'https://theblondes.it' });
const ipnUrl = defineString('NOWPAYMENTS_IPN_URL', { default: '' });

const REGION = 'europe-west1';
const CORS_ORIGINS: (string | RegExp)[] = [
  'https://theblondesconcept.netlify.app',
  /localhost(:\d+)?$/,
];

type DB = ReturnType<typeof getFirestore>;

// ---------------------------------------------------------------------------
// createCryptoPayment
// ---------------------------------------------------------------------------

interface CartItemInput {
  productId: string;
  variantId: string;
  qty: number;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

interface CryptoInput {
  items: CartItemInput[];
  shippingAddress: ShippingAddress;
  locale: 'it' | 'en';
}

interface CryptoOutput {
  orderId: string;
  orderNumber: string;
  paymentUrl: string;
}

export const createCryptoPayment = onCall<CryptoInput, Promise<CryptoOutput>>(
  {
    region: REGION,
    secrets: [nowPaymentsKey, resendKey],
    cors: CORS_ORIGINS,
    enforceAppCheck: false,
  },
  async (request) => {
    const db = getFirestore();
    const { items, shippingAddress, locale } = request.data;

    if (!items?.length) throw new HttpsError('invalid-argument', 'Carrello vuoto.');
    if (!shippingAddress?.email) throw new HttpsError('invalid-argument', 'Email richiesta.');

    // 1. Server-side reprice + availability check
    const productSnaps = await Promise.all(
      items.map(item => db.collection('products').doc(item.productId).get())
    );

    const enrichedItems = items.map((item, i) => {
      const snap = productSnaps[i];
      if (!snap.exists) throw new HttpsError('not-found', `Prodotto ${item.productId} non trovato.`);
      const data = snap.data()!;
      const variant = (data.variants as any[] | undefined)?.find((v: any) => v.id === item.variantId);
      if (!variant) throw new HttpsError('not-found', `Variante ${item.variantId} non trovata.`);
      const available = (variant.stock ?? 0) - (variant.reserved ?? 0);
      if (available < item.qty) {
        throw new HttpsError('resource-exhausted', `Quantità non disponibile per ${data.name as string}.`);
      }
      const unitPrice: number =
        variant.priceOverride ?? data.basePrice ?? Math.round(((data.price as number) ?? 0) * 100);
      const name: string =
        (data.translations as any)?.[locale]?.name ?? (data.name as string) ?? 'Prodotto';
      return {
        ...item,
        productRef: snap.ref,
        data,
        variant,
        unitPrice,
        name,
        imageSnapshot: (data.images as string[] | undefined)?.[0] ?? '',
      };
    });

    // 2. Atomic reserve all variants
    await db.runTransaction(async tx => {
      const freshSnaps = await Promise.all(enrichedItems.map(ei => tx.get(ei.productRef)));
      for (let i = 0; i < enrichedItems.length; i++) {
        const { variantId, qty } = enrichedItems[i];
        const data = freshSnaps[i].data()!;
        const v = (data.variants as any[]).find((vv: any) => vv.id === variantId);
        if (!v || (v.stock - (v.reserved ?? 0)) < qty) {
          throw new HttpsError('resource-exhausted', 'Quantità non disponibile (aggiornata).');
        }
        const updatedVariants = (data.variants as any[]).map((vv: any) =>
          vv.id === variantId ? { ...vv, reserved: (vv.reserved ?? 0) + qty } : vv
        );
        tx.update(enrichedItems[i].productRef, {
          variants: updatedVariants,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    // 3. Order number
    const counterRef = db.collection('config').doc('orderCounter');
    const orderNum = await db.runTransaction(async tx => {
      const snap = await tx.get(counterRef);
      const next = ((snap.data()?.count as number | undefined) ?? 0) + 1;
      tx.set(counterRef, { count: next }, { merge: true });
      return next;
    });
    const orderNumber = `JD-${new Date().getFullYear()}-${String(orderNum).padStart(4, '0')}`;

    // 4. Create order doc (without payment URL yet)
    const userId = request.auth?.uid ?? null;
    const orderRef = db.collection('orders').doc();
    const orderId = orderRef.id;
    const totalCents = enrichedItems.reduce((s, ei) => s + ei.unitPrice * ei.qty, 0);

    const orderItems = enrichedItems.map(ei => ({
      productId: ei.productId,
      variantId: ei.variantId,
      qty: ei.qty,
      priceSnapshot: ei.unitPrice,
      nameSnapshot: ei.name,
      imageSnapshot: ei.imageSnapshot,
      sizeLabel: ei.variant.size ?? null,
      colorLabel: ei.variant.color ?? null,
    }));

    await orderRef.set({
      orderNumber,
      userId,
      guestEmail: userId ? null : shippingAddress.email,
      items: orderItems,
      totals: { subtotal: totalCents, shipping: 0, total: totalCents },
      currency: 'EUR',
      locale,
      paymentMethod: 'crypto',
      paymentStatus: 'awaiting_payment',
      cryptoStatus: 'waiting',
      shippingAddress,
      shippingStatus: 'pending',
      timeline: [{ status: 'awaiting_payment', at: Timestamp.now() }],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 5. Hold docs (TTL 1 hour for crypto — blockchain confirmations)
    const expiresAt = Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);
    await Promise.all(
      enrichedItems.map(ei =>
        db.collection('holds').add({
          orderId,
          productId: ei.productId,
          variantId: ei.variantId,
          qty: ei.qty,
          expiresAt,
        })
      )
    );

    // 6. Create NOWPayments invoice
    const base = siteUrl.value();
    const nowBody = {
      price_amount: totalCents / 100, // EUR float, not cents
      price_currency: 'eur',
      order_id: orderId,
      order_description: `The Blondes Concept – ${orderNumber}`,
      ipn_callback_url: ipnUrl.value() || undefined,
      success_url: `${base}/checkout/pending?orderId=${orderId}`,
      cancel_url: `${base}/checkout/cancel?orderId=${orderId}`,
    };

    const nowRes = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': nowPaymentsKey.value(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nowBody),
    });

    if (!nowRes.ok) {
      const errText = await nowRes.text().catch(() => String(nowRes.status));
      console.error('NOWPayments invoice error:', nowRes.status, errText);
      // Roll back reserve
      await db.runTransaction(async tx => {
        for (const ei of enrichedItems) {
          const snap = await tx.get(ei.productRef);
          if (!snap.exists) continue;
          const data = snap.data()!;
          const updatedVariants = (data.variants as any[]).map((vv: any) =>
            vv.id === ei.variantId
              ? { ...vv, reserved: Math.max(0, (vv.reserved ?? 0) - ei.qty) }
              : vv
          );
          tx.update(ei.productRef, { variants: updatedVariants, updatedAt: FieldValue.serverTimestamp() });
        }
        tx.delete(orderRef);
      });
      throw new HttpsError('internal', 'Errore nella creazione del pagamento crypto.');
    }

    const nowData = await nowRes.json() as Record<string, unknown>;
    const paymentUrl = nowData.invoice_url as string;
    const cryptoInvoiceId = String(nowData.id ?? '');

    // 7. Update order with payment URL
    await orderRef.update({
      cryptoPaymentUrl: paymentUrl,
      cryptoInvoiceId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { orderId, orderNumber, paymentUrl };
  }
);

// ---------------------------------------------------------------------------
// nowPaymentsWebhook
// ---------------------------------------------------------------------------

function sortObjectKeys(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

export const nowPaymentsWebhook = onRequest(
  {
    region: REGION,
    secrets: [nowPaymentsIpnSecret, resendKey],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const db = getFirestore();
    const body = req.body as Record<string, unknown>;

    // HMAC-SHA512 verification
    const sig = req.headers['x-nowpayments-sig'] as string | undefined;
    if (!sig) {
      res.status(400).send('Missing signature');
      return;
    }
    const sortedBody = JSON.stringify(sortObjectKeys(body));
    const expectedSig = crypto
      .createHmac('sha512', nowPaymentsIpnSecret.value())
      .update(sortedBody)
      .digest('hex');
    if (expectedSig !== sig) {
      console.error('NOWPayments IPN signature mismatch');
      res.status(400).send('Invalid signature');
      return;
    }

    const paymentId = String(body.payment_id ?? '');
    const paymentStatus = String(body.payment_status ?? '');
    const orderId = String(body.order_id ?? '');

    if (!paymentId || !orderId) {
      res.status(400).send('Missing required fields');
      return;
    }

    // Idempotency
    const idemRef = db.collection('payments').doc(`nowpayments-${paymentId}-${paymentStatus}`);
    const existing = await idemRef.get();
    if (existing.exists) {
      res.json({ received: true, idempotent: true });
      return;
    }
    await idemRef.set({
      paymentId,
      paymentStatus,
      orderId,
      processedAt: FieldValue.serverTimestamp(),
    });

    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      console.error('Order not found for crypto IPN:', orderId);
      res.json({ received: true });
      return;
    }
    const order = orderSnap.data()!;

    // Update crypto status for all intermediate statuses
    await orderRef.update({
      cryptoStatus: paymentStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Fully confirm on 'confirmed' or 'finished'
    if (paymentStatus === 'confirmed' || paymentStatus === 'finished') {
      if (order.paymentStatus === 'paid') {
        // Already processed
        res.json({ received: true });
        return;
      }

      await confirmCryptoOrder(db, orderRef, order, paymentId, paymentStatus);

      // Send confirmation email
      const rKey = resendKey.value();
      const toEmail = (order.shippingAddress as any)?.email || (order.guestEmail as string | null);
      if (rKey && toEmail) {
        try {
          const resend = new Resend(rKey);
          await resend.emails.send({
            from: 'The Blondes Concept <ordini@theblondes.it>',
            to: toEmail as string,
            subject: `Pagamento crypto confermato – Ordine ${order.orderNumber as string}`,
            html: buildCryptoConfirmedEmail(
              (order.shippingAddress as any)?.firstName ?? 'Cliente',
              order,
              String(body.pay_currency ?? '')
            ),
          });
        } catch (err: unknown) {
          console.error('Resend error (crypto confirm):', err instanceof Error ? err.message : err);
        }
      }

      console.log(`Crypto order ${orderId} (${order.orderNumber as string}) confirmed — status: ${paymentStatus}`);
    } else if (paymentStatus === 'expired' || paymentStatus === 'failed') {
      // Release reserved quantities
      await releaseReserved(db, orderRef, order, paymentStatus);
      console.log(`Crypto order ${orderId} ${paymentStatus} — reserved released`);
    }

    res.json({ received: true });
  }
);

async function confirmCryptoOrder(
  db: DB,
  orderRef: FirebaseFirestore.DocumentReference,
  order: FirebaseFirestore.DocumentData,
  paymentId: string,
  paymentStatus: string
): Promise<void> {
  await db.runTransaction(async tx => {
    for (const item of order.items as any[]) {
      const productRef = db.collection('products').doc(item.productId as string);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists) continue;
      const data = productSnap.data()!;
      const updatedVariants = (data.variants as any[]).map((v: any) =>
        v.id === item.variantId
          ? {
              ...v,
              stock: Math.max(0, (v.stock ?? 0) - (item.qty as number)),
              reserved: Math.max(0, (v.reserved ?? 0) - (item.qty as number)),
            }
          : v
      );
      const anyAvailable = updatedVariants.some(
        (v: any) => (v.stock ?? 0) - (v.reserved ?? 0) > 0
      );
      tx.update(productRef, {
        variants: updatedVariants,
        ...(!anyAvailable ? { status: 'sold_out' } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.update(orderRef, {
      paymentStatus: 'paid',
      paymentRef: paymentId,
      cryptoStatus: paymentStatus,
      timeline: FieldValue.arrayUnion({ status: 'paid', at: Timestamp.now() }),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  // Clean up holds
  const holdsSnap = await db
    .collection('holds')
    .where('orderId', '==', orderRef.id)
    .get();
  await Promise.all(holdsSnap.docs.map(d => d.ref.delete()));
}

async function releaseReserved(
  db: DB,
  orderRef: FirebaseFirestore.DocumentReference,
  order: FirebaseFirestore.DocumentData,
  status: string
): Promise<void> {
  await db.runTransaction(async tx => {
    for (const item of order.items as any[]) {
      const productRef = db.collection('products').doc(item.productId as string);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists) continue;
      const data = productSnap.data()!;
      const updatedVariants = (data.variants as any[]).map((v: any) =>
        v.id === item.variantId
          ? { ...v, reserved: Math.max(0, (v.reserved ?? 0) - (item.qty as number)) }
          : v
      );
      tx.update(productRef, { variants: updatedVariants, updatedAt: FieldValue.serverTimestamp() });
    }
    tx.update(orderRef, {
      paymentStatus: status,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  const holdsSnap = await db
    .collection('holds')
    .where('orderId', '==', orderRef.id)
    .get();
  await Promise.all(holdsSnap.docs.map(d => d.ref.delete()));
}

function buildCryptoConfirmedEmail(firstName: string, order: any, payCurrency: string): string {
  const itemRows = (order.items as any[])
    .map(
      (item: any) =>
        `<tr>
          <td style="padding:10px 0;font-size:14px">${item.nameSnapshot as string}${item.sizeLabel ? ` · ${item.sizeLabel as string}` : ''}</td>
          <td style="padding:10px 0;text-align:right;font-size:14px">€${((item.priceSnapshot as number) / 100).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;padding:32px 24px">
      <h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 4px">The Blondes Concept</h1>
      <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 40px">Pagamento crypto confermato</p>
      <p style="font-size:15px;margin:0 0 8px">Ciao ${firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 32px">
        Il tuo pagamento${payCurrency ? ` in ${payCurrency.toUpperCase()}` : ''} è stato confermato per l'ordine <strong>${order.orderNumber as string}</strong>.
      </p>
      <div style="background:#fafafa;border:1px solid #e8e8e8;padding:24px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #e8e8e8">
          ${itemRows}
          <tr style="border-top:1px solid #e8e8e8">
            <td style="padding:12px 0;font-size:14px;font-weight:600">Totale</td>
            <td style="padding:12px 0;text-align:right;font-size:14px;font-weight:600">€${((order.totals.total as number) / 100).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      <p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 40px">La spedizione sarà organizzata dal nostro team.</p>
      <hr style="border:none;border-top:1px solid #e8e8e8;margin:0 0 20px" />
      <p style="font-size:11px;color:#aaa;text-align:center;margin:0">© ${new Date().getFullYear()} The Blondes Concept · theblondes.it</p>
    </div>
  `;
}
