"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchOrderAlert = dispatchOrderAlert;
const firestore_1 = require("firebase-admin/firestore");
async function tryTelegram(cfg, text) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: cfg.chatId, text, parse_mode: 'Markdown' }),
        });
        if (!res.ok) {
            console.error('Telegram send failed:', res.status, await res.text());
        }
        return res.ok;
    }
    catch (err) {
        console.error('Telegram error:', err);
        return false;
    }
}
async function tryResend(cfg, to, subject, html) {
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${cfg.apiKey}`,
            },
            body: JSON.stringify({
                from: 'The Blondes Concept <noreply@theblondes.it>',
                to,
                subject,
                html,
            }),
        });
        if (!res.ok) {
            console.error('Resend admin email failed:', res.status, await res.text());
        }
        return res.ok;
    }
    catch (err) {
        console.error('Resend error:', err);
        return false;
    }
}
async function dispatchOrderAlert(orderId, order, telegramCfg, resendCfg, adminEmails) {
    const db = (0, firestore_1.getFirestore)();
    const { orderNumber, paymentMethod, totals, shippingAddress } = order;
    const amount = `€${((totals?.total ?? 0) / 100).toFixed(2)}`;
    const customer = `${shippingAddress?.firstName ?? ''} ${shippingAddress?.lastName ?? ''}`.trim();
    const city = `${shippingAddress?.city ?? ''}, ${shippingAddress?.country ?? ''}`;
    const email = shippingAddress?.email ?? '';
    // Telegram
    const methodLabel = paymentMethod === 'stripe'
        ? 'Carta'
        : paymentMethod === 'bank'
            ? 'Bonifico'
            : 'Crypto';
    const tgText = [
        `🛍️ *Nuovo ordine* \`${orderNumber}\``,
        `💶 ${amount} · ${methodLabel}`,
        `👤 ${customer}`,
        `📍 ${city}`,
        `✉️ ${email}`,
    ].join('\n');
    const tgOk = telegramCfg.token
        ? await tryTelegram(telegramCfg, tgText)
        : false;
    // Resend admin email
    const emailHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="margin-bottom:4px">Nuovo ordine: ${orderNumber}</h2>
      <p style="color:#666;margin-top:0">${amount} · ${methodLabel}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#999;width:120px">Cliente</td><td>${customer}</td></tr>
        <tr><td style="padding:6px 0;color:#999">Email</td><td>${email}</td></tr>
        <tr><td style="padding:6px 0;color:#999">Città</td><td>${city}</td></tr>
        <tr><td style="padding:6px 0;color:#999">Pagamento</td><td>${methodLabel}</td></tr>
      </table>
      <p style="font-size:12px;color:#999">ID ordine: ${orderId}</p>
    </div>`;
    const emailOk = resendCfg.apiKey
        ? await tryResend(resendCfg, adminEmails, `Nuovo ordine ${orderNumber}`, emailHtml)
        : false;
    await db.collection('notification_log').add({
        orderId,
        orderNumber,
        type: 'order_created',
        channels: {
            telegram: tgOk ? 'sent' : 'failed',
            email: emailOk ? 'sent' : 'failed',
        },
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
