"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vtoTryon = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
(0, app_1.initializeApp)();
const openrouterKey = (0, params_1.defineSecret)('OPENROUTER_API_KEY');
const VTO_MODEL = 'google/gemini-2.5-flash-image';
const REGION = 'europe-west1';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function resolveProductImage(productImageUrl) {
    // Data URL inline (prodotti caricati dall'admin Inventory)
    if (productImageUrl.startsWith('data:')) {
        const match = productImageUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
        if (!match || !match[2])
            throw new Error('data URL prodotto non valido.');
        return { base64: match[2], mimeType: match[1] || 'image/jpeg' };
    }
    // URL HTTP(S)
    const response = await fetch(productImageUrl);
    if (!response.ok) {
        throw new Error(`Impossibile scaricare l'immagine del prodotto (${response.status}).`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
        base64: buffer.toString('base64'),
        mimeType: response.headers.get('content-type') || 'image/jpeg',
    };
}
function extractImageUrl(data) {
    const msg = data?.choices?.[0]?.message;
    const firstImage = msg?.images?.[0];
    if (firstImage) {
        if (typeof firstImage === 'string')
            return firstImage;
        if (typeof firstImage.image_url === 'string')
            return firstImage.image_url;
        if (typeof firstImage.image_url?.url === 'string')
            return firstImage.image_url.url;
        if (typeof firstImage.url === 'string')
            return firstImage.url;
        if (typeof firstImage.b64_json === 'string')
            return `data:image/jpeg;base64,${firstImage.b64_json}`;
    }
    if (typeof msg?.content === 'string' && msg.content.length > 20)
        return msg.content;
    if (Array.isArray(msg?.content)) {
        for (const part of msg.content) {
            if (typeof part?.image_url?.url === 'string')
                return part.image_url.url;
            if (typeof part?.image_url === 'string')
                return part.image_url;
        }
    }
    return undefined;
}
exports.vtoTryon = (0, https_1.onCall)({
    region: REGION,
    secrets: [openrouterKey],
    memory: '512MiB',
    timeoutSeconds: 300,
    enforceAppCheck: false,
    // onCall non include in whitelist domini custom (Netlify). Abilitiamo CORS
    // esplicitamente per il sito di produzione + dev locale. La function è
    // comunque protetta dal check `request.auth.uid`.
    cors: [
        'https://blondejade.netlify.app',
        'https://theblondes.it',
        /localhost(:\d+)?$/,
    ],
}, async (request) => {
    // --- Auth ---
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Devi essere loggata per usare il camerino virtuale.');
    }
    const uid = request.auth.uid;
    const { jobId, userImageBase64, userMimeType, productImageUrl, productName, productCategory, } = request.data;
    if (!jobId || !userImageBase64 || !productImageUrl || !productName) {
        throw new https_1.HttpsError('invalid-argument', 'Dati della richiesta mancanti.');
    }
    const db = (0, firestore_1.getFirestore)();
    const jobRef = db.collection('vto_jobs').doc(jobId);
    // Verifica che il doc esista e appartenga all'utente
    const snap = await jobRef.get();
    if (!snap.exists || snap.data()?.userId !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Job non valido o non autorizzato.');
    }
    const userMime = userMimeType || 'image/jpeg';
    const categoryHint = productCategory ? ` (category: ${productCategory})` : '';
    const systemIntro = `You are a photorealistic virtual try-on engine. Your job is to produce ONE ` +
        `photograph of the person in IMAGE 1 wearing EXACTLY the garment shown in ` +
        `IMAGE 2. Nothing else.`;
    const customerLabel = `### IMAGE 1 — CUSTOMER PHOTO\n` +
        `This is the real customer. Everything about this person must be preserved: ` +
        `face, hair, skin tone, makeup, body shape, pose, hands position, background, ` +
        `lighting, camera angle, framing. Treat their identity as sacred.`;
    const productLabel = `### IMAGE 2 — PRODUCT TO TRY ON: "${productName}"${categoryHint}\n` +
        `This is the ONLY garment the customer must be wearing in the output. ` +
        `Reproduce it EXACTLY as shown: same color, same pattern/print, same fabric, ` +
        `same cut, same length, same neckline, same sleeves, same collar, same ` +
        `buttons/zippers, same straps, same belt. Do not invent variations. Do not ` +
        `substitute with a similar-looking item.`;
    const rulesLabel = `### OUTPUT RULES (STRICT)\n` +
        `1. REPLACE any clothing currently visible on the person in IMAGE 1 with the ` +
        `   garment from IMAGE 2. If the customer is already wearing clothes, those ` +
        `   clothes must disappear and be substituted by the product. Never layer the ` +
        `   product on top of existing clothes. Never mix pieces from IMAGE 1 outfit ` +
        `   with the product.\n` +
        `2. DO NOT add any garment or accessory that is not present in IMAGE 2 ` +
        `   (no extra jackets, trenches, coats, scarves, belts, bags, or shoes unless ` +
        `   they come from IMAGE 2).\n` +
        `3. KEEP the person's face, hair, skin tone, body proportions, and pose from ` +
        `   IMAGE 1 unchanged. Do not restyle the hair. Do not change the face. Do not ` +
        `   swap the identity.\n` +
        `4. KEEP the background, lighting, shadows direction, and camera angle from ` +
        `   IMAGE 1. The person must appear in the exact same scene.\n` +
        `5. Fit the garment naturally on the body with realistic drape, folds, and ` +
        `   shadows that match the lighting of IMAGE 1.\n` +
        `6. Output a single high-resolution photograph. No text, no logos, no ` +
        `   watermarks, no collage, no split screen, no multiple people.`;
    const prompt = `${systemIntro}\n\n${customerLabel}`;
    const productPrompt = `${productLabel}\n\n${rulesLabel}`;
    try {
        const product = await resolveProductImage(productImageUrl);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openrouterKey.value()}`,
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
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${userMime};base64,${userImageBase64}`,
                                },
                            },
                            { type: 'text', text: productPrompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${product.mimeType};base64,${product.base64}`,
                                },
                            },
                            {
                                type: 'text',
                                text: `Now produce the single photorealistic try-on image: the ` +
                                    `person from IMAGE 1, in the same pose and scene, wearing ` +
                                    `ONLY the garment from IMAGE 2.`,
                            },
                        ],
                    },
                ],
            }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData?.error?.message || `OpenRouter error ${response.status}`;
            console.error('VTO upstream error:', response.status, errorData);
            await jobRef.update({
                status: 'failed',
                error: `Generazione fallita. ${msg}`,
                completedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            throw new https_1.HttpsError('internal', msg);
        }
        const data = await response.json();
        if (data.error) {
            const msg = data.error.message || 'Errore OpenRouter sconosciuto';
            console.error('OpenRouter VTO error:', data.error);
            await jobRef.update({
                status: 'failed',
                error: `Errore AI: ${msg}`,
                completedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            throw new https_1.HttpsError('internal', msg);
        }
        let imageUrl = extractImageUrl(data);
        if (!imageUrl || imageUrl.length < 10) {
            console.error('VTO empty response:', JSON.stringify(data).slice(0, 2000));
            await jobRef.update({
                status: 'failed',
                error: "Il modello non ha restituito un'immagine valida. Riprova.",
                completedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            throw new https_1.HttpsError('internal', 'No image in response');
        }
        // Normalizza URL se necessario
        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            const urlMatch = imageUrl.match(/(https?:\/\/[^\s)]+)/);
            if (urlMatch) {
                imageUrl = urlMatch[1];
            }
            else if (imageUrl.length > 500) {
                imageUrl = `data:image/jpeg;base64,${imageUrl.replace(/\s/g, '')}`;
            }
            else {
                await jobRef.update({
                    status: 'failed',
                    error: 'Risposta AI incomprensibile.',
                    completedAt: firestore_1.FieldValue.serverTimestamp(),
                });
                throw new https_1.HttpsError('internal', 'Unreadable AI response');
            }
        }
        // Se l'output è un data URL base64, lo carichiamo su Firebase Storage
        // per evitare di sfondare il limite di 1 MiB per field di Firestore.
        if (imageUrl.startsWith('data:')) {
            const m = imageUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
            if (!m || !m[2]) {
                await jobRef.update({
                    status: 'failed',
                    error: 'Formato immagine AI non valido.',
                    completedAt: firestore_1.FieldValue.serverTimestamp(),
                });
                throw new https_1.HttpsError('internal', 'Invalid data URL from model');
            }
            const mimeType = m[1] || 'image/jpeg';
            const ext = mimeType.includes('png')
                ? 'png'
                : mimeType.includes('webp')
                    ? 'webp'
                    : 'jpg';
            const buffer = Buffer.from(m[2], 'base64');
            const bucket = (0, storage_1.getStorage)().bucket('jade-crm-2026-v2.firebasestorage.app');
            const objectPath = `vto_results/${uid}/${jobId}.${ext}`;
            const file = bucket.file(objectPath);
            await file.save(buffer, {
                contentType: mimeType,
                resumable: false,
                metadata: {
                    cacheControl: 'public, max-age=31536000, immutable',
                    metadata: { jobId, uid },
                },
            });
            await file.makePublic();
            imageUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
            console.log(`VTO image uploaded to Storage: ${objectPath} (${buffer.length} bytes)`);
        }
        const modelUsed = data.model || VTO_MODEL;
        console.log(`VTO success jobId=${jobId} model=${modelUsed}`);
        await jobRef.update({
            status: 'completed',
            imageUrl,
            modelUsed,
            completedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { imageUrl, modelUsed };
    }
    catch (err) {
        // Se non è già un HttpsError, wrappa e aggiorna Firestore
        if (!(err instanceof https_1.HttpsError)) {
            console.error('VTO unexpected error:', err?.message || err);
            await jobRef
                .update({
                status: 'failed',
                error: err?.message || 'Errore durante la generazione.',
                completedAt: firestore_1.FieldValue.serverTimestamp(),
            })
                .catch(() => { });
            throw new https_1.HttpsError('internal', err?.message || 'Errore durante la generazione.');
        }
        throw err;
    }
});
