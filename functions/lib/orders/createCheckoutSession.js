"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckoutSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const stripeSecret = (0, params_1.defineSecret)('STRIPE_SECRET');
const siteUrl = (0, params_1.defineString)('SITE_URL', { default: 'https://theblondes.it' });
const REGION = 'europe-west1';
const CORS_ORIGINS = [
    'https://theblondesconcept.netlify.app',
    /localhost(:\d+)?$/,
];
exports.createCheckoutSession = (0, https_1.onCall)({
    region: REGION,
    secrets: [stripeSecret],
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
        const variant = data.variants?.find((v) => v.id === item.variantId);
        if (!variant)
            throw new https_1.HttpsError('not-found', `Variante ${item.variantId} non trovata.`);
        const available = (variant.stock ?? 0) - (variant.reserved ?? 0);
        if (available < item.qty) {
            throw new https_1.HttpsError('resource-exhausted', `Quantità non disponibile per ${data.name}.`);
        }
        const unitPrice = variant.priceOverride ?? data.basePrice ?? Math.round((data.price ?? 0) * 100);
        const name = data.translations?.[locale]?.name ?? data.name ?? 'Prodotto';
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
            const data = freshSnaps[i].data();
            const v = data.variants.find((vv) => vv.id === variantId);
            if (!v || (v.stock - (v.reserved ?? 0)) < qty) {
                throw new https_1.HttpsError('resource-exhausted', 'Quantità non disponibile (aggiornata).');
            }
            const updatedVariants = data.variants.map((vv) => vv.id === variantId ? { ...vv, reserved: (vv.reserved ?? 0) + qty } : vv);
            tx.update(enrichedItems[i].productRef, {
                variants: updatedVariants,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
    });
    // 3. Order number (atomic counter)
    const counterRef = db.collection('config').doc('orderCounter');
    const orderNum = await db.runTransaction(async (tx) => {
        const snap = await tx.get(counterRef);
        const next = (snap.data()?.count ?? 0) + 1;
        tx.set(counterRef, { count: next }, { merge: true });
        return next;
    });
    const orderNumber = `JD-${new Date().getFullYear()}-${String(orderNum).padStart(4, '0')}`;
    // 4. Create order doc
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
        paymentMethod: 'stripe',
        paymentStatus: 'pending',
        shippingAddress,
        shippingStatus: 'pending',
        timeline: [{ status: 'created', at: firestore_1.Timestamp.now() }],
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // 5. Hold docs (TTL 15 min)
    const expiresAt = firestore_1.Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);
    await Promise.all(enrichedItems.map(ei => db.collection('holds').add({
        orderId,
        productId: ei.productId,
        variantId: ei.variantId,
        qty: ei.qty,
        expiresAt,
    })));
    // 6. Stripe Checkout Session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripe = new stripe_1.default(stripeSecret.value(), { apiVersion: '2024-04-10' });
    const base = siteUrl.value();
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        currency: 'eur',
        line_items: enrichedItems.map(ei => ({
            price_data: {
                currency: 'eur',
                product_data: { name: ei.name },
                unit_amount: ei.unitPrice,
            },
            quantity: ei.qty,
        })),
        customer_email: shippingAddress.email || undefined,
        metadata: { orderId, orderNumber },
        // 30 min session, >= hold TTL of 15 min
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
        cancel_url: `${base}/checkout/cancel?orderId=${orderId}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        locale: (locale === 'it' ? 'it' : 'en'),
        payment_intent_data: {
            description: `The Blondes Concept – ${orderNumber}`,
            metadata: { orderId, orderNumber },
        },
    });
    await orderRef.update({
        stripeSessionId: session.id,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { checkoutUrl: session.url, orderId };
});
