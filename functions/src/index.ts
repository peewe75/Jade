import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();

const openrouterKey = defineSecret('OPENROUTER_API_KEY');

const VTO_MODEL = 'google/gemini-2.5-flash-image';
const REGION = 'europe-west1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveProductImage(
  productImageUrl: string
): Promise<{ base64: string; mimeType: string }> {
  // Data URL inline (prodotti caricati dall'admin Inventory)
  if (productImageUrl.startsWith('data:')) {
    const match = productImageUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
    if (!match || !match[2]) throw new Error('data URL prodotto non valido.');
    return { base64: match[2], mimeType: match[1] || 'image/jpeg' };
  }

  // URL HTTP(S)
  const response = await fetch(productImageUrl);
  if (!response.ok) {
    throw new Error(
      `Impossibile scaricare l'immagine del prodotto (${response.status}).`
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    base64: buffer.toString('base64'),
    mimeType: response.headers.get('content-type') || 'image/jpeg',
  };
}

function extractImageUrl(data: any): string | undefined {
  const msg = data?.choices?.[0]?.message;
  const firstImage = msg?.images?.[0];

  if (firstImage) {
    if (typeof firstImage === 'string') return firstImage;
    if (typeof firstImage.image_url === 'string') return firstImage.image_url;
    if (typeof firstImage.image_url?.url === 'string')
      return firstImage.image_url.url;
    if (typeof firstImage.url === 'string') return firstImage.url;
    if (typeof firstImage.b64_json === 'string')
      return `data:image/jpeg;base64,${firstImage.b64_json}`;
  }

  if (typeof msg?.content === 'string' && msg.content.length > 20)
    return msg.content;

  if (Array.isArray(msg?.content)) {
    for (const part of msg.content) {
      if (typeof part?.image_url?.url === 'string') return part.image_url.url;
      if (typeof part?.image_url === 'string') return part.image_url;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Cloud Function
// ---------------------------------------------------------------------------

interface VTOInput {
  jobId: string;
  userImageBase64: string;
  userMimeType?: string;
  productImageUrl: string;
  productName: string;
  productCategory?: string;
}

interface VTOOutput {
  imageUrl: string;
  modelUsed: string;
}

export const vtoTryon = onCall<VTOInput, Promise<VTOOutput>>(
  {
    region: REGION,
    secrets: [openrouterKey],
    memory: '512MiB',
    timeoutSeconds: 300,
    enforceAppCheck: false,
  },
  async (request) => {
    // --- Auth ---
    if (!request.auth?.uid) {
      throw new HttpsError(
        'unauthenticated',
        'Devi essere loggata per usare il camerino virtuale.'
      );
    }
    const uid = request.auth.uid;

    const {
      jobId,
      userImageBase64,
      userMimeType,
      productImageUrl,
      productName,
      productCategory,
    } = request.data;

    if (!jobId || !userImageBase64 || !productImageUrl || !productName) {
      throw new HttpsError('invalid-argument', 'Dati della richiesta mancanti.');
    }

    const db = getFirestore();
    const jobRef = db.collection('vto_jobs').doc(jobId);

    // Verifica che il doc esista e appartenga all'utente
    const snap = await jobRef.get();
    if (!snap.exists || snap.data()?.userId !== uid) {
      throw new HttpsError('permission-denied', 'Job non valido o non autorizzato.');
    }

    const userMime = userMimeType || 'image/jpeg';

    const categoryHint = productCategory ? ` (${productCategory})` : '';
    const prompt =
      `You are a virtual try-on engine. You are given two images:\n` +
      `1. A photo of a person (the customer).\n` +
      `2. A photo of a clothing product called "${productName}"${categoryHint}.\n\n` +
      `Task: produce a single photorealistic image showing the SAME person from image 1 ` +
      `wearing the EXACT garment from image 2.\n\n` +
      `STRICT REQUIREMENTS:\n` +
      `- Preserve the person's face, hair, skin tone, body proportions, and pose from ` +
      `image 1 EXACTLY. Do not change their identity.\n` +
      `- Preserve the garment's exact color, pattern, fabric texture, cut, length, and ` +
      `styling details from image 2. Do not substitute a similar-looking item.\n` +
      `- Keep the original background, lighting, and camera angle of image 1.\n` +
      `- Fit the garment naturally on the body, with realistic drape, shadows, and wrinkles.\n` +
      `- Output a single high-quality photograph. No text, no watermarks, no extra people.`;

    try {
      const product = await resolveProductImage(productImageUrl);

      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openrouterKey.value()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://theblondes.it',
            'X-Title': 'The Blondes CRM',
          },
          body: JSON.stringify({
            model: VTO_MODEL,
            modalities: ['image', 'text'],
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${userMime};base64,${userImageBase64}`,
                    },
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${product.mimeType};base64,${product.base64}`,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as Record<string, any>)) as Record<string, any>;
        const msg =
          errorData?.error?.message || `OpenRouter error ${response.status}`;
        console.error('VTO upstream error:', response.status, errorData);
        await jobRef.update({
          status: 'failed',
          error: `Generazione fallita. ${msg}`,
          completedAt: FieldValue.serverTimestamp(),
        });
        throw new HttpsError('internal', msg);
      }

      const data = await response.json() as Record<string, any>;
      if (data.error) {
        const msg = (data.error as any).message || 'Errore OpenRouter sconosciuto';
        console.error('OpenRouter VTO error:', data.error);
        await jobRef.update({
          status: 'failed',
          error: `Errore AI: ${msg}`,
          completedAt: FieldValue.serverTimestamp(),
        });
        throw new HttpsError('internal', msg);
      }

      let imageUrl = extractImageUrl(data);
      if (!imageUrl || imageUrl.length < 10) {
        console.error(
          'VTO empty response:',
          JSON.stringify(data).slice(0, 2000)
        );
        await jobRef.update({
          status: 'failed',
          error: "Il modello non ha restituito un'immagine valida. Riprova.",
          completedAt: FieldValue.serverTimestamp(),
        });
        throw new HttpsError('internal', 'No image in response');
      }

      // Normalizza URL se necessario
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        const urlMatch = imageUrl.match(/(https?:\/\/[^\s)]+)/);
        if (urlMatch) {
          imageUrl = urlMatch[1];
        } else if (imageUrl.length > 500) {
          imageUrl = `data:image/jpeg;base64,${imageUrl.replace(/\s/g, '')}`;
        } else {
          await jobRef.update({
            status: 'failed',
            error: 'Risposta AI incomprensibile.',
            completedAt: FieldValue.serverTimestamp(),
          });
          throw new HttpsError('internal', 'Unreadable AI response');
        }
      }

      const modelUsed = (data.model as string) || VTO_MODEL;
      console.log(`VTO success jobId=${jobId} model=${modelUsed}`);

      await jobRef.update({
        status: 'completed',
        imageUrl,
        modelUsed,
        completedAt: FieldValue.serverTimestamp(),
      });

      return { imageUrl, modelUsed };
    } catch (err: any) {
      // Se non è già un HttpsError, wrappa e aggiorna Firestore
      if (!(err instanceof HttpsError)) {
        console.error('VTO unexpected error:', err?.message || err);
        await jobRef
          .update({
            status: 'failed',
            error: err?.message || 'Errore durante la generazione.',
            completedAt: FieldValue.serverTimestamp(),
          })
          .catch(() => {});
        throw new HttpsError(
          'internal',
          err?.message || 'Errore durante la generazione.'
        );
      }
      throw err;
    }
  }
);
