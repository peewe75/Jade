/**
 * Netlify Background Function per Virtual Try-On.
 * Il suffisso "-background" abilita automaticamente il timeout esteso (15 min)
 * e fa sì che Netlify risponda 202 Accepted al client immediatamente.
 *
 * Flusso:
 * 1. Client crea doc `vto_jobs/{jobId}` in Firestore con status="pending"
 * 2. Client POST /.netlify/functions/vto-tryon-background (via redirect /api/vto/tryon)
 * 3. Netlify restituisce subito 202 al client
 * 4. Questa function chiama Gemini 2.5 Flash Image e aggiorna il doc Firestore
 *    via REST API usando l'ID token dell'utente
 * 5. Client vede l'aggiornamento via onSnapshot
 */

import type { Handler } from '@netlify/functions';

const VTO_MODEL = "google/gemini-2.5-flash-image";
const EXTERNAL_FETCH_TIMEOUT_MS = 10_000;

type JobFields = {
  status?: 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
  modelUsed?: string;
  completedAt?: string;
};

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveProductImage(
  productImageUrl: string
): Promise<{ base64: string; mimeType: string }> {
  if (productImageUrl.startsWith('data:')) {
    const match = productImageUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
    if (!match || !match[2]) throw new Error("data URL prodotto non valido.");
    return { base64: match[2], mimeType: match[1] || 'image/jpeg' };
  }
  const response = await fetchWithTimeout(productImageUrl, EXTERNAL_FETCH_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`Impossibile scaricare l'immagine del prodotto (${response.status}).`);
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
    if (typeof firstImage.image_url?.url === 'string') return firstImage.image_url.url;
    if (typeof firstImage.url === 'string') return firstImage.url;
    if (typeof firstImage.b64_json === 'string') return `data:image/jpeg;base64,${firstImage.b64_json}`;
  }

  if (typeof msg?.content === 'string' && msg.content.length > 20) return msg.content;

  if (Array.isArray(msg?.content)) {
    for (const part of msg.content) {
      if (typeof part?.image_url?.url === 'string') return part.image_url.url;
      if (typeof part?.image_url === 'string') return part.image_url;
    }
  }
  return undefined;
}

function fieldsToFirestoreDoc(fields: JobFields): { fields: Record<string, any> } {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') out[k] = { stringValue: v };
    else if (typeof v === 'number') out[k] = { integerValue: String(v) };
    else if (typeof v === 'boolean') out[k] = { booleanValue: v };
  }
  return { fields: out };
}

async function updateJob(
  projectId: string,
  jobId: string,
  idToken: string,
  fields: JobFields
): Promise<void> {
  const fieldKeys = Object.keys(fields);
  const updateMask = fieldKeys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/vto_jobs/${jobId}?${updateMask}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fieldsToFirestoreDoc(fields)),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`Firestore update failed (${res.status}):`, text);
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const {
    jobId,
    userId,
    firebaseIdToken,
    firebaseProjectId,
    userImageBase64,
    userMimeType,
    productImageUrl,
    productName,
    productCategory,
  } = body as Record<string, string>;

  // Validazione minima: senza questi non possiamo nemmeno scrivere l'errore in Firestore
  if (!jobId || !userId || !firebaseIdToken || !firebaseProjectId) {
    console.error('VTO BG: missing critical fields', { jobId, userId, hasToken: !!firebaseIdToken, firebaseProjectId });
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const reportFailure = (message: string) =>
    updateJob(firebaseProjectId, jobId, firebaseIdToken, {
      status: 'failed',
      error: message,
      completedAt: new Date().toISOString(),
    }).catch((e) => console.error('Failed to report failure:', e));

  try {
    if (!userImageBase64 || !productImageUrl || !productName) {
      await reportFailure('Dati richiesta incompleti.');
      return { statusCode: 400, body: 'Missing payload' };
    }

    const userMime = userMimeType || 'image/jpeg';
    const product = await resolveProductImage(productImageUrl);

    const categoryHint = productCategory ? ` (${productCategory})` : '';
    const prompt =
      `You are a virtual try-on engine. You are given two images:\n` +
      `1. A photo of a person (the customer).\n` +
      `2. A photo of a clothing product called "${productName}"${categoryHint}.\n\n` +
      `Task: produce a single photorealistic image showing the SAME person from image 1 wearing the EXACT garment from image 2.\n\n` +
      `STRICT REQUIREMENTS:\n` +
      `- Preserve the person's face, hair, skin tone, body proportions, and pose from image 1 EXACTLY. Do not change their identity.\n` +
      `- Preserve the garment's exact color, pattern, fabric texture, cut, length, and styling details from image 2. Do not substitute a similar-looking item.\n` +
      `- Keep the original background, lighting, and camera angle of image 1.\n` +
      `- Fit the garment naturally on the body, with realistic drape, shadows, and wrinkles.\n` +
      `- Output a single high-quality photograph. No text, no watermarks, no extra people.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
              { type: 'image_url', image_url: { url: `data:${userMime};base64,${userImageBase64}` } },
              { type: 'image_url', image_url: { url: `data:${product.mimeType};base64,${product.base64}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({} as any));
      const msg = errorData.error?.message || `OpenRouter ${response.status}`;
      console.warn('VTO BG upstream error:', response.status, errorData);
      await reportFailure(`Generazione fallita. ${msg}`);
      return { statusCode: 202, body: '' };
    }

    const data = await response.json();
    if (data.error) {
      console.error('OpenRouter VTO error:', data.error);
      await reportFailure(`Errore AI: ${data.error.message || 'sconosciuto'}.`);
      return { statusCode: 202, body: '' };
    }

    let imageUrl = extractImageUrl(data);
    if (!imageUrl || imageUrl.length < 10) {
      console.error('VTO BG empty response:', JSON.stringify(data).slice(0, 2000));
      await reportFailure("Il modello non ha restituito un'immagine valida.");
      return { statusCode: 202, body: '' };
    }

    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      const urlMatch = imageUrl.match(/(https?:\/\/[^\s)]+)/);
      if (urlMatch) imageUrl = urlMatch[1];
      else if (imageUrl.length > 500) imageUrl = `data:image/jpeg;base64,${imageUrl.replace(/\s/g, '')}`;
      else {
        await reportFailure('Risposta AI incomprensibile.');
        return { statusCode: 202, body: '' };
      }
    }

    await updateJob(firebaseProjectId, jobId, firebaseIdToken, {
      status: 'completed',
      imageUrl,
      modelUsed: data.model || VTO_MODEL,
      completedAt: new Date().toISOString(),
    });

    console.log(`VTO BG success jobId=${jobId} model=${data.model || VTO_MODEL}`);
    return { statusCode: 202, body: '' };
  } catch (err: any) {
    console.error('VTO BG error:', err?.message || err);
    await reportFailure(err?.message || 'Errore durante la generazione.');
    return { statusCode: 202, body: '' };
  }
};
