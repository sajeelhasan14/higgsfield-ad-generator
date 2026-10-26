'use server';

// Every action starts with requireLogin(): server actions can be called by anyone who can reach the app.
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionResult } from '@/lib/action-result';
import { requireLogin } from '@/lib/auth';
import { createAds } from '@/lib/ads/repository';
import { syncProductsFromShopify } from '@/lib/products/sync';

/** Runs when the Sync button is pressed. Returns a message for the button to show. */
export async function syncProductsAction(_prev: ActionResult): Promise<ActionResult> {
  await requireLogin();
  try {
    const { products, variants } = await syncProductsFromShopify();
    refresh(); // redraw the page so the new products appear
    return { ok: true, message: `Synced ${products} products and ${variants} variants.` };
  } catch (err) {
    console.error('Product sync failed:', err);
    return { ok: false, message: err instanceof Error ? err.message : 'Sync failed.' };
  }
}

/** Queues one ad per ticked product for the worker, then opens the Review page to watch them appear. */
export async function createAdsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin();
  const productIds = formData.getAll('productId').map(String).filter(Boolean);
  if (productIds.length === 0) return { ok: false, message: 'Tick at least one product first.' };
  try {
    const created = await createAds(productIds);
    if (created === 0) return { ok: false, message: 'None of these products can be advertised (only Active products with a photo).' };
  } catch (err) {
    console.error('Creating ads failed:', err);
    return { ok: false, message: err instanceof Error ? err.message : 'Could not create the ads.' };
  }
  // Outside the try: redirect() works by throwing, and the catch above would swallow it.
  redirect('/review');
}
