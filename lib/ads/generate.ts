// Takes one ad from 'generating' to 'ready', one short step per worker round, so the worker never
// sits waiting ~30 s for Higgsfield while posts are due:
//   1. no Higgsfield request yet  → send the product's real photo to be edited, remember the request ID
//   2. request still running      → nothing to do, check again next round
//   3. request finished           → download it, render the post image, save it, write the caption → 'ready'
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { GENERATION_DRY_RUN, HIGGSFIELD_MODEL } from '@/lib/config';
import { getStatus, submit } from '@/lib/higgsfield/client';
import { getProductWithVariants } from '@/lib/products/repository';
import type { Product, ProductWithVariants } from '@/lib/products/types';
import { saveFile } from '@/lib/storage';
import { buildCaption } from './caption';
import { download, toDataUri } from './images';
import { renderPost } from './post';
import { HERO_NEGATIVE_PROMPT, heroPrompt } from './prompts';
import { markAdFailed, markAdReady, setHeroRequest } from './repository';
import type { Ad } from './types';

/** Does the next step for this ad. Throws on unexpected errors (the caller marks the ad failed). */
export async function advanceGeneration(ad: Ad): Promise<void> {
  const product = ad.productId ? await getProductWithVariants(ad.productId) : null;
  if (!product) return markAdFailed(ad.id, 'This product is no longer in the catalog (removed from Shopify?)');
  if (product.variants.length === 0) return markAdFailed(ad.id, 'This product has no variants to show');
  // Without a photo the AI would have to invent the product, and an ad must show what the customer gets.
  if (!product.imageUrl) {
    return markAdFailed(ad.id, 'This product has no photo in Shopify, so the ad cannot show the real product. Add a photo in Shopify, sync, then press Regenerate.');
  }

  if (GENERATION_DRY_RUN) return finish(ad, product, await download(product.imageUrl));

  if (!ad.heroRequestId) {
    const requestId = await submit(HIGGSFIELD_MODEL, heroRequest(product, product.imageUrl), idempotencyKey(ad));
    return setHeroRequest(ad.id, requestId);
  }

  const res = await getStatus(ad.heroRequestId);
  if (res.status === 'queued' || res.status === 'in_progress') return; // still drawing; check next round
  if (res.status !== 'completed' || !res.images?.[0]) {
    return markAdFailed(ad.id, `Higgsfield ended the picture as '${res.status}'${res.error ? `: ${res.error}` : ''}. Press Regenerate to try again.`);
  }
  await finish(ad, product, await download(res.images[0].url));
}

/**
 * The request for the ad picture: the model edits the product's real photo (Shopify's public CDN link).
 * 1:1 because the post shows the photo in a nearly square area above the panel.
 */
export function heroRequest(product: Product, photoUrl: string) {
  return {
    prompt: heroPrompt(product),
    image_urls: [photoUrl],
    negative_prompt: HERO_NEGATIVE_PROMPT,
    aspect_ratio: '1:1',
    resolution: '2k',
  };
}

/** The same ad and attempt always give the same key, so a repeated submit is never charged twice. */
function idempotencyKey(ad: Ad): string {
  const hex = createHash('sha256').update(`ad-${ad.id}-hero-${ad.heroAttempt}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Renders and saves the post image, then marks the ad ready. */
async function finish(ad: Ad, product: ProductWithVariants, pictureBytes: Buffer): Promise<void> {
  const folder = `ads/${ad.id}/a${ad.heroAttempt}`; // a new folder per attempt, so the browser never shows an old image
  // The model answers with PNG; keep a JPEG copy, since Higgsfield deletes its outputs after a few days.
  const picture = await sharp(pictureBytes).jpeg({ quality: 90 }).toBuffer();
  await saveFile(`${folder}-picture.jpg`, picture);

  const post = await renderPost(product, await toDataUri(picture));
  const key = await saveFile(`${folder}-post.jpg`, post);
  await markAdReady(ad.id, [key], buildCaption(product));
}
