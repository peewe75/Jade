"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminConfirmShipping = exports.adminQuoteShipping = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const resend_1 = require("resend");
const stripeSecret = (0, params_1.defineSecret)('STRIPE_SECRET');
const resendKey = (0, params_1.defineSecret)('RESEND_API_KEY');
const siteUrl = (0, params_1.defineString)('SITE_URL');
const ADMIN_EMAILS = [
    'mmalinverno76@gmail.com',
    'peewe75@gmail.com',
    'mmalinverno@gmail.com',
    'avv.sapone@hotmail.it',
    'customerstheblondesconcept@gmail.com',
];
const REGION = 'europe-west1';
const CORS_ORIGINS = [
    'https://theblondesconcept.netlify.app',
    /localhost(:\d+)?$/,
];
function isAdmin(email) {
    return !!email && ADMIN_EMAILS.includes(email);
}
exports.adminQuoteShipping = (0, https_1.onCall)({
    region: REGION,
    cors: CORS_ORIGINS,
    secrets: [stripeSecret, resendKey],
    enforceAppCheck: false,
}, async (request) => {
    if (!isAdmin(request.auth?.token?.email)) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const { orderId, courier, costCents, eta } = request.data;
    if (!orderId || !courier || !eta || costCents == null || costCents < 0) {
        throw new https_1.HttpsError('invalid-argument', 'Parametri mancanti o non validi');
    }
    const db = (0, firestore_1.getFirestore)();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists)
        throw new https_1.HttpsError('not-found', 'Ordine non trovato');
    const order = orderSnap.data();
    const customerEmail = order.shippingAddress?.email ?? order.guestEmail ?? '';
    const orderNumber = order.orderNumber;
    const firstName = order.shippingAddress?.firstName ?? 'Cliente';
    let paymentLinkUrl = null;
    let paymentLinkId = null;
    const free = costCents === 0;
    if (!free) {
        const stripe = new stripe_1.default(stripeSecret.value(), {
            apiVersion: '2024-04-10',
        });
        const price = await stripe.prices.create({
            currency: 'eur',
            unit_amount: costCents,
            product_data: { name: `Spedizione ordine ${orderNumber}` },
        });
        const link = await stripe.paymentLinks.create({
            line_items: [{ price: price.id, quantity: 1 }],
            metadata: { orderId, type: 'shipping' },
            after_completion: {
                type: 'redirect',
                redirect: { url: `${siteUrl.value()}/account?tab=orders` },
            },
        });
        paymentLinkUrl = link.url;
        paymentLinkId = link.id;
    }
    const newShippingStatus = free ? 'ready_to_ship' : 'awaiting_payment';
    const timelineEvent = {
        event: 'shipping_quoted',
        note: `${courier} · €${(costCents / 100).toFixed(2)} · ${eta}`,
        at: firestore_1.Timestamp.now(),
    };
    // Write quote doc + update order
    const quoteRef = db.collection('shipping_quotes').doc(orderId);
    await Promise.all([
        quoteRef.set({
            orderId,
            orderNumber,
            courier,
            costCents,
            eta,
            paymentLinkUrl,
            paymentLinkId,
            status: free ? 'free' : 'quoted',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        }),
        orderRef.update({
            shippingStatus: newShippingStatus,
            shippingCourier: courier,
            shippingEta: eta,
            ...(paymentLinkUrl ? { shippingPaymentLinkUrl: paymentLinkUrl } : {}),
            'totals.shippingCost': costCents,
            timeline: firestore_1.FieldValue.arrayUnion(timelineEvent),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }),
    ]);
    // Email to customer
    if (customerEmail && resendKey.value()) {
        try {
            const resend = new resend_1.Resend(resendKey.value());
            const subject = `Informazioni di spedizione — ${orderNumber}`;
            const html = free
                ? buildFreeShippingEmail(firstName, orderNumber, courier, eta)
                : buildShippingQuoteEmail(firstName, orderNumber, courier, costCents, eta, paymentLinkUrl);
            await resend.emails.send({
                from: 'The Blondes Concept <ordini@theblondes.it>',
                to: customerEmail,
                subject,
                html,
            });
        }
        catch (err) {
            console.error('Resend shipping email error:', err);
        }
    }
    return { paymentLinkUrl };
});
exports.adminConfirmShipping = (0, https_1.onCall)({
    region: REGION,
    cors: CORS_ORIGINS,
    secrets: [resendKey],
    enforceAppCheck: false,
}, async (request) => {
    if (!isAdmin(request.auth?.token?.email)) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const { orderId, trackingNumber, carrier } = request.data;
    if (!orderId || !trackingNumber) {
        throw new https_1.HttpsError('invalid-argument', 'orderId e trackingNumber obbligatori');
    }
    const db = (0, firestore_1.getFirestore)();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists)
        throw new https_1.HttpsError('not-found', 'Ordine non trovato');
    const order = orderSnap.data();
    const timelineEvent = {
        event: 'shipped',
        note: `${carrier ? carrier + ' · ' : ''}tracking: ${trackingNumber}`,
        at: firestore_1.Timestamp.now(),
    };
    await orderRef.update({
        shippingStatus: 'shipped',
        shippingTracking: trackingNumber,
        ...(carrier ? { shippingCourier: carrier } : {}),
        timeline: firestore_1.FieldValue.arrayUnion(timelineEvent),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // Tracking email to customer
    const customerEmail = order.shippingAddress?.email ?? order.guestEmail ?? '';
    const firstName = order.shippingAddress?.firstName ?? 'Cliente';
    const orderNumber = order.orderNumber;
    if (customerEmail && resendKey.value()) {
        try {
            const resend = new resend_1.Resend(resendKey.value());
            await resend.emails.send({
                from: 'The Blondes Concept <ordini@theblondes.it>',
                to: customerEmail,
                subject: `Il tuo ordine ${orderNumber} è partito!`,
                html: buildShippedEmail(firstName, orderNumber, trackingNumber, carrier),
            });
        }
        catch (err) {
            console.error('Resend tracking email error:', err);
        }
    }
    return { success: true };
});
// ─── Email templates ─────────────────────────────────────────────────────────
function buildShippingQuoteEmail(firstName, orderNumber, courier, costCents, eta, paymentLinkUrl) {
    return `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h1 style="font-size:24px;font-weight:normal;margin-bottom:4px">The Blondes Concept</h1>
  <div style="width:40px;height:1px;background:#1a1a1a;margin-bottom:32px"></div>
  <p>Cara ${firstName},</p>
  <p>Il tuo ordine <strong>${orderNumber}</strong> è pronto per la spedizione.</p>
  <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
    <tr><td style="padding:8px 0;color:#666;width:140px">Corriere</td><td>${courier}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Tempi stimati</td><td>${eta}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Costo spedizione</td><td><strong>€${(costCents / 100).toFixed(2)}</strong></td></tr>
  </table>
  <p>Per completare la spedizione, paga il costo tramite il link sicuro:</p>
  <p style="margin:28px 0">
    <a href="${paymentLinkUrl}" style="background:#1a1a1a;color:#fff;padding:14px 32px;text-decoration:none;text-transform:uppercase;letter-spacing:2px;font-size:11px;font-family:sans-serif">
      Paga spedizione
    </a>
  </p>
  <p style="font-size:12px;color:#999">Il link è sicuro e gestito da Stripe.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="font-size:12px;color:#999">The Blondes Concept · ordini@theblondes.it</p>
</div>`;
}
function buildFreeShippingEmail(firstName, orderNumber, courier, eta) {
    return `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h1 style="font-size:24px;font-weight:normal;margin-bottom:4px">The Blondes Concept</h1>
  <div style="width:40px;height:1px;background:#1a1a1a;margin-bottom:32px"></div>
  <p>Cara ${firstName},</p>
  <p>Ottima notizia! Il tuo ordine <strong>${orderNumber}</strong> verrà spedito gratuitamente.</p>
  <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
    <tr><td style="padding:8px 0;color:#666;width:140px">Corriere</td><td>${courier}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Tempi stimati</td><td>${eta}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Costo spedizione</td><td><strong>Gratuita</strong></td></tr>
  </table>
  <p>Riceverai un'email con il numero di tracking non appena il pacco sarà affidato al corriere.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="font-size:12px;color:#999">The Blondes Concept · ordini@theblondes.it</p>
</div>`;
}
function buildShippedEmail(firstName, orderNumber, trackingNumber, carrier) {
    return `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h1 style="font-size:24px;font-weight:normal;margin-bottom:4px">The Blondes Concept</h1>
  <div style="width:40px;height:1px;background:#1a1a1a;margin-bottom:32px"></div>
  <p>Cara ${firstName},</p>
  <p>Il tuo ordine <strong>${orderNumber}</strong> è partito! 🎉</p>
  <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
    ${carrier ? `<tr><td style="padding:8px 0;color:#666;width:140px">Corriere</td><td>${carrier}</td></tr>` : ''}
    <tr><td style="padding:8px 0;color:#666">Numero tracking</td><td><strong style="font-family:monospace;font-size:16px">${trackingNumber}</strong></td></tr>
  </table>
  <p>Usa il numero di tracking sul sito del corriere per seguire la spedizione in tempo reale.</p>
  <p>Grazie per aver scelto The Blondes Concept.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="font-size:12px;color:#999">The Blondes Concept · ordini@theblondes.it</p>
</div>`;
}
