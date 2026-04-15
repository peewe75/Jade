import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

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
    // onCall non include in whitelist domini custom (Netlify). Abilitiamo CORS
    // esplicitamente per il sito di produzione + dev locale. La function è
    // comunque protetta dal check `request.auth.uid`.
    cors: [
      'https://blondejade.netlify.app',
      'https://theblondes.it',
      /localhost(:\d+)?$/,
    ],
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

    const categoryHint = productCategory ? ` (Category: ${productCategory})` : '';

    // Prompt before IMAGE 1 — identity + scene anchor
    const prompt =
      `### SYSTEM ROLE\n` +
      `You are a high-end AI Virtual Try-On Engine. Your task is to generate ONE ` +
      `photorealistic image of the person from IMAGE 1 wearing the specific ` +
      `garment from IMAGE 2.\n\n` +
      `### IMAGE 1 — IDENTITY AND SCENE ANCHOR\n` +
      `This is the ONLY source for human identity, body structure, and ` +
      `environment.\n` +
      `- HARD IDENTITY LOCK: preserve face (eyes, nose, lips, jawline), skin tone, ` +
      `hair texture and color, body proportions of the person in IMAGE 1. Any ` +
      `deviation or morphing with features from IMAGE 2 is a critical failure.\n` +
      `- POSE & SCENE: keep the exact pose, hand positioning, background, ` +
      `camera angle, framing, and lighting of IMAGE 1 unchanged.\n` +
      `- PERSONAL ACCESSORIES: keep the person's original jewelry, watches, ` +
      `glasses, handbags, and shoes visible in IMAGE 1. They belong to her.\n` +
      `- FRAMING: respect the original crop of IMAGE 1. If IMAGE 1 is waist-up and ` +
      `the garment is full-length, crop the garment naturally at the frame edge. ` +
      `Do not extend the scene or invent body parts that IMAGE 1 does not show.`;

    // Prompt before IMAGE 2 — product extraction + view inference
    const productPrompt =
      `### IMAGE 2 — PRODUCT SOURCE: "${productName}"${categoryHint}\n` +
      `This image provides the garment to be transferred. Nothing else in IMAGE 2 ` +
      `has authority over the output.\n` +
      `- SILENT VIEW CLASSIFICATION: first, internally classify IMAGE 2 as one of ` +
      `{front, back, side, three-quarter, flat-lay, on-model, on-mannequin, ` +
      `detail close-up}. Do not output this classification; use it to guide the ` +
      `reconstruction.\n` +
      `- PRODUCT EXTRACTION: isolate the garment. If a catalog model or mannequin ` +
      `appears in IMAGE 2, treat her/it as invisible. Do NOT copy her face, skin, ` +
      `hair, makeup, body, or pose — only the cloth data (color, pattern, cut, ` +
      `fabric, stitching) belongs to the output.\n` +
      `- VIEW INFERENCE:\n` +
      `  • If IMAGE 2 is BACK or SIDE, reconstruct the missing faces of the ` +
      `garment plausibly for the category (${productCategory || 'garment'}), ` +
      `consistent with the front-facing body of IMAGE 1. Do not rotate the ` +
      `customer to match IMAGE 2.\n` +
      `  • If IMAGE 2 is FLAT-LAY, ON-MANNEQUIN, or DETAIL, render the garment ` +
      `as it would naturally drape on the live body of IMAGE 1, with realistic ` +
      `weight, tension, and folds.\n` +
      `- MATERIAL FIDELITY: reproduce exact color, print scale, pattern placement, ` +
      `textile texture (silk/wool/denim/knit/linen/leather), embroidery, buttons, ` +
      `zippers, seams, belts, ties, straps, slits, hem, neckline, collar, sleeve ` +
      `length. Do not invent variations. Do not substitute a similar-looking item.`;

    // Prompt after IMAGE 2 — transfer rules + negatives + final command
    const finalPrompt =
      `### TRANSFER RULES (STRICT)\n` +
      `1. TOTAL REPLACEMENT: delete ALL original clothing on the person in ` +
      `IMAGE 1 before drawing the product. The garment from IMAGE 2 must be ` +
      `painted from scratch over the body silhouette. Never layer the product on ` +
      `top of existing clothes. Never mix pieces of the original outfit with the ` +
      `product — even if colors or patterns are similar.\n` +
      `2. NO ADDITIONS: do not add any garment, outer layer, or accessory that ` +
      `is not present in IMAGE 2 (no extra trenches, jackets, cardigans, ` +
      `scarves, belts, bags, shoes, tights, socks).\n` +
      `3. PHYSICAL COHERENCE: the garment must show realistic tension, gravity, ` +
      `creases, and folds that match the pose of IMAGE 1.\n` +
      `4. LIGHTING INTEGRATION: apply the lighting direction, shadow softness, ` +
      `and color temperature of IMAGE 1 onto the new garment, including ` +
      `specular highlights and cast shadows on the body.\n` +
      `5. IDENTITY ANCHOR RECONFIRMED: the output face must be pixel-comparable ` +
      `to IMAGE 1. No beauty retouching, no age shift, no expression change, ` +
      `no face-blending with IMAGE 2.\n\n` +
      `### NEGATIVE CONSTRAINTS (DO NOT)\n` +
      `- NO face swap, identity blend, or feature morphing between IMAGE 1 and ` +
      `IMAGE 2.\n` +
      `- NO text, logos, watermarks, size tags, price stickers, or UI overlays.\n` +
      `- NO split screen, before/after collage, grid, or multiple panels.\n` +
      `- NO background change, scene replacement, or extra people.\n` +
      `- NO anatomical distortion, warped hands, duplicated limbs, or blurred ` +
      `body parts.\n` +
      `- NO hair restyle, no makeup change, no skin retouch.\n\n` +
      `### FINAL COMMAND\n` +
      `Generate the single high-resolution photorealistic image: the person ` +
      `from IMAGE 1, in the same pose and scene, wearing ONLY the ` +
      `${productName} from IMAGE 2. Output one image, nothing else.`;

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
                  { type: 'text', text: productPrompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${product.mimeType};base64,${product.base64}`,
                    },
                  },
                  { type: 'text', text: finalPrompt },
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

      // Se l'output è un data URL base64, lo carichiamo su Firebase Storage
      // per evitare di sfondare il limite di 1 MiB per field di Firestore.
      if (imageUrl.startsWith('data:')) {
        const m = imageUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
        if (!m || !m[2]) {
          await jobRef.update({
            status: 'failed',
            error: 'Formato immagine AI non valido.',
            completedAt: FieldValue.serverTimestamp(),
          });
          throw new HttpsError('internal', 'Invalid data URL from model');
        }
        const mimeType = m[1] || 'image/jpeg';
        const ext = mimeType.includes('png')
          ? 'png'
          : mimeType.includes('webp')
          ? 'webp'
          : 'jpg';
        const buffer = Buffer.from(m[2], 'base64');

        const bucket = getStorage().bucket('jade-crm-2026-v2.firebasestorage.app');
        const objectPath = `vto_results/${uid}/${jobId}.${ext}`;
        const file = bucket.file(objectPath);
        await file.save(buffer, {
          contentType: mimeType,
          resumable: false,
          metadata: {
            cacheControl: 'public, max-age=31536000, immutable',
            metadata: { jobId, uid },
          },
        });
        await file.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
        console.log(
          `VTO image uploaded to Storage: ${objectPath} (${buffer.length} bytes)`
        );
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
