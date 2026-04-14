/**
 * Express app usato da `netlify/functions/api.ts` come catch-all per /api/*
 * (esclude /api/vto/tryon, che netlify.toml redirige alla background function).
 *
 * Al momento non ospita route perché il VTO è l'unica API e gira in background.
 * Lasciamo lo scheletro pronto per future route (carrello, ordini, webhooks, ecc.).
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ limit: '8mb', extended: true }));

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", router);
app.use("/.netlify/functions/api", router);

export default app;
