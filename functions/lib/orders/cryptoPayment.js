"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowPaymentsWebhook = exports.createCryptoPayment = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const resend_1 = require("resend");
const crypto_1 = __importDefault(require("crypto"));
const _variantHelpers_1 = require("./_variantHelpers");
const nowPaymentsKey = (0, params_1.defineSecret)('NOWPAYMENTS_API_KEY');
const nowPaymentsIpnSecret = (0, params_1.defineSecret)('NOWPAYMENTS_IPN_SECRET');
const resendKey = (0, params_1.defineSecret)('RESEND_API_KEY');
const siteUrl = (0, params_1.defineString)('SITE_URL', { default: 'https://theblondes.it' });
const ipnUrl = (0, params_1.defineString)('NOWPAYMENTS_IPN_URL', { default: '' });
const REGION = 'europe-west1';
const CORS_ORIGINS = [
    'https://theblondesconcept.netlify.app',
    'https://theblondesconcept.com',
    'https://www.theblondesconcept.com',
    /^https:\/\/.*\.vercel\.app$/,
    /localhost(:\d+)?$/,
];
exports.createCryptoPayment = (0, https_1.onCall)({
    region: REGION,
    secrets: [nowPaymentsKey, resendKey],
    cors: CORS_ORIGINS,
    enforceAppCheck: false,
}, async (request) => {
    const db = (0, firestore_1.getFirestore)();
    const { items, shippingAddress, locale } = request.data;
    if (!items?.length)
        throw new https_1.HttpsError('invalid-argument', 'Carrello vuoto.');
    if (!shippingAddress?.email)
        throw new https_1.HttpsError('invalid-argument', 'Email richiesta.');
    // 1. Server-side reprice + availability check
    const productSnaps = await Promise.all(items.map(item => db.collection('products').doc(item.productId).get()));
    const enrichedItems = items.map((item, i) => {
        const snap = productSnaps[i];
        if (!snap.exists)
            throw new https_1.HttpsError('not-found', `Prodotto ${item.productId} non trovato.`);
        const data = snap.data();
        const name = data.translations?.[locale]?.name ?? data.name ?? 'Prodotto';
        const variant = (0, _variantHelpers_1.resolveVariant)(data, item.variantId, item.qty, name);
        const unitPrice = variant.priceOverride ?? data.basePrice ?? Math.round((data.price ?? 0) * 100);
        return {
            ...item,
            productRef: snap.ref,
            data,
            variant,
            unitPrice,
            name,
            imageSnapshot: data.images?.[0] ?? '',
        };
    });
    // 2. Atomic reserve all variants
    await db.runTransaction(async (tx) => {
        const freshSnaps = await Promise.all(enrichedItems.map(ei => tx.get(ei.productRef)));
        for (let i = 0; i < enrichedItems.length; i++) {
            const { variantId, qty } = enrichedItems[i];
            (0, _variantHelpers_1.reserveVariantInTx)(tx, enrichedItems[i].productRef, freshSnaps[i].data(), variantId, qty);
        }
    });
    // 3. Order number
    const counterRef = db.collection('config').doc('orderCounter');
    const orderNum = await db.runTransaction(async (tx) => {
        const snap = await tx.get(counterRef);
        const next = (snap.data()?.count ?? 0) + 1;
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
        timeline: [{ status: 'awaiting_payment', at: firestore_1.Timestamp.now() }],
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // 5. Hold docs (TTL 1 hour for crypto — blockchain confirmations)
    const expiresAt = firestore_1.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);
    await Promise.all(enrichedItems.map(ei => db.collection('holds').add({
        orderId,
        productId: ei.productId,
        variantId: ei.variantId,
        qty: ei.qty,
        expiresAt,
    })));
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
        await db.runTransaction(async (tx) => {
            for (const ei of enrichedItems) {
                const snap = await tx.get(ei.productRef);
                if (!snap.exists)
                    continue;
                const data = snap.data();
                const updatedVariants = data.variants.map((vv) => vv.id === ei.variantId
                    ? { ...vv, reserved: Math.max(0, (vv.reserved ?? 0) - ei.qty) }
                    : vv);
                tx.update(ei.productRef, { variants: updatedVariants, updatedAt: firestore_1.FieldValue.serverTimestamp() });
            }
            tx.delete(orderRef);
        });
        throw new https_1.HttpsError('internal', 'Errore nella creazione del pagamento crypto.');
    }
    const nowData = await nowRes.json();
    const paymentUrl = nowData.invoice_url;
    const cryptoInvoiceId = String(nowData.id ?? '');
    // 7. Update order with payment URL
    await orderRef.update({
        cryptoPaymentUrl: paymentUrl,
        cryptoInvoiceId,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { orderId, orderNumber, paymentUrl };
});
// ---------------------------------------------------------------------------
// nowPaymentsWebhook
// ---------------------------------------------------------------------------
function sortObjectKeys(obj) {
    if (typeof obj !== 'object' || obj === null)
        return obj;
    if (Array.isArray(obj))
        return obj.map(sortObjectKeys);
    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
        sorted[key] = sortObjectKeys(obj[key]);
    }
    return sorted;
}
exports.nowPaymentsWebhook = (0, https_1.onRequest)({
    region: REGION,
    secrets: [nowPaymentsIpnSecret, resendKey],
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    const body = req.body;
    // HMAC-SHA512 verification
    const sig = req.headers['x-nowpayments-sig'];
    if (!sig) {
        res.status(400).send('Missing signature');
        return;
    }
    const sortedBody = JSON.stringify(sortObjectKeys(body));
    const expectedSig = crypto_1.default
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
        processedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
        console.error('Order not found for crypto IPN:', orderId);
        res.json({ received: true });
        return;
    }
    const order = orderSnap.data();
    // Update crypto status for all intermediate statuses
    await orderRef.update({
        cryptoStatus: paymentStatus,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
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
        const toEmail = order.shippingAddress?.email || order.guestEmail;
        if (rKey && toEmail) {
            try {
                const resend = new resend_1.Resend(rKey);
                await resend.emails.send({
                    from: 'The Blondes Concept <ordini@theblondes.it>',
                    to: toEmail,
                    subject: `Pagamento crypto confermato – Ordine ${order.orderNumber}`,
                    html: buildCryptoConfirmedEmail(order.shippingAddress?.firstName ?? 'Cliente', order, String(body.pay_currency ?? '')),
                });
            }
            catch (err) {
                console.error('Resend error (crypto confirm):', err instanceof Error ? err.message : err);
            }
        }
        console.log(`Crypto order ${orderId} (${order.orderNumber}) confirmed — status: ${paymentStatus}`);
    }
    else if (paymentStatus === 'expired' || paymentStatus === 'failed') {
        // Release reserved quantities
        await releaseReserved(db, orderRef, order, paymentStatus);
        console.log(`Crypto order ${orderId} ${paymentStatus} — reserved released`);
    }
    res.json({ received: true });
});
async function confirmCryptoOrder(db, orderRef, order, paymentId, paymentStatus) {
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
            paymentRef: paymentId,
            cryptoStatus: paymentStatus,
            timeline: firestore_1.FieldValue.arrayUnion({ status: 'paid', at: firestore_1.Timestamp.now() }),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    // Clean up holds
    const holdsSnap = await db
        .collection('holds')
        .where('orderId', '==', orderRef.id)
        .get();
    await Promise.all(holdsSnap.docs.map(d => d.ref.delete()));
}
async function releaseReserved(db, orderRef, order, status) {
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
            tx.update(productRef, { variants: updatedVariants, updatedAt: firestore_1.FieldValue.serverTimestamp() });
        }
        tx.update(orderRef, {
            paymentStatus: status,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    const holdsSnap = await db
        .collection('holds')
        .where('orderId', '==', orderRef.id)
        .get();
    await Promise.all(holdsSnap.docs.map(d => d.ref.delete()));
}
function buildCryptoConfirmedEmail(firstName, order, payCurrency) {
    const itemRows = order.items
        .map((item) => `<tr>
          <td style="padding:10px 0;font-size:14px">${item.nameSnapshot}${item.sizeLabel ? ` · ${item.sizeLabel}` : ''}</td>
          <td style="padding:10px 0;text-align:right;font-size:14px">€${(item.priceSnapshot / 100).toFixed(2)}</td>
        </tr>`)
        .join('');
    return `
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;padding:32px 24px">
      <h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 4px">The Blondes Concept</h1>
      <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 40px">Pagamento crypto confermato</p>
      <p style="font-size:15px;margin:0 0 8px">Ciao ${firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 32px">
        Il tuo pagamento${payCurrency ? ` in ${payCurrency.toUpperCase()}` : ''} è stato confermato per l'ordine <strong>${order.orderNumber}</strong>.
      </p>
      <div style="background:#fafafa;border:1px solid #e8e8e8;padding:24px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #e8e8e8">
          ${itemRows}
          <tr style="border-top:1px solid #e8e8e8">
            <td style="padding:12px 0;font-size:14px;font-weight:600">Totale</td>
            <td style="padding:12px 0;text-align:right;font-size:14px;font-weight:600">€${(order.totals.total / 100).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      <p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 40px">La spedizione sarà organizzata dal nostro team.</p>
      <hr style="border:none;border-top:1px solid #e8e8e8;margin:0 0 20px" />
      <p style="font-size:11px;color:#aaa;text-align:center;margin:0">© ${new Date().getFullYear()} The Blondes Concept · theblondes.it</p>
    </div>
  `;
}
