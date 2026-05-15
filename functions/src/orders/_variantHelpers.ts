import { HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import type { Transaction, DocumentReference } from 'firebase-admin/firestore';

// Legacy products store sizes[] but no variants[]. The frontend (Shop.tsx,
// Product.tsx) synthesizes variant ids of the form `legacy-<index>` so they
// can flow through the same cart pipeline. These helpers let the order
// functions accept those ids without rejecting the cart.

export function resolveVariant(
  data: Record<string, unknown>,
  variantId: string,
  qty: number,
  productName: string
): { id: string; size: string | null; color?: string | null; priceOverride?: number } {
  const variantsArr = (data.variants as Array<Record<string, unknown>> | undefined) ?? [];
  if (variantsArr.length > 0) {
    const variant = variantsArr.find(v => v.id === variantId);
    if (!variant) throw new HttpsError('not-found', `Variante ${variantId} non trovata.`);
    const stock = (variant.stock as number | undefined) ?? 0;
    const reserved = (variant.reserved as number | undefined) ?? 0;
    if (stock - reserved < qty) {
      throw new HttpsError('resource-exhausted', `Quantità non disponibile per ${productName}.`);
    }
    return variant as { id: string; size: string | null; color?: string | null; priceOverride?: number };
  }
  if (!variantId.startsWith('legacy-')) {
    throw new HttpsError('not-found', `Variante ${variantId} non trovata.`);
  }
  const idx = parseInt(variantId.replace('legacy-', ''), 10);
  const sizes = data.sizes as string[] | undefined;
  const size = (sizes && !Number.isNaN(idx)) ? sizes[idx] ?? null : null;
  if (qty > 1) {
    throw new HttpsError('resource-exhausted', `Quantità non disponibile per ${productName}.`);
  }
  return { id: variantId, size };
}

export function reserveVariantInTx(
  tx: Transaction,
  productRef: DocumentReference,
  data: Record<string, unknown>,
  variantId: string,
  qty: number
): void {
  const variantsArr = (data.variants as Array<Record<string, unknown>> | undefined) ?? [];
  if (variantsArr.length === 0 && variantId.startsWith('legacy-')) {
    return;
  }
  const v = variantsArr.find(vv => vv.id === variantId);
  const stock = (v?.stock as number | undefined) ?? 0;
  const reserved = (v?.reserved as number | undefined) ?? 0;
  if (!v || stock - reserved < qty) {
    throw new HttpsError('resource-exhausted', 'Quantità non disponibile (aggiornata).');
  }
  const updatedVariants = variantsArr.map(vv =>
    vv.id === variantId
      ? { ...vv, reserved: ((vv.reserved as number | undefined) ?? 0) + qty }
      : vv
  );
  tx.update(productRef, {
    variants: updatedVariants,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
