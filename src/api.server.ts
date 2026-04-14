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

// VTO Endpoint
router.post("/vto/process", upload.single("userImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No user image provided." });
    }

    const { productImageUrl, productName, productCategory } = req.body;

    if (!productImageUrl) {
      return res.status(400).json({ error: "No product image URL provided." });
    }

    // 1. Fetch the product image
    const productResponse = await fetch(productImageUrl);
    const productBuffer = await productResponse.arrayBuffer();
    const productMimeType = productResponse.headers.get('content-type') || 'image/jpeg';
    const productBase64 = Buffer.from(productBuffer).toString("base64");

    // 2. Analyze User Image and Product Image using a Vision model (Gemini 1.5 Flash is very cheap on OpenRouter)
    const userImageBase64 = req.file.buffer.toString("base64");
    const userMimeType = req.file.mimetype;

    const analysisPrompt = `
      You are an expert fashion stylist and AI prompt engineer.
      I have provided two images:
      1. A photo of a person (the user).
      2. A photo of a clothing item: ${productName} (${productCategory}).

      Your task is to write a highly detailed prompt for an image generation model (like Flux or Stable Diffusion) to generate a photorealistic image of this exact person wearing this exact clothing item.
      
      Analyze the person's pose, body type, lighting, and background.
      Analyze the clothing item's fabric, color, cut, and style.
      
      Write a single, descriptive prompt (in English) that combines these elements. The prompt must describe the person exactly as they appear (hair, face, pose, background) but wearing the new clothing item.
      
      Return ONLY the prompt text, nothing else. No preamble.
    `;

    const analysisResponse = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash-image", // Updated vision model
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${userMimeType};base64,${userImageBase64}`,
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
      throw new Error("Failed to generate image prompt from analysis.");
    }

    // 3. Generate the final image using OpenRouter's multimodal chat endpoint (recommended for image generation)
    const generateResponse = await openai.chat.completions.create({
      model: "openai/gpt-5-image", 
      messages: [
        {
          role: "user",
          content: imagenPrompt,
        }
      ],
      // OpenRouter uses modalities: ["image"] for image generation via the completions endpoint
      // @ts-ignore
      modalities: ["image"],
    });

    const imageData = (generateResponse.choices[0].message as any).images?.[0];
    const imageUrl = imageData?.url || imageData;

    if (!imageUrl) {
      console.error("OpenRouter Vision/Imagen Response:", JSON.stringify(generateResponse, null, 2));
      throw new Error("Failed to generate image URL from OpenRouter.");
    }

    res.json({ 
      success: true, 
      imageUrl: imageUrl,
      promptUsed: imagenPrompt 
    });

  } catch (error: any) {
    console.error("VTO Process Error:", error);
    res.status(500).json({ error: error.message || "Failed to process Virtual Try-On." });
  }
});

app.use("/api", router);
app.use("/.netlify/functions/api", router);

export default app;
