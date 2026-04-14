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

    // Generate the final image using a faster model (Flux Schnell)
    const generateResponse = await openai.chat.completions.create({
      model: "black-forest-labs/flux-schnell", 
      messages: [
        {
          role: "user",
          content: imagenPrompt,
        }
      ],
      // @ts-ignore
      modalities: ["image"],
    });

    const imageData = (generateResponse.choices[0].message as any).images?.[0];
    const imageUrl = imageData?.url || imageData;

    if (!imageUrl) {
      console.error("OpenRouter Vision/Imagen Response:", JSON.stringify(generateResponse, null, 2));
      throw new Error("Impossibile ottenere l'URL dell'immagine da OpenRouter.");
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
