"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const resend_1 = require("resend");
const stripeSecret = (0, params_1.defineSecret)('STRIPE_SECRET');
const stripeWebhookSecret = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET');
const resendKey = (0, params_1.defineSecret)('RESEND_API_KEY');
const REGION = 'europe-west1';
exports.stripeWebhook = (0, https_1.onRequest)({
    region: REGION,
    secrets: [stripeSecret, stripeWebhookSecret, resendKey],
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripe = new stripe_1.default(stripeSecret.value(), { apiVersion: '2024-04-10' });
    const sig = req.headers['stripe-signature'];
    // Firebase Functions v2 provides raw body as Buffer on req.rawBody
    const rawBody = req.rawBody;
    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret.value());
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Webhook signature verification failed:', msg);
        res.status(400).send(`Webhook Error: ${msg}`);
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    // Idempotency: skip if already processed
    const paymentRef = db.collection('payments').doc(event.id);
    const existing = await paymentRef.get();
    if (existing.exists) {
        res.json({ received: true, idempotent: true });
        return;
    }
    await paymentRef.set({
        eventId: event.id,
        type: event.type,
        processedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    try {
        if (event.type === 'checkout.session.completed') {
            await handleSessionCompleted(db, event.data.object, resendKey.value());
        }
        else if (event.type === 'checkout.session.expired') {
            await handleSessionExpired(db, event.data.object);
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown handler error';
        console.error('Webhook handler error:', msg);
        await paymentRef.update({ error: msg }).catch(() => { });
        res.status(500).send('Handler error');
        return;
    }
    res.json({ received: true });
});
async function handleShippingPayment(db, session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) {
        console.error('Shipping payment: no orderId in metadata');
        return;
    }
    const orderRef = db.collection('orders').doc(orderId);
    const quoteRef = db.collection('shipping_quotes').doc(orderId);
    await Promise.all([
        orderRef.update({
            shippingStatus: 'ready_to_ship',
            timeline: firestore_1.FieldValue.arrayUnion({ event: 'shipping_paid', at: firestore_1.Timestamp.now() }),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }),
        quoteRef.update({ status: 'paid', paidAt: firestore_1.FieldValue.serverTimestamp() }),
    ]);
    console.log('Shipping payment confirmed for order', orderId);
}
async function handleSessionCompleted(db, session, resendApiKey) {
    // Shipping payment routed separately
    if (session.metadata?.type === 'shipping') {
        await handleShippingPayment(db, session);
        return;
    }
    const orderId = session.metadata?.orderId;
    if (!orderId) {
        console.error('No orderId in session metadata');
        return;
    }
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
        console.error('Order not found:', orderId);
        return;
    }
    const order = orderSnap.data();
    // Atomic: decrement stock + reserved, optionally mark product sold_out
    await db.runTransaction(async (tx) => {
        for (const item of order.items) {
            const productRef = db.collection('products').doc(item.productId);
            const productSnap = await tx.get(productRef);
            if (!productSnap.exists)
                continue;
            const data = productSnap.data();
            const updatedVariants = data.variants.map((v) => v.id === item.variantId
                ? {
                    ...v,
                    stock: Math.max(0, (v.stock ?? 0) - item.qty),
                    reserved: Math.max(0, (v.reserved ?? 0) - item.qty),
                }
                : v);
            const anyAvailable = updatedVariants.some((v) => (v.stock ?? 0) - (v.reserved ?? 0) > 0);
            tx.update(productRef, {
                variants: updatedVariants,
                ...(!anyAvailable ? { status: 'sold_out' } : {}),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        tx.update(orderRef, {
            paymentStatus: 'paid',
            paymentRef: session.payment_intent ?? session.id,
            timeline: firestore_1.FieldValue.arrayUnion({ status: 'paid', at: firestore_1.Timestamp.now() }),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    // Delete holds for this order
    const holdsSnap = await db.collection('holds').where('orderId', '==', orderId).get();
    await Promise.all(holdsSnap.docs.map(d => d.ref.delete()));
    console.log(`Order ${orderId} (${order.orderNumber}) confirmed via Stripe`);
    // Confirmation email via Resend
    const toEmail = order.shippingAddress?.email || order.guestEmail;
    if (toEmail && resendApiKey) {
        try {
            const resend = new resend_1.Resend(resendApiKey);
            const firstName = order.shippingAddress?.firstName ?? 'Cliente';
            await resend.emails.send({
                from: 'The Blondes Concept <ordini@theblondes.it>',
                to: toEmail,
                subject: `Ordine ${order.orderNumber} confermato – The Blondes Concept`,
                html: buildOrderConfirmationEmail(firstName, order),
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Resend error';
            console.error('Resend email error:', msg);
        }
    }
}
async function handleSessionExpired(db, session) {
    const orderId = session.metadata?.orderId;
    if (!orderId)
        return;
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists)
        return;
    const order = orderSnap.data();
    // Release reserved quantities
    await db.runTransaction(async (tx) => {
        for (const item of order.items) {
            const productRef = db.collection('products').doc(item.productId);
            const productSnap = await tx.get(productRef);
            if (!productSnap.exists)
                continue;
            const data = productSnap.data();
            const updatedVariants = data.variants.map((v) => v.id === item.variantId
                ? { ...v, reserved: Math.max(0, (v.reserved ?? 0) - item.qty) }
                : v);
            tx.update(productRef, {
                variants: updatedVariants,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        tx.update(orderRef, {
            paymentStatus: 'expired',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    // Clean up holds
    const holdsSnap = await db.collection('holds').where('orderId', '==', orderId).get();
    await Promise.all(holdsSnap.docs.map(d => d.ref.delete()));
    console.log(`Order ${orderId} expired — reserved quantities released`);
}
function buildOrderConfirmationEmail(firstName, order) {
    const itemRows = order.items
        .map((item) => `<tr>
          <td style="padding:10px 0;font-size:14px">${item.nameSnapshot}${item.sizeLabel ? ` · ${item.sizeLabel}` : ''}</td>
          <td style="padding:10px 0;text-align:right;font-size:14px">€${(item.priceSnapshot / 100).toFixed(2)}</td>
        </tr>`)
        .join('');
    return `
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;padding:32px 24px">
      <h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 4px">The Blondes Concept</h1>
      <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 40px">Conferma ordine</p>
      <p style="font-size:15px;margin:0 0 8px">Ciao ${firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 32px">
        Grazie per il tuo ordine! Il tuo acquisto è stato confermato.
        Riceverai presto una comunicazione con i dettagli della spedizione.
      </p>
      <div style="background:#fafafa;border:1px solid #e8e8e8;padding:24px;margin-bottom:24px">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#888;margin:0 0 20px">
          Ordine <strong style="color:#1a1a1a">${order.orderNumber}</strong>
        </p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #e8e8e8">
          ${itemRows}
          <tr style="border-top:1px solid #e8e8e8">
            <td style="padding:12px 0;font-size:14px;font-weight:600">Totale</td>
            <td style="padding:12px 0;text-align:right;font-size:14px;font-weight:600">
              €${(order.totals.total / 100).toFixed(2)}
            </td>
          </tr>
        </table>
      </div>
      <p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 40px">
        La spedizione sarà organizzata dal nostro team e ti contatteremo con un preventivo personalizzato.
      </p>
      <hr style="border:none;border-top:1px solid #e8e8e8;margin:0 0 20px" />
      <p style="font-size:11px;color:#aaa;text-align:center;margin:0">
        © ${new Date().getFullYear()} The Blondes Concept · theblondes.it
      </p>
    </div>
  `;
}
