// Connects the two sides: read the catalog from Shopify, save it in our database.
// Kept free of Next.js code so the background worker can call it too (e.g. a nightly sync).
import { fetchShopifyCatalog } from '@/lib/shopify/products';
import { replaceCatalog } from './repository';

export interface SyncResult {
  products: number;
  variants: number;
}

export async function syncProductsFromShopify(): Promise<SyncResult> {
  const { products, variants } = await fetchShopifyCatalog();

  // replaceCatalog deletes whatever is not in the list. An empty answer is far more likely to be a
  // problem (wrong store, missing permission) than a store with no products, so refuse to wipe everything.
  if (products.length === 0) throw new Error('Shopify returned no products, so nothing was changed. Check the store domain and the app permissions.');

  await replaceCatalog(products, variants);
  return { products: products.length, variants: variants.length };
}
