import { lastSyncedAt } from '@/lib/products/repository';
import { syncProductsFromShopify } from '@/lib/products/sync';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 60 * 1000;
let nextCheck = 0;

/**
 * Keeps prices and products current without anyone pressing Sync: once an hour it looks whether the last
 * sync is more than a day old, and syncs if so. Fresh prices are what the pre-posting price check compares against.
 */
export async function syncProductsDaily(): Promise<void> {
  if (Date.now() < nextCheck) return;
  nextCheck = Date.now() + CHECK_EVERY_MS; // set first, so a failing sync is retried in an hour, not every tick
  const last = await lastSyncedAt();
  if (last && Date.now() - last.getTime() < DAY_MS) return;
  const { products, variants } = await syncProductsFromShopify();
  console.log(`Daily Shopify sync: ${products} products, ${variants} variants`);
}
