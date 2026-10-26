// Picks a real product from our database for the preview scripts (read-only; Shopify is never touched).
import { query } from '@/lib/db';
import { getProductWithVariants } from '@/lib/products/repository';
import type { ProductWithVariants } from '@/lib/products/types';

/** A random product with a photo whose title contains the text, or any product with a photo. */
export async function findProduct(text = ''): Promise<ProductWithVariants & { imageUrl: string }> {
  const [row] = await query<{ id: string }>(
    'SELECT id FROM products WHERE image_url IS NOT NULL AND title ILIKE $1 ORDER BY random() LIMIT 1',
    [`%${text}%`],
  );
  const product = row ? await getProductWithVariants(row.id) : null;
  if (!product?.imageUrl) throw new Error(`No product with a photo matches "${text}". Run the Shopify sync first?`);
  return product as ProductWithVariants & { imageUrl: string };
}
