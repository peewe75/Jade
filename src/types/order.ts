export type PaymentMethod = 'stripe' | 'bank' | 'crypto';
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'refunded' | 'failed';
export type ShippingStatus = 'pending' | 'quoted' | 'shipped' | 'delivered';

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  qty: number;
  priceSnapshot: number; // EUR cents
  nameSnapshot: string;
  imageSnapshot: string;
  sizeLabel?: string | null;
  colorLabel?: string | null;
}

export interface OrderTotals {
  subtotal: number; // cents
  shipping: number; // cents, 0 until admin quotes
  total: number;    // cents
}

export interface TimelineEvent {
  status: string;
  at: { toMillis?: () => number } | Date;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  guestEmail: string | null;
  items: OrderItem[];
  totals: OrderTotals;
  currency: 'EUR';
  locale: 'it' | 'en';
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentRef?: string;
  stripeSessionId?: string;
  shippingAddress: ShippingAddress;
  shippingStatus: ShippingStatus;
  shippingTracking?: string;
  timeline: TimelineEvent[];
  notes?: string;
  createdAt: { toMillis?: () => number } | null;
  updatedAt: { toMillis?: () => number } | null;
}
