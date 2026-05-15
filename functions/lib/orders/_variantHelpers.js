"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveVariant = resolveVariant;
exports.reserveVariantInTx = reserveVariantInTx;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
// Legacy products store sizes[] but no variants[]. The frontend (Shop.tsx,
// Product.tsx) synthesizes variant ids of the form `legacy-<index>` so they
// can flow through the same cart pipeline. These helpers let the order
// functions accept those ids without rejecting the cart.
function resolveVariant(data, variantId, qty, productName) {
    const variantsArr = data.variants ?? [];
    if (variantsArr.length > 0) {
        const variant = variantsArr.find(v => v.id === variantId);
        if (!variant)
            throw new https_1.HttpsError('not-found', `Variante ${variantId} non trovata.`);
        const stock = variant.stock ?? 0;
        const reserved = variant.reserved ?? 0;
        if (stock - reserved < qty) {
            throw new https_1.HttpsError('resource-exhausted', `Quantità non disponibile per ${productName}.`);
        }
        return variant;
    }
    if (!variantId.startsWith('legacy-')) {
        throw new https_1.HttpsError('not-found', `Variante ${variantId} non trovata.`);
    }
    const idx = parseInt(variantId.replace('legacy-', ''), 10);
    const sizes = data.sizes;
    const size = (sizes && !Number.isNaN(idx)) ? sizes[idx] ?? null : null;
    if (qty > 1) {
        throw new https_1.HttpsError('resource-exhausted', `Quantità non disponibile per ${productName}.`);
    }
    return { id: variantId, size };
}
function reserveVariantInTx(tx, productRef, data, variantId, qty) {
    const variantsArr = data.variants ?? [];
    if (variantsArr.length === 0 && variantId.startsWith('legacy-')) {
        return;
    }
    const v = variantsArr.find(vv => vv.id === variantId);
    const stock = v?.stock ?? 0;
    const reserved = v?.reserved ?? 0;
    if (!v || stock - reserved < qty) {
        throw new https_1.HttpsError('resource-exhausted', 'Quantità non disponibile (aggiornata).');
    }
    const updatedVariants = variantsArr.map(vv => vv.id === variantId
        ? { ...vv, reserved: (vv.reserved ?? 0) + qty }
        : vv);
    tx.update(productRef, {
        variants: updatedVariants,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
