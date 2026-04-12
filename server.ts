import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Setup multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Initialize OpenRouter client
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "The Blondes CRM - Dev",
  }
});

// VTO Endpoint
app.post("/api/vto/process", upload.single("userImage"), async (req, res) => {
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

    // 2. Analyze User Image and Product Image using a Vision model (Gemini 1.5 Flash)
    console.log("Analyzing images with OpenRouter (Gemini 1.5 Flash)...");
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
      model: "google/gemini-flash-1.5",
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
    console.log("Generated Imagen Prompt:", imagenPrompt);

    // 3. Generate the final image using Flux Schnell on OpenRouter
    console.log("Generating final image with OpenRouter (Flux Schnell)...");
    const generateResponse = await openai.images.generate({
      model: "black-forest-labs/flux-1-schnell",
      prompt: imagenPrompt,
      n: 1,
      size: "1024x1024" as any,
    } as any);

    const finalImageUrl = generateResponse.data[0].url;

    res.json({ 
      success: true, 
      imageUrl: finalImageUrl,
      promptUsed: imagenPrompt 
    });

  } catch (error: any) {
    console.error("VTO Process Error:", error);
    res.status(500).json({ error: error.message || "Failed to process Virtual Try-On." });
  }
});

// Global error handler for API routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api/')) {
    console.error("API Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  } else {
    next(err);
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
