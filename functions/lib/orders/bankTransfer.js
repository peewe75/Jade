"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminConfirmBankTransfer = exports.createBankTransferOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const resend_1 = require("resend");
const _variantHelpers_1 = require("./_variantHelpers");
const resendKey = (0, params_1.defineSecret)('RESEND_API_KEY');
const REGION = 'europe-west1';
const CORS_ORIGINS = [
    'https://theblondesconcept.netlify.app',
    /localhost(:\d+)?$/,
];
const ADMIN_EMAILS = [
    'mmalinverno76@gmail.com',
    'peewe75@gmail.com',
    'mmalinverno@gmail.com',
    'avv.sapone@hotmail.it',
];
exports.createBankTransferOrder = (0, https_1.onCall)({
    region: REGION,
    secrets: [resendKey],
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
    // 4. Load bank details from Firestore config
    const bankSnap = await db.collection('config').doc('bankDetails').get();
    const bankDetails = bankSnap.exists
        ? bankSnap.data()
        : {
            iban: 'DA CONFIGURARE',
            beneficiary: 'The Blondes Concept',
        };
    // 5. Create order doc
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
        paymentMethod: 'bank',
        paymentStatus: 'awaiting_payment',
        bankDetails,
        shippingAddress,
        shippingStatus: 'pending',
        timeline: [{ status: 'awaiting_payment', at: firestore_1.Timestamp.now() }],
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // 6. Hold docs (TTL extended to 5 days for bank transfer)
    const expiresAt = firestore_1.Timestamp.fromMillis(Date.now() + 5 * 24 * 60 * 60 * 1000);
    await Promise.all(enrichedItems.map(ei => db.collection('holds').add({
        orderId,
        productId: ei.productId,
        variantId: ei.variantId,
        qty: ei.qty,
        expiresAt,
    })));
    // 7. Email: order received, awaiting payment
    const rKey = resendKey.value();
    if (rKey) {
        try {
            const resend = new resend_1.Resend(rKey);
            const firstName = shippingAddress.firstName;
            await resend.emails.send({
                from: 'The Blondes Concept <ordini@theblondes.it>',
                to: shippingAddress.email,
                subject: `Ordine ${orderNumber} ricevuto – in attesa di bonifico`,
                html: buildBankPendingEmail(firstName, orderNumber, totalCents, bankDetails),
            });
        }
        catch (err) {
            console.error('Resend error (bank pending):', err instanceof Error ? err.message : err);
        }
    }
    return { orderId, orderNumber, totalCents, bankDetails };
});
exports.adminConfirmBankTransfer = (0, https_1.onCall)({
    region: REGION,
    secrets: [resendKey],
    cors: CORS_ORIGINS,
    enforceAppCheck: false,
}, async (request) => {
    // Admin-only
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    const callerEmail = (request.auth.token.email ?? '').toLowerCase();
    if (!ADMIN_EMAILS.includes(callerEmail)) {
        throw new https_1.HttpsError('permission-denied', 'Accesso riservato agli amministratori.');
    }
    const db = (0, firestore_1.getFirestore)();
    const { orderId } = request.data;
    if (!orderId)
        throw new https_1.HttpsError('invalid-argument', 'orderId mancante.');
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists)
        throw new https_1.HttpsError('not-found', 'Ordine non trovato.');
    const order = orderSnap.data();
    if (order.paymentStatus === 'paid') {
        throw new https_1.HttpsError('already-exists', 'Ordine già confermato.');
    }
    // Atomic: decrement stock + reserved, auto sold_out if needed
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
            paymentRef: `bank-manual-${Date.now()}`,
            timeline: firestore_1.FieldValue.arrayUnion({ status: 'paid', at: firestore_1.Timestamp.now() }),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    // Delete holds
    const holdsSnap = await db.collection('holds').where('orderId', '==', orderId).get();
    await Promise.all(holdsSnap.docs.map(d => d.ref.delete()));
    console.log(`Bank transfer confirmed for order ${orderId} (${order.orderNumber}) by ${callerEmail}`);
    // Confirmation email
    const rKey = resendKey.value();
    const toEmail = order.shippingAddress?.email || order.guestEmail;
    if (rKey && toEmail) {
        try {
            const resend = new resend_1.Resend(rKey);
            await resend.emails.send({
                from: 'The Blondes Concept <ordini@theblondes.it>',
                to: toEmail,
                subject: `Pagamento confermato – Ordine ${order.orderNumber}`,
                html: buildBankConfirmedEmail(order.shippingAddress?.firstName ?? 'Cliente', order),
            });
        }
        catch (err) {
            console.error('Resend error (bank confirm):', err instanceof Error ? err.message : err);
        }
    }
    return { success: true };
});
// ---------------------------------------------------------------------------
// Email helpers
// ---------------------------------------------------------------------------
function buildBankPendingEmail(firstName, orderNumber, totalCents, bank) {
    return `
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;padding:32px 24px">
      <h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 4px">The Blondes Concept</h1>
      <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 40px">Ordine ricevuto</p>
      <p style="font-size:15px;margin:0 0 8px">Ciao ${firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 32px">
        Abbiamo ricevuto il tuo ordine <strong>${orderNumber}</strong>.<br>
        Per completare l'acquisto, effettua un bonifico bancario con i dati qui sotto.
      </p>
      <div style="background:#fafafa;border:1px solid #e8e8e8;padding:24px;margin-bottom:24px">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#888;margin:0 0 16px">Dati per il bonifico</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#888;width:130px">Beneficiario</td><td style="padding:6px 0;font-weight:600">${bank.beneficiary}</td></tr>
          <tr><td style="padding:6px 0;color:#888">IBAN</td><td style="padding:6px 0;font-weight:600;font-family:monospace">${bank.iban}</td></tr>
          ${bank.bic ? `<tr><td style="padding:6px 0;color:#888">BIC/SWIFT</td><td style="padding:6px 0;font-weight:600">${bank.bic}</td></tr>` : ''}
          <tr style="border-top:1px solid #e8e8e8"><td style="padding:10px 0;color:#888">Causale</td><td style="padding:10px 0;font-weight:700;color:#c00">${orderNumber}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Importo</td><td style="padding:6px 0;font-weight:700">€${(totalCents / 100).toFixed(2)}</td></tr>
        </table>
      </div>
      <p style="font-size:13px;color:#c00;background:#fff5f5;border:1px solid #fcc;padding:12px 16px;margin:0 0 24px">
        ⚠️ Inserisci <strong>${orderNumber}</strong> nella causale del bonifico. Senza causale non potremo abbinare il pagamento.
      </p>
      <p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 40px">
        L'ordine sarà confermato entro 1–3 giorni lavorativi dal ricevimento del pagamento.
      </p>
      <hr style="border:none;border-top:1px solid #e8e8e8;margin:0 0 20px" />
      <p style="font-size:11px;color:#aaa;text-align:center;margin:0">© ${new Date().getFullYear()} The Blondes Concept · theblondes.it</p>
    </div>
  `;
}
function buildBankConfirmedEmail(firstName, order) {
    const itemRows = order.items
        .map((item) => `<tr>
          <td style="padding:10px 0;font-size:14px">${item.nameSnapshot}${item.sizeLabel ? ` · ${item.sizeLabel}` : ''}</td>
          <td style="padding:10px 0;text-align:right;font-size:14px">€${(item.priceSnapshot / 100).toFixed(2)}</td>
        </tr>`)
        .join('');
    return `
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;padding:32px 24px">
      <h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 4px">The Blondes Concept</h1>
      <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 40px">Pagamento confermato</p>
      <p style="font-size:15px;margin:0 0 8px">Ciao ${firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 32px">
        Abbiamo ricevuto il bonifico per l'ordine <strong>${order.orderNumber}</strong>. Il tuo acquisto è confermato!
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
      <p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 40px">
        La spedizione sarà organizzata dal nostro team e riceverai una comunicazione con i dettagli.
      </p>
      <hr style="border:none;border-top:1px solid #e8e8e8;margin:0 0 20px" />
      <p style="font-size:11px;color:#aaa;text-align:center;margin:0">© ${new Date().getFullYear()} The Blondes Concept · theblondes.it</p>
    </div>
  `;
}
