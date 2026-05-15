"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onOrderCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const dispatch_1 = require("../notifications/dispatch");
const telegramToken = (0, params_1.defineSecret)('TELEGRAM_BOT_TOKEN');
const telegramChatId = (0, params_1.defineSecret)('TELEGRAM_CHAT_ID');
const resendKey = (0, params_1.defineSecret)('RESEND_API_KEY');
const ADMIN_EMAILS = [
    'mmalinverno76@gmail.com',
    'peewe75@gmail.com',
    'mmalinverno@gmail.com',
    'avv.sapone@hotmail.it',
];
exports.onOrderCreated = (0, firestore_1.onDocumentCreated)({
    document: 'orders/{orderId}',
    region: 'europe-west1',
    secrets: [telegramToken, telegramChatId, resendKey],
}, async (event) => {
    const order = event.data?.data();
    if (!order)
        return;
    const orderId = event.params.orderId;
    await (0, dispatch_1.dispatchOrderAlert)(orderId, order, { token: telegramToken.value(), chatId: telegramChatId.value() }, { apiKey: resendKey.value() }, ADMIN_EMAILS);
});
