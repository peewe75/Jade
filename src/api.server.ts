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

// Netlify sync function: timeout hard = 10s. Lasciamo 2s di margine al wrapping I/O.
const ANALYZE_AI_TIMEOUT_MS = 8000;
const GENERATE_AI_TIMEOUT_MS = 8000;
const EXTERNAL_FETCH_TIMEOUT_MS = 4000;

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
 * STEP 1: Analyze images to create a descriptive prompt.
 * Accetta JSON: { userImageBase64, userMimeType, productImageUrl, productName, productCategory }
 * Niente multipart/multer: in serverless (Netlify) multer è fragile e spesso causa 400.
 */
router.post('/vto/analyze', async (req, res) => {
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
      return res.status(400).json({ error: "URL immagine prodotto mancante." });
    }
    if (!productName) {
      return res.status(400).json({ error: "Nome prodotto mancante." });
    }

    const userMimeType = userMimeTypeRaw || 'image/jpeg';

    // Il productImageUrl può essere:
    //  (a) un data URL inline (i prodotti caricati dall'admin sono salvati così in Firestore)
    //  (b) un URL HTTPS (es. picsum, Firebase Storage)
    //  (c) un path relativo (raro)
    let productBase64: string;
    let productMimeType: string;

    if (productImageUrl.startsWith('data:')) {
      // Data URL: parsa inline senza fare fetch
      const match = productImageUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
      if (!match) {
        return res.status(400).json({ error: "data URL prodotto non valido." });
      }
      productMimeType = match[1] || 'image/jpeg';
      productBase64 = match[2] || '';
      if (!productBase64) {
        return res.status(400).json({ error: "Immagine prodotto vuota." });
      }
    } else {
      let absoluteProductUrl = productImageUrl;
      if (!/^https?:\/\//i.test(productImageUrl)) {
        const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
        const host = req.headers['host'];
        const cleanPath = productImageUrl.startsWith('/') ? productImageUrl.slice(1) : productImageUrl;
        absoluteProductUrl = `${protocol}://${host}/${cleanPath}`;
      }
      console.log(`VTO Analyze: fetching product image from ${absoluteProductUrl.slice(0, 120)}`);

      const productResponse = await fetchWithTimeout(absoluteProductUrl, EXTERNAL_FETCH_TIMEOUT_MS);
      if (!productResponse.ok) {
        return res.status(502).json({
          error: `Impossibile scaricare l'immagine del prodotto (${productResponse.status}).`,
        });
      }
      const productBuffer = Buffer.from(await productResponse.arrayBuffer());
      productMimeType = productResponse.headers.get('content-type') || 'image/jpeg';
      productBase64 = productBuffer.toString('base64');
    }

    console.log(`VTO Analyze: starting Gemini 2.0 Flash...`);

    const aiController = new AbortController();
    const aiTimer = setTimeout(() => aiController.abort(), ANALYZE_AI_TIMEOUT_MS);

    let analysisResponse: Response;
    try {
      analysisResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://theblondes.it",
          "X-Title": "The Blondes CRM",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are an AI fashion stylist. Analyze these two images:
1. A photo of a person.
2. A product photo of a "${productName}"${productCategory ? ` (${productCategory})` : ''}.

Task: Create a highly detailed image generation prompt (in English) to show this person wearing the product. Focus on fit, posture, lighting, fabric drape. Output ONLY the prompt string.`,
                },
                { type: "image_url", image_url: { url: `data:${userMimeType};base64,${userImageBase64}` } },
                { type: "image_url", image_url: { url: `data:${productMimeType};base64,${productBase64}` } },
              ],
            },
          ],
        }),
        signal: aiController.signal,
      });
    } finally {
      clearTimeout(aiTimer);
    }

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text().catch(() => '');
      console.error("Analysis API Error:", analysisResponse.status, errorText);
      return res.status(502).json({
        error: `Errore durante l'analisi visiva (${analysisResponse.status}). Riprova con una foto più piccola.`,
      });
    }

    const analyzeData = await analysisResponse.json();
    if (analyzeData.error) {
      console.error("OpenRouter Analyze Error:", analyzeData.error);
      return res.status(502).json({
        error: `Errore AI: ${analyzeData.error.message || "Risorsa non disponibile"}`,
      });
    }

    const imagenPrompt = analyzeData.choices?.[0]?.message?.content?.trim() || "";
    if (!imagenPrompt || imagenPrompt.length < 5) {
      return res.status(502).json({
        error: "L'AI non ha generato un prompt valido. Prova con una foto diversa.",
      });
    }

    return res.json({ success: true, imagenPrompt });
  } catch (error: any) {
    const aborted = error?.name === 'AbortError';
    console.error("VTO Analyze Error:", error?.message || error);
    return res.status(aborted ? 504 : 500).json({
      error: aborted
        ? "L'analisi ha impiegato troppo tempo. Riprova con una foto più piccola."
        : (error?.message || "Errore durante l'analisi delle foto."),
    });
  }
});

/**
 * STEP 2: Generate the final image using the prompt from Step 1.
 */
router.post('/vto/generate', async (req, res) => {
  const { imagenPrompt } = (req.body ?? {}) as { imagenPrompt?: string };

  if (!imagenPrompt) {
    return res.status(400).json({ error: "Prompt immagine richiesto." });
  }

  const modelToUse = "black-forest-labs/flux-schnell";
  const aiController = new AbortController();
  const aiTimer = setTimeout(() => aiController.abort(), GENERATE_AI_TIMEOUT_MS);

  try {
    console.log(`VTO Generate: model=${modelToUse}`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://theblondes.it",
        "X-Title": "The Blondes CRM",
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: "user", content: [{ type: "text", text: imagenPrompt }] },
        ],
        modalities: ["image"],
      }),
      signal: aiController.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({} as any));
      console.warn("Generate API error:", response.status, errorData);
      return res.status(502).json({
        error: `Generazione fallita. ${errorData.error?.message || response.statusText}`,
      });
    }

    const data = await response.json();
    if (data.error) {
      console.error("OpenRouter Generate Error:", data.error);
      return res.status(502).json({
        error: `Il fornitore AI ha restituito un errore: ${data.error.message || "Errore sconosciuto"}.`,
      });
    }

    // Estrai URL immagine dai vari formati possibili
    const imageData =
      data.choices?.[0]?.message?.images?.[0] ||
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.message?.content?.[0]?.image_url?.url;

    let finalImageUrl: string | undefined =
      typeof imageData === 'string' ? imageData : imageData?.url;

    if (!finalImageUrl || finalImageUrl.length < 10) {
      console.error("OpenRouter empty response:", JSON.stringify(data, null, 2));
      return res.status(502).json({ error: "OpenRouter ha risposto senza URL immagine." });
    }

    if (!finalImageUrl.startsWith('http') && !finalImageUrl.startsWith('data:')) {
      const urlMatch = finalImageUrl.match(/(https?:\/\/[^\s)]+)/);
      if (urlMatch) {
        finalImageUrl = urlMatch[1];
      } else if (finalImageUrl.length > 500) {
        finalImageUrl = `data:image/jpeg;base64,${finalImageUrl}`;
      } else {
        return res.status(502).json({ error: "Risposta AI incomprensibile." });
      }
    }

    const modelUsed = data.model || modelToUse;
    console.log(`VTO Generate: success, model=${modelUsed}`);
    return res.json({ success: true, imageUrl: finalImageUrl, modelUsed });
  } catch (error: any) {
    const aborted = error?.name === 'AbortError';
    console.error("VTO Generate Error:", error?.message || error);
    if (!res.headersSent) {
      return res.status(aborted ? 504 : 500).json({
        error: aborted
          ? "Il modello sta impiegando troppo tempo (limite 10s Netlify). Riprova."
          : (error?.message || "Errore critico durante la generazione."),
      });
    }
  } finally {
    clearTimeout(aiTimer);
  }
});

app.use("/api", router);
app.use("/.netlify/functions/api", router);

export default app;
