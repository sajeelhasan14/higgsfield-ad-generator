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
import { deleteFile, listFolder, readStoredFile, saveFile } from '@/lib/storage';
import { buildCaption } from './caption';
import { download, toDataUri } from './images';
import { priceSignature, renderAd } from './post';
import { HERO_NEGATIVE_PROMPT, heroPrompt } from './prompts';
import { getAd, markAdFailed, markAdReady, setHeroRequest } from './repository';
import type { Ad } from './types';

/** Does the next step for this ad. Throws on unexpected errors (the caller marks the ad failed). */
export async function advanceGeneration(ad: Ad): Promise<void> {
  const product = ad.productId ? await getProductWithVariants(ad.productId) : null;
  if (!product) return markAdFailed(ad.id, 'This product is no longer in the catalog (removed from Shopify?)');
  // Only products that are live in the store are advertised.
  if (product.status !== 'ACTIVE') return markAdFailed(ad.id, 'This product is no longer Active in Shopify, so it is not advertised.');
  if (product.variants.length === 0) return markAdFailed(ad.id, 'This product has no variants to show');
  // Without a photo the AI would have to invent the product, and an ad must show what the customer gets.
  if (!product.imageUrl) {
    return markAdFailed(ad.id, 'This product has no photo in Shopify, so the ad cannot show the real product. Add a photo in Shopify, sync, then press Regenerate.');
  }

  if (GENERATION_DRY_RUN) return finish(ad, product, await download(product.imageUrl));

  if (!ad.heroRequestId) {
    const requestId = await submit(HIGGSFIELD_MODEL, heroRequest(product, product.imageUrl, variationOf(ad)), idempotencyKey(ad));
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
 * 3:4 because the photo fills the 4:5 post; the closest shape the model offers, so little is cut off.
 */
export function heroRequest(product: Product, photoUrl: string, variation = 0) {
  return {
    prompt: heroPrompt(product, variation),
    image_urls: [photoUrl],
    negative_prompt: HERO_NEGATIVE_PROMPT,
    aspect_ratio: '3:4',
    resolution: '2k',
  };
}

/** A new ad, or a regenerated picture, moves on to the next look, so the same product gets a fresh picture each time. */
const variationOf = (ad: Ad) => Number(ad.id) + ad.heroAttempt;

/** The same ad and attempt always give the same key, so a repeated submit is never charged twice. */
function idempotencyKey(ad: Ad): string {
  const hex = createHash('sha256').update(`ad-${ad.id}-hero-${ad.heroAttempt}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Where an attempt's files live, e.g. "ads/12/a4" → "ads/12/a4-picture.jpg", "ads/12/a4-post-….jpg". */
const attemptPrefix = (ad: Ad) => `ads/${ad.id}/a${ad.heroAttempt}`;

/** Renders and saves the post image, then marks the ad ready. */
async function finish(ad: Ad, product: ProductWithVariants, pictureBytes: Buffer): Promise<void> {
  // The model answers with PNG; keep a JPEG copy, since Higgsfield deletes its outputs after a few days.
  const picture = await sharp(pictureBytes).jpeg({ quality: 90 }).toBuffer();
  await saveFile(`${attemptPrefix(ad)}-picture.jpg`, picture);
  await renderAndSave(ad, product, picture);

  // Earlier attempts' files are no longer shown anywhere, so they are removed.
  for (const key of await listFolder(`ads/${ad.id}`)) {
    if (!key.startsWith(`${attemptPrefix(ad)}-`)) await deleteFile(key);
  }
}

/**
 * Draws the post (and the Instagram carousel, if any) from the picture and today's product data, and saves
 * images, caption and prices together. Image 1 is the single post, the rest are the carousel slides.
 * The file names include the time, so the browser never shows a cached older drawing.
 */
async function renderAndSave(ad: Ad, product: ProductWithVariants, picture: Buffer): Promise<void> {
  const { post, carousel } = await renderAd(product, await toDataUri(picture));
  const stamp = Date.now();
  const keys = [await saveFile(`${attemptPrefix(ad)}-post-${stamp}.jpg`, post)];
  for (const [i, slide] of carousel.entries()) keys.push(await saveFile(`${attemptPrefix(ad)}-slide-${i + 1}-${stamp}.jpg`, slide));
  await markAdReady(ad.id, keys, buildCaption(product), priceSignature(product));
  for (const old of ad.images) if (!keys.includes(old)) await deleteFile(old);
}

/**
 * "Refresh design": redraws a ready ad with the current template and Shopify prices, reusing the picture it
 * already has, so no new AI image is paid for. The caption is rewritten too, so its prices match the image.
 */
export async function refreshDesign(adId: string): Promise<void> {
  const ad = await getAd(adId);
  if (!ad || ad.status !== 'ready') throw new Error('Only an ad that is ready for review can be refreshed');
  const product = ad.productId ? await getProductWithVariants(ad.productId) : null;
  if (!product) throw new Error('This product is no longer in the catalog');

  // Ads made before the picture was saved under this name kept it as "-hero-ai.jpg".
  let picture: Buffer | null = null;
  for (const key of [`${attemptPrefix(ad)}-picture.jpg`, `${attemptPrefix(ad)}-hero-ai.jpg`]) {
    picture = await readStoredFile(key).catch(() => null);
    if (picture) break;
  }
  if (!picture) throw new Error('This ad has no saved picture. Press Regenerate picture instead.');
  await renderAndSave(ad, product, picture);
}
