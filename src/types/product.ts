export type ProductStatus = 'draft' | 'active' | 'archived' | 'sold_out';

export interface ProductVariant {
  id: string; // e.g. "var-1"
  size?: string; // "XS", "S", "M", "L", "XL", "XXL", "One Size"
  color?: string;
  sku?: string;
  stock: number; // quantita in magazzino
  reserved: number; // in carrello
  priceOverride?: number; // cents, if the variant has a different price
}

export interface ProductTranslation {
  name: string;
  description: string;
  detailsAndCare?: string;
  shippingAndReturns?: string;
}

export interface Artisan {
  name: string;
  bio: string;
  photoUrl?: string;
}

export interface ProductMaterial {
  label: string;
  origin?: string;
  description?: string;
}

export interface ProductMedia {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

export interface ProductStory {
  craft?: string;
  artisan?: Artisan;
  materials?: ProductMaterial[];
  makingMedia?: ProductMedia[];
}

export interface Product {
  id: string;
  
  // Legacy fields (kept for backward compatibility during migration)
  name: string; 
  price: number; 
  images: string[];
  category: string;
  tags: string[];
  featured?: boolean;
  featuredOrder?: number;
  sizes?: string[]; // Legacy, mapped to variants
  description?: string;
  detailsAndCare?: string;
  shippingAndReturns?: string;

  // New fields
  status: ProductStatus;
  isOneOfAKind: boolean;
  basePrice: number; // In cents (e.g. 15000 = 150.00 EUR)
  
  variants: ProductVariant[];
  translations: {
    it: ProductTranslation;
    en: ProductTranslation;
  };
  
  story?: ProductStory;
  
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}
