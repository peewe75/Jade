import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const resendKey = defineSecret('RESEND_API_KEY');

const REGION = 'europe-west1';
const CORS_ORIGINS: (string | RegExp)[] = [
  'https://theblondesconcept.netlify.app',
  'https://theblondesconcept.com',
  'https://www.theblondesconcept.com',
  /^https:\/\/.*\.vercel\.app$/,
  /localhost(:\d+)?$/,
];
const ADMIN_EMAILS = [
  'mmalinverno76@gmail.com',
  'peewe75@gmail.com',
  'mmalinverno@gmail.com',
  'avv.sapone@hotmail.it',
  'customerstheblondesconcept@gmail.com',
];

// ---------------------------------------------------------------------------
// submitWithdrawalRequest
//
// Funzione di recesso digitale richiesta dall'art. 54-bis del Codice del
// Consumo (D.Lgs. 206/2005, come modificato dal D.Lgs. 209/2025 in recepimento
// della Direttiva UE 2023/2673), applicabile ai contratti conclusi online a
// decorrere dal 19 giugno 2026.
//
// Riceve la dichiarazione di recesso del consumatore, la registra su supporto
// durevole e invia "senza indebito ritardo" un avviso di ricevimento via email
// contenente il contenuto della dichiarazione e la data/ora di trasmissione.
// ---------------------------------------------------------------------------

interface WithdrawalInput {
  orderId?: string | null;
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  itemsDescription: string;
  orderDate?: string | null;
  deliveryDate?: string | null;
  locale?: 'it' | 'en';
}

interface WithdrawalOutput {
  withdrawalNumber: string;
  receivedAtIso: string;
  receivedAtLabel: string;
}

export const submitWithdrawalRequest = onCall<WithdrawalInput, Promise<WithdrawalOutput>>(
  {
    region: REGION,
    secrets: [resendKey],
    cors: CORS_ORIGINS,
    enforceAppCheck: false,
  },
  async (request) => {
    const db = getFirestore();
    const data = request.data ?? ({} as WithdrawalInput);

    const firstName = (data.firstName ?? '').trim();
    const lastName = (data.lastName ?? '').trim();
    const email = (data.email ?? '').trim();
    const orderNumber = (data.orderNumber ?? '').trim();
    const itemsDescription = (data.itemsDescription ?? '').trim();
    const orderDate = (data.orderDate ?? '').trim();
    const deliveryDate = (data.deliveryDate ?? '').trim();
    const locale: 'it' | 'en' = data.locale === 'en' ? 'en' : 'it';

    // --- Validazione minima ---
    if (!firstName || !lastName) {
      throw new HttpsError('invalid-argument', 'Nome e cognome sono obbligatori.');
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      throw new HttpsError('invalid-argument', 'Indirizzo email non valido.');
    }
    if (!orderNumber) {
      throw new HttpsError('invalid-argument', 'Il numero d\'ordine è obbligatorio.');
    }
    if (!itemsDescription) {
      throw new HttpsError('invalid-argument', 'Indica i beni oggetto del recesso.');
    }

    // --- Numero progressivo della richiesta di recesso ---
    const counterRef = db.collection('config').doc('withdrawalCounter');
    const seq = await db.runTransaction(async (tx) => {
      const snap = await tx.get(counterRef);
      const next = ((snap.data()?.count as number | undefined) ?? 0) + 1;
      tx.set(counterRef, { count: next }, { merge: true });
      return next;
    });
    const year = new Date().getFullYear();
    const withdrawalNumber = `REC-${year}-${String(seq).padStart(4, '0')}`;

    // --- Data e ora di ricezione (fuso Europe/Rome) ---
    const receivedAt = new Date();
    const receivedAtIso = receivedAt.toISOString();
    const receivedAtLabel = receivedAt.toLocaleString('it-IT', {
      timeZone: 'Europe/Rome',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const fullName = `${firstName} ${lastName}`;

    // --- Testo della dichiarazione (Allegato I, Parte B) ---
    const declarationText = buildDeclarationText({
      fullName,
      orderNumber,
      itemsDescription,
      orderDate,
      deliveryDate,
    });

    // --- Verifica facoltativa dell'ordine (per arricchire il record admin) ---
    let matchedOrderId: string | null = data.orderId ?? null;
    let orderUserId: string | null = request.auth?.uid ?? null;
    if (matchedOrderId) {
      try {
        const oSnap = await db.collection('orders').doc(matchedOrderId).get();
        if (oSnap.exists) {
          orderUserId = (oSnap.data()?.userId as string | null) ?? orderUserId;
        } else {
          matchedOrderId = null;
        }
      } catch {
        matchedOrderId = null;
      }
    }

    // --- Registrazione su supporto durevole (Firestore) ---
    const reqRef = db.collection('withdrawal_requests').doc();
    await reqRef.set({
      withdrawalNumber,
      orderId: matchedOrderId,
      orderNumber,
      userId: orderUserId,
      firstName,
      lastName,
      email,
      itemsDescription,
      orderDate: orderDate || null,
      deliveryDate: deliveryDate || null,
      declarationText,
      status: 'received',
      acknowledgmentSent: false,
      receivedAt: Timestamp.fromDate(receivedAt),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // --- Invio avviso di ricevimento su supporto durevole (email) ---
    const rKey = resendKey.value();
    let ackSent = false;
    if (rKey) {
      const resend = new Resend(rKey);
      // 1) Ricevuta al consumatore — requisito di legge
      try {
        const consumerSubject =
          locale === 'en'
            ? `Withdrawal receipt ${withdrawalNumber} – ${orderNumber}`
            : `Ricevuta di recesso ${withdrawalNumber} – ${orderNumber}`;
        await resend.emails.send({
          from: 'The Blondes Concept <ordini@theblondes.it>',
          to: email,
          subject: consumerSubject,
          html: buildConsumerAckEmail({
            firstName,
            withdrawalNumber,
            orderNumber,
            declarationText,
            receivedAtLabel,
            locale,
          }),
        });
        ackSent = true;
      } catch (err: unknown) {
        console.error(
          'Resend error (withdrawal ack):',
          err instanceof Error ? err.message : err
        );
      }

      // 2) Notifica interna al team
      try {
        await resend.emails.send({
          from: 'The Blondes Concept <ordini@theblondes.it>',
          to: ADMIN_EMAILS,
          subject: `Nuova richiesta di recesso ${withdrawalNumber} – ${orderNumber}`,
          html: buildAdminWithdrawalEmail({
            withdrawalNumber,
            orderNumber,
            fullName,
            email,
            itemsDescription,
            orderDate,
            deliveryDate,
            receivedAtLabel,
          }),
        });
      } catch (err: unknown) {
        console.error(
          'Resend error (withdrawal admin):',
          err instanceof Error ? err.message : err
        );
      }
    } else {
      console.warn('RESEND_API_KEY non configurata: avviso di recesso non inviato via email.');
    }

    if (ackSent) {
      await reqRef.update({
        acknowledgmentSent: true,
        acknowledgmentSentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { withdrawalNumber, receivedAtIso, receivedAtLabel };
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDeclarationText(args: {
  fullName: string;
  orderNumber: string;
  itemsDescription: string;
  orderDate: string;
  deliveryDate: string;
}): string {
  const { fullName, orderNumber, itemsDescription, orderDate, deliveryDate } = args;
  const lines = [
    'Con la presente comunico il recesso dal contratto di vendita relativo ai seguenti beni:',
    itemsDescription,
    '',
    `Ordine n.: ${orderNumber}`,
  ];
  if (orderDate) lines.push(`Ordinato il: ${orderDate}`);
  if (deliveryDate) lines.push(`Ricevuto il: ${deliveryDate}`);
  lines.push(`Consumatore: ${fullName}`);
  return lines.join('\n');
}

interface ConsumerAckCopy {
  header: string;
  greeting: (firstName: string) => string;
  confirmationBefore: string;
  confirmationAfter: string;
  referenceLabel: string;
  receivedAtLabel: string;
  declarationHeading: string;
  refundParagraph: string;
  returnParagraph: string;
}

const CONSUMER_ACK_COPY: Record<'it' | 'en', ConsumerAckCopy> = {
  it: {
    header: 'Avviso di ricevimento del recesso',
    greeting: (firstName) => `Ciao ${firstName},`,
    confirmationBefore:
      "Confermiamo di aver ricevuto la tua dichiarazione di recesso relativa all'ordine <strong>",
    confirmationAfter:
      "</strong>. Questo messaggio costituisce avviso di ricevimento su supporto durevole ai sensi dell'art. 54-bis del Codice del Consumo.",
    referenceLabel: 'Riferimento recesso',
    receivedAtLabel: 'Data e ora di ricezione',
    declarationHeading: 'Contenuto della dichiarazione',
    refundParagraph:
      'Provvederemo al rimborso senza indebito ritardo e comunque entro <strong>14 giorni</strong> dal ricevimento di questa comunicazione, con lo stesso mezzo di pagamento da te utilizzato. Il rimborso può essere trattenuto fino al ricevimento dei beni o alla prova della loro spedizione.',
    returnParagraph:
      'Restituisci i beni senza indebito ritardo e comunque entro 14 giorni, integri e con etichette e imballaggi originali. I costi diretti della restituzione sono a tuo carico.',
  },
  en: {
    header: 'Acknowledgement of receipt of withdrawal',
    greeting: (firstName) => `Hi ${firstName},`,
    confirmationBefore:
      'We confirm that we have received your withdrawal declaration relating to order <strong>',
    confirmationAfter:
      '</strong>. This message constitutes an acknowledgement of receipt on a durable medium pursuant to art. 54-bis of the Italian Consumer Code.',
    referenceLabel: 'Withdrawal reference',
    receivedAtLabel: 'Date and time of receipt',
    declarationHeading: 'Content of the declaration',
    refundParagraph:
      'We will issue the refund without undue delay and in any case within <strong>14 days</strong> of receiving this communication, using the same means of payment you used. The refund may be withheld until we receive the goods or proof of their dispatch.',
    returnParagraph:
      'Please return the goods without undue delay and in any case within 14 days, intact and with their original tags and packaging. The direct costs of returning the goods are borne by you.',
  },
};

function buildConsumerAckEmail(args: {
  firstName: string;
  withdrawalNumber: string;
  orderNumber: string;
  declarationText: string;
  receivedAtLabel: string;
  locale: 'it' | 'en';
}): string {
  const { firstName, withdrawalNumber, orderNumber, declarationText, receivedAtLabel, locale } =
    args;
  const t = CONSUMER_ACK_COPY[locale];
  const declarationHtml = declarationText
    .split('\n')
    .map((l) => (l ? l : '&nbsp;'))
    .join('<br>');

  return `
    <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;padding:32px 24px">
      <h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 4px">The Blondes Concept</h1>
      <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 40px">${t.header}</p>
      <p style="font-size:15px;margin:0 0 8px">${t.greeting(firstName)}</p>
      <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 24px">
        ${t.confirmationBefore}${orderNumber}${t.confirmationAfter}
      </p>
      <div style="background:#fafafa;border:1px solid #e8e8e8;padding:24px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
          <tr><td style="padding:6px 0;color:#888;width:170px">${t.referenceLabel}</td><td style="padding:6px 0;font-weight:600;font-family:monospace">${withdrawalNumber}</td></tr>
          <tr><td style="padding:6px 0;color:#888">${t.receivedAtLabel}</td><td style="padding:6px 0;font-weight:600">${receivedAtLabel}</td></tr>
        </table>
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#888;margin:0 0 10px">${t.declarationHeading}</p>
        <p style="font-size:13px;line-height:1.7;color:#444;margin:0;white-space:pre-line">${declarationHtml}</p>
      </div>
      <p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 16px">
        ${t.refundParagraph}
      </p>
      <p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 40px">
        ${t.returnParagraph}
      </p>
      <hr style="border:none;border-top:1px solid #e8e8e8;margin:0 0 20px" />
      <p style="font-size:11px;color:#aaa;text-align:center;margin:0">© ${new Date().getFullYear()} The Blondes Concept · theblondesconcept.com</p>
    </div>
  `;
}

function buildAdminWithdrawalEmail(args: {
  withdrawalNumber: string;
  orderNumber: string;
  fullName: string;
  email: string;
  itemsDescription: string;
  orderDate: string;
  deliveryDate: string;
  receivedAtLabel: string;
}): string {
  const {
    withdrawalNumber,
    orderNumber,
    fullName,
    email,
    itemsDescription,
    orderDate,
    deliveryDate,
    receivedAtLabel,
  } = args;
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="margin-bottom:4px">Richiesta di recesso: ${withdrawalNumber}</h2>
      <p style="color:#666;margin-top:0">Ordine ${orderNumber} · ${receivedAtLabel}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#999;width:140px">Consumatore</td><td>${fullName}</td></tr>
        <tr><td style="padding:6px 0;color:#999">Email</td><td>${email}</td></tr>
        <tr><td style="padding:6px 0;color:#999">Ordine</td><td>${orderNumber}</td></tr>
        ${orderDate ? `<tr><td style="padding:6px 0;color:#999">Ordinato il</td><td>${orderDate}</td></tr>` : ''}
        ${deliveryDate ? `<tr><td style="padding:6px 0;color:#999">Ricevuto il</td><td>${deliveryDate}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#999;vertical-align:top">Beni</td><td>${itemsDescription.replace(/\n/g, '<br>')}</td></tr>
      </table>
      <p style="font-size:12px;color:#c00">Rimborso dovuto entro 14 giorni dal ricevimento (art. 54-bis / artt. 56-57 Cod. Consumo).</p>
    </div>
  `;
}
