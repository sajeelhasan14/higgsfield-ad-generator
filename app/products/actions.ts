'use server';

import { refresh } from 'next/cache';
import { syncProductsFromShopify } from '@/lib/products/sync';

export type SyncState = { ok: boolean; message: string } | null;

/** Runs when the Sync button is pressed. Returns a message for the button to show. */
export async function syncProductsAction(_prev: SyncState): Promise<SyncState> {
  // TODO(auth): check the dashboard login here once login exists. Server actions can be called by anyone who can reach the app.
  try {
    const { products, variants } = await syncProductsFromShopify();
    refresh(); // redraw the page so the new products appear
    return { ok: true, message: `Synced ${products} products and ${variants} variants.` };
  } catch (err) {
    console.error('Product sync failed:', err);
    return { ok: false, message: err instanceof Error ? err.message : 'Sync failed.' };
  }
}
