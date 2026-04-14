import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
const upload = multer({ storage: multer.memoryStorage() });

// Initialize OpenRouter client
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://theblondes.it", // Optional, for OpenRouter rankings
    "X-Title": "The Blondes CRM", // Optional, for OpenRouter rankings
  }
});

const router = express.Router();

/**
 * STEP 1: Analyze images to create a descriptive prompt
 * This allows us to split the long VTO process into two smaller requests
 * to avoid Netlify's 10s function timeout.
 */
router.post('/vto/analyze', upload.single('userImage'), async (req, res) => {
  try {
    const { productImageUrl, productName, productCategory } = req.body;
    const userImageFile = req.file;

    if (!userImageFile) {
      return res.status(400).json({ error: "Foto utente richiesta." });
    }

    if (!productImageUrl) {
      return res.status(400).json({ error: "URL immagine prodotto richiesto." });
    }

    const userBase64 = userImageFile.buffer.toString('base64');
    const userMimeType = userImageFile.mimetype;

    // Build absolute URL for product image if it's relative
    let absoluteProductUrl = productImageUrl;
    if (productImageUrl.startsWith('/') || !productImageUrl.startsWith('http')) {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'];
      // Remove leading slash if present to avoid double slash
      const cleanPath = productImageUrl.startsWith('/') ? productImageUrl.slice(1) : productImageUrl;
      absoluteProductUrl = `${protocol}://${host}/${cleanPath}`;
    }

    console.log(`VTO Analyze: Fetching product image from ${absoluteProductUrl}`);

    // Fetch product image and convert to base64
    const productResponse = await fetch(absoluteProductUrl);
    if (!productResponse.ok) {
        throw new Error(`Impossibile scaricare l'immagine del prodotto (${productResponse.status})`);
    }
    const productBuffer = Buffer.from(await productResponse.arrayBuffer());
    const productMimeType = productResponse.headers.get('content-type') || 'image/jpeg';
    const productBase64 = productBuffer.toString('base64');

    console.log(`VTO Analyze: Starting analysis with Gemini 2.0 Flash...`);

    const analysisResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
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
                2. A product photo of a "${productName}".
                
                Task: Create a highly detailed image generation prompt (in English) to show this person wearing the product. 
                Focus on fit, posture, and lighting. Output ONLY the prompt string.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${userMimeType};base64,${userBase64}`,
                },
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${productMimeType};base64,${productBase64}`,
                },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(25000)
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("Analysis API Error:", analysisResponse.status, errorText);
      throw new Error(`Errore durante l'analisi visiva (${analysisResponse.status}). Per favore riduci le dimensioni della foto o riprova.`);
    }

    const analyzeData = await analysisResponse.json();
    
    if (analyzeData.error) {
        console.error("OpenRouter Analyze Internal Error:", analyzeData.error);
        throw new Error(`Errore interno AI: ${analyzeData.error.message || "Risorsa non disponibile"}`);
    }

    const imagenPrompt = analyzeData.choices?.[0]?.message?.content?.trim() || "";

    if (!imagenPrompt || imagenPrompt.length < 5) {
      throw new Error("L'intelligenza artificiale non ha generato un prompt valido. Prova con una foto diversa.");
    }

    res.json({ success: true, imagenPrompt });

  } catch (error: any) {
    console.error("VTO Analyze Error:", error);
    res.status(500).json({ error: error.message || "Errore durante l'analisi delle foto." });
  }
});

/**
 * STEP 2: Generate the final image using the prompt from Step 1
 * Uses a robust fallback system to try multiple fast models if one fails.
 */
router.post('/vto/generate', async (req, res) => {
  try {
    const { imagenPrompt } = req.body;

    if (!imagenPrompt) {
      return res.status(400).json({ error: "Prompt immagine richiesto." });
    }

    // L'errore Sandbox.Timedout (30.00s) obbliga ad usare SOLO i modelli più veloci in assoluto
    // I modelli Pro o di altissima qualità sforano spesso i 30 secondi e vengono uccisi da Netlify.
    // Passiamo un array "models" in modo che sia OpenRouter (server-side) a fare il fallback
    // se il primo modello fallisce o è sovraccarico. Così risparmiamo secondi preziosi!
    const modelsList = [
      "black-forest-labs/flux-schnell", 
      "black-forest-labs/flux-dev",
      "google/gemini-2.0-flash-001" // High-speed fallback
    ];

    try {
      console.log(`Attempting image generation via OpenRouter: ${modelsList[0]}`);
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://theblondes.it",
          "X-Title": "The Blondes CRM",
        },
        body: JSON.stringify({
          model: "black-forest-labs/flux.2-klein-4b", 
          messages: [
            { 
              role: "user", 
              content: [
                { type: "text", text: imagenPrompt }
              ] 
            }
          ],
          modalities: ["image"]
        }),
        signal: AbortSignal.timeout(28000)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn(`All routed models failed:`, errorData);
        return res.status(500).json({ error: `Generazione fallita sul provider. Errore: ${errorData.error?.message || response.statusText}` });
      }

      const data = await response.json();
      
      // Handle OpenRouter internal errors that come with 200 status
      if (data.error) {
        console.error("OpenRouter Internal Error:", JSON.stringify(data.error));
        return res.status(500).json({ 
          error: `Il fornitore AI ha restituito un errore: ${data.error.message || "Errore sconosciuto"}. Riprova tra un istante.` 
        });
      }

      // Try different common paths for the image URL in the response
      const imageData = data.choices?.[0]?.message?.images?.[0] || 
                        data.choices?.[0]?.message?.content || 
                        data.choices?.[0]?.message?.content?.[0]?.image_url?.url;
      
      let finalImageUrl = typeof imageData === 'string' ? imageData : imageData?.url;

      if (!finalImageUrl || finalImageUrl.length < 10) {
          console.error("OpenRouter Empty Response Data:", JSON.stringify(data, null, 2));
          throw new Error(`OpenRouter ha risposto senza un URL immagine valido. Risposta raw: ${JSON.stringify(data)}`);
      }

      // Normalize and extract valid image URL or Base64 format
      if (!finalImageUrl.startsWith('http') && !finalImageUrl.startsWith('data:')) {
        const markdownImgMatch = finalImageUrl.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
        if (markdownImgMatch && markdownImgMatch[1]) {
          finalImageUrl = markdownImgMatch[1];
        } else {
          const urlMatch = finalImageUrl.match(/(https?:\/\/[^\s\)]+)/);
          if (urlMatch && urlMatch[1]) {
            finalImageUrl = urlMatch[1];
          } else if (finalImageUrl.length > 500) {
            finalImageUrl = `data:image/jpeg;base64,${finalImageUrl}`;
          } else {
             throw new Error(`Risposta AI incomprensibile (né url né immagine base64): ${finalImageUrl.substring(0, 100)}...`);
          }
        }
      }

      const modelUsedDataResult = data.model || modelsList[0];
      console.log(`Successfully generated image. Final model reported by OpenRouter: ${modelUsedDataResult}`);
      
      return res.json({ success: true, imageUrl: finalImageUrl, modelUsed: modelUsedDataResult });

    } catch (err: any) {
      console.error(`VTO Generation Block Error:`, err.message);
      
      if (err.name === 'TimeoutError' || err.message.includes('timeout') || err.message.includes('aborted')) {
          return res.status(500).json({ 
              error: "Il modello sta impiegando troppo tempo a generare l'immagine. Netlify ha un limite di 30 secondi. Riprova tra poco." 
          });
      }

      return res.status(500).json({ error: err.message });
    }

    } catch (error: any) {
      console.error("VTO Generate System Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Errore critico durante la generazione." });
      }
    }
  });

app.use("/api", router);
app.use("/.netlify/functions/api", router);

export default app;
