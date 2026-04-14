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
 */
router.post('/vto/generate', async (req, res) => {
  try {
    const { imagenPrompt } = req.body;

    if (!imagenPrompt) {
      return res.status(400).json({ error: "Prompt immagine richiesto." });
    }

    // Use direct fetch to OpenRouter to ensure modalities: ["image"] is handled correctly
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
            content: imagenPrompt
          }
        ],
        modalities: ["image"]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenRouter API Error:", JSON.stringify(errorData, null, 2));
      return res.status(response.status).json({ 
        error: errorData.error?.message || "Errore nella comunicazione con il fornitore AI (400 Provider Error)." 
      });
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0] || data.choices?.[0]?.message?.content;
    const imageUrl = typeof imageData === 'string' ? imageData : imageData?.url;

    if (!imageUrl) {
      console.error("Unexpected OpenRouter Response:", JSON.stringify(data, null, 2));
      throw new Error("Impossibile ottenere l'URL dell'immagine dal risultato.");
    }

    res.json({ 
      success: true, 
      imageUrl: imageUrl
    });

  } catch (error: any) {
    console.error("VTO Generate Error:", error);
    res.status(500).json({ error: error.message || "Errore durante la generazione dell'immagine virtuale." });
  }
});

app.use("/api", router);
app.use("/.netlify/functions/api", router);

export default app;
