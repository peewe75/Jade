export interface CartItem {
  productId: string;
  variantId: string;
  qty: number;
  priceSnapshot: number; // EUR cents
  nameSnapshot: string;
  imageSnapshot: string;
  maxQtySnapshot?: number;
  sizeLabel?: string;
  colorLabel?: string;
}
