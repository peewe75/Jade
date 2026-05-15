export interface CartItem {
  productId: string;
  variantId: string;
  qty: number;
  priceSnapshot: number; // EUR cents
  nameSnapshot: string;
  imageSnapshot: string;
  sizeLabel?: string;
  colorLabel?: string;
}
