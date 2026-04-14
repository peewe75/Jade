import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
// Body limit 8mb: abbondantemente sotto il tetto ~6mb di Netlify, ma utile in dev dove non c'è il limite.
// I client sono tenuti a ridimensionare le immagini prima dell'upload.
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ limit: '8mb', extended: true }));

const router = express.Router();

// Netlify sync function: timeout hard = 10s. Lasciamo 1s di margine al wrapping I/O.
const AI_TIMEOUT_MS = 9000;
const EXTERNAL_FETCH_TIMEOUT_MS = 3500;
const VTO_MODEL = "google/gemini-2.5-flash-image";

function isLikelyBase64Image(value: unknown): value is string {
  return typeof value === 'string' && value.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(value.slice(0, 200));
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Risolve l'immagine prodotto in { base64, mimeType } gestendo:
 *   - data URL inline (prodotti caricati dall'admin)
 *   - URL HTTP(S) (picsum, Firebase Storage)
 *   - path relativo
 */
async function resolveProductImage(
  productImageUrl: string,
  reqHeaders: express.Request['headers']
): Promise<{ base64: string; mimeType: string }> {
  if (productImageUrl.startsWith('data:')) {
    const match = productImageUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
    if (!match || !match[2]) {
      throw new Error("data URL prodotto non valido.");
    }
    return { base64: match[2], mimeType: match[1] || 'image/jpeg' };
  }

  let absoluteUrl = productImageUrl;
  if (!/^https?:\/\//i.test(productImageUrl)) {
    const protocol = (reqHeaders['x-forwarded-proto'] as string) || 'https';
    const host = reqHeaders['host'];
    const cleanPath = productImageUrl.startsWith('/') ? productImageUrl.slice(1) : productImageUrl;
    absoluteUrl = `${protocol}://${host}/${cleanPath}`;
  }

  const response = await fetchWithTimeout(absoluteUrl, EXTERNAL_FETCH_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`Impossibile scaricare l'immagine del prodotto (${response.status}).`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    base64: buffer.toString('base64'),
    mimeType: response.headers.get('content-type') || 'image/jpeg',
  };
}

/**
 * Estrae l'URL/dataURL immagine dalla risposta OpenRouter, coprendo tutte le forme note:
 *   (a) choices[0].message.images[0].image_url.url
 *   (b) choices[0].message.images[0].image_url (stringa)
 *   (c) choices[0].message.images[0].url
 *   (d) choices[0].message.images[0] (stringa)
 *   (e) choices[0].message.images[0].b64_json
 *   (f) choices[0].message.content (stringa con URL o base64)
 *   (g) choices[0].message.content[] (array con image_url parts)
 */
function extractImageUrl(data: any): string | undefined {
  const msg = data?.choices?.[0]?.message;
  const firstImage = msg?.images?.[0];

  if (firstImage) {
    if (typeof firstImage === 'string') return firstImage;
    if (typeof firstImage.image_url === 'string') return firstImage.image_url;
    if (typeof firstImage.image_url?.url === 'string') return firstImage.image_url.url;
    if (typeof firstImage.url === 'string') return firstImage.url;
    if (typeof firstImage.b64_json === 'string') {
      return `data:image/jpeg;base64,${firstImage.b64_json}`;
    }
  }

  if (typeof msg?.content === 'string' && msg.content.length > 20) {
    return msg.content;
  }

  if (Array.isArray(msg?.content)) {
    for (const part of msg.content) {
      if (typeof part?.image_url?.url === 'string') return part.image_url.url;
      if (typeof part?.image_url === 'string') return part.image_url;
    }
  }

  return undefined;
}

/**
 * Virtual Try-On single-shot.
 * Invia foto utente + foto prodotto + istruzioni a Gemini 2.5 Flash Image,
 * che genera direttamente una nuova immagine preservando identità utente
 * e fedeltà del prodotto. Un solo endpoint → rientriamo nei 10s Netlify.
 */
router.post('/vto/tryon', async (req, res) => {
  try {
    const {
      userImageBase64,
      userMimeType: userMimeTypeRaw,
      productImageUrl,
      productName,
      productCategory,
    } = (req.body ?? {}) as {
      userImageBase64?: string;
      userMimeType?: string;
      productImageUrl?: string;
      productName?: string;
      productCategory?: string;
    };

    if (!userImageBase64 || !isLikelyBase64Image(userImageBase64)) {
      return res.status(400).json({ error: "Foto utente mancante o non valida." });
    }
    if (!productImageUrl || typeof productImageUrl !== 'string') {
      return res.status(400).json({ error: "Immagine prodotto mancante." });
    }
    if (!productName) {
      return res.status(400).json({ error: "Nome prodotto mancante." });
    }

    const userMimeType = userMimeTypeRaw || 'image/jpeg';
    const product = await resolveProductImage(productImageUrl, req.headers);

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

    const aiController = new AbortController();
    const aiTimer = setTimeout(() => aiController.abort(), AI_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://theblondes.it",
          "X-Title": "The Blondes CRM",
        },
        body: JSON.stringify({
          model: VTO_MODEL,
          modalities: ["image", "text"],
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:${userMimeType};base64,${userImageBase64}` } },
                { type: "image_url", image_url: { url: `data:${product.mimeType};base64,${product.base64}` } },
              ],
            },
          ],
        }),
        signal: aiController.signal,
      });
    } finally {
      clearTimeout(aiTimer);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({} as any));
      console.warn("VTO upstream error:", response.status, errorData);
      return res.status(502).json({
        error: `Generazione fallita. ${errorData.error?.message || response.statusText}`,
      });
    }

    const data = await response.json();
    if (data.error) {
      console.error("OpenRouter VTO error:", data.error);
      return res.status(502).json({
        error: `Il fornitore AI ha restituito un errore: ${data.error.message || "sconosciuto"}.`,
      });
    }

    let imageUrl = extractImageUrl(data);
    if (!imageUrl || imageUrl.length < 10) {
      console.error("VTO empty response:", JSON.stringify(data).slice(0, 2000));
      return res.status(502).json({ error: "Il modello non ha restituito un'immagine valida. Riprova." });
    }

    // Se la risposta è una stringa "grezza" di base64, wrappala in data URL
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      const urlMatch = imageUrl.match(/(https?:\/\/[^\s)]+)/);
      if (urlMatch) {
        imageUrl = urlMatch[1];
      } else if (imageUrl.length > 500) {
        imageUrl = `data:image/jpeg;base64,${imageUrl.replace(/\s/g, '')}`;
      } else {
        return res.status(502).json({ error: "Risposta AI incomprensibile." });
      }
    }

    const modelUsed = data.model || VTO_MODEL;
    console.log(`VTO success, model=${modelUsed}`);
    return res.json({ success: true, imageUrl, modelUsed });
  } catch (error: any) {
    const aborted = error?.name === 'AbortError';
    console.error("VTO Error:", error?.message || error);
    if (!res.headersSent) {
      return res.status(aborted ? 504 : 500).json({
        error: aborted
          ? "Il camerino virtuale ha impiegato troppo tempo. Riprova con una foto più piccola."
          : (error?.message || "Errore durante la generazione."),
      });
    }
  }
});

app.use("/api", router);
app.use("/.netlify/functions/api", router);

export default app;
