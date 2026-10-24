// All SQL for products and variants. Nothing here knows about Shopify or about pages.
import type { PoolClient } from 'pg';
import { query, withTransaction } from '@/lib/db';
import type { Product, ProductWithVariants, Variant } from './types';

/**
 * Makes the database match the given catalog: inserts new rows, updates changed ones, and deletes
 * products/variants that no longer exist in the store. All in one transaction, so a failure halfway
 * leaves the previous catalog untouched.
 */
export async function replaceCatalog(products: Product[], variants: Variant[]): Promise<void> {
  await withTransaction(async (client) => {
    for (const p of products) await upsertProduct(client, p);
    for (const v of variants) await upsertVariant(client, v);

    // Variants first: they point at products. "<> ALL(array)" means "not in this list".
    await client.query('DELETE FROM variants WHERE id <> ALL($1::text[])', [variants.map((v) => v.id)]);
    await client.query('DELETE FROM products WHERE id <> ALL($1::text[])', [products.map((p) => p.id)]);
  });
}

async function upsertProduct(client: PoolClient, p: Product) {
  await client.query(
    `INSERT INTO products (id, title, handle, description, vendor, product_type, status, image_url, shopify_updated_at, synced_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, handle = EXCLUDED.handle, description = EXCLUDED.description,
       vendor = EXCLUDED.vendor, product_type = EXCLUDED.product_type, status = EXCLUDED.status,
       image_url = EXCLUDED.image_url, shopify_updated_at = EXCLUDED.shopify_updated_at, synced_at = now()`,
    [p.id, p.title, p.handle, p.description, p.vendor, p.productType, p.status, p.imageUrl, p.shopifyUpdatedAt],
  );
}

async function upsertVariant(client: PoolClient, v: Variant) {
  await client.query(
    `INSERT INTO variants (id, product_id, title, sku, price, compare_at_price, currency, options, image_url, position, synced_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT (id) DO UPDATE SET
       product_id = EXCLUDED.product_id, title = EXCLUDED.title, sku = EXCLUDED.sku, price = EXCLUDED.price,
       compare_at_price = EXCLUDED.compare_at_price, currency = EXCLUDED.currency, options = EXCLUDED.options,
       image_url = EXCLUDED.image_url, position = EXCLUDED.position, synced_at = now()`,
    [v.id, v.productId, v.title, v.sku, v.price, v.compareAtPrice, v.currency, JSON.stringify(v.options), v.imageUrl, v.position],
  );
}

/** Every product with its variants (in Shopify's order), alphabetically by title. */
export async function listProductsWithVariants(): Promise<ProductWithVariants[]> {
  // json_agg folds each product's variants into one array, so this is one query instead of one per product.
  // ::text on prices keeps "45.00" exact instead of turning it into a JavaScript number.
  return query<ProductWithVariants>(
    `SELECT p.id, p.title, p.handle, p.description, p.vendor,
            p.product_type AS "productType", p.status, p.image_url AS "imageUrl",
            p.shopify_updated_at AS "shopifyUpdatedAt",
            COALESCE(
              json_agg(json_build_object(
                'id', v.id, 'productId', v.product_id, 'title', v.title, 'sku', v.sku,
                'price', v.price::text, 'compareAtPrice', v.compare_at_price::text, 'currency', v.currency,
                'options', v.options, 'imageUrl', v.image_url, 'position', v.position
              ) ORDER BY v.position) FILTER (WHERE v.id IS NOT NULL),
              '[]'
            ) AS variants
     FROM products p
     LEFT JOIN variants v ON v.product_id = p.id
     GROUP BY p.id
     ORDER BY p.title`,
  );
}

/** When the catalog was last synced, or null if it never was. */
export async function lastSyncedAt(): Promise<Date | null> {
  const [row] = await query<{ at: Date | null }>('SELECT max(synced_at) AS at FROM products');
  return row?.at ?? null;
}
