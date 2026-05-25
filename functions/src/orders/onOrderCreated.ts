import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { dispatchOrderAlert } from '../notifications/dispatch';

const telegramToken = defineSecret('TELEGRAM_BOT_TOKEN');
const telegramChatId = defineSecret('TELEGRAM_CHAT_ID');
const resendKey = defineSecret('RESEND_API_KEY');

const ADMIN_EMAILS = [
  'mmalinverno76@gmail.com',
  'peewe75@gmail.com',
  'mmalinverno@gmail.com',
  'avv.sapone@hotmail.it',
  'customerstheblondesconcept@gmail.com',
];

export const onOrderCreated = onDocumentCreated(
  {
    document: 'orders/{orderId}',
    region: 'europe-west1',
    secrets: [telegramToken, telegramChatId, resendKey],
  },
  async (event) => {
    const order = event.data?.data();
    if (!order) return;

    const orderId = event.params.orderId;

    await dispatchOrderAlert(
      orderId,
      order,
      { token: telegramToken.value(), chatId: telegramChatId.value() },
      { apiKey: resendKey.value() },
      ADMIN_EMAILS
    );
  }
);
