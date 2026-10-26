// The app's own shape for products. Shopify's data is converted into these types as soon as it
// arrives (lib/shopify/products.ts), so the rest of the app never depends on Shopify's format.

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'UNLISTED';

export interface VariantOption {
  name: string; // e.g. "Thickness"
  value: string; // e.g. "20mm"
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  vendor: string;
  productType: string;
  status: ProductStatus;
  imageUrl: string | null;
  shopifyUpdatedAt: string;
}

export interface Variant {
  id: string;
  productId: string;
  title: string;
  sku: string | null;
  /** Kept as a string ("45.00") so money is never rounded by floating-point maths. */
  price: string;
  compareAtPrice: string | null;
  currency: string;
  options: VariantOption[];
  imageUrl: string | null;
  position: number;
}

export interface ProductWithVariants extends Product {
  variants: Variant[];
}
