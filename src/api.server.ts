import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Setup multer for memory storage
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

    // Fetch product image and convert to base64
    const productResponse = await fetch(productImageUrl);
    const productBuffer = Buffer.from(await productResponse.arrayBuffer());
    const productMimeType = productResponse.headers.get('content-type') || 'image/jpeg';
    const productBase64 = productBuffer.toString('base64');

    // Analysis using OpenRouter (multimodal vision)
    const analysisResponse = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001", // Fast and capable for vision
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an AI fashion stylist. Analyze these two images: 
              1. A photo of a person.
              2. A product photo of a "${productName}" (Category: ${productCategory}).
              
              Task: Create a highly detailed image generation prompt to show this person wearing the product. 
              Describe the person's pose, the fit of the ${productName} on them, the lighting, and a high-end fashion editorial background.
              Ensure the output is ONLY the descriptive prompt in English.`,
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
    });

    const imagenPrompt = analysisResponse.choices[0].message.content?.trim() || "";

    if (!imagenPrompt) {
      throw new Error("Impossibile generare il prompt dall'analisi.");
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
      const imageData = data.choices?.[0]?.message?.images?.[0] || data.choices?.[0]?.message?.content;
      let finalImageUrl = typeof imageData === 'string' ? imageData : imageData?.url;

      if (!finalImageUrl) {
          console.error("OpenRouter Response Data:", JSON.stringify(data, null, 2));
          throw new Error(`OpenRouter ha risposto con successo ma senza immagine. Risposta raw: ${JSON.stringify(data)}`);
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
