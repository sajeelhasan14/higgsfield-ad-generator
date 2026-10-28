// Sends one post to its platform, after checking the ad is still right to post.
import { getAd } from '@/lib/ads/repository';
import type { Ad } from '@/lib/ads/types';
import { priceSignature } from '@/lib/ads/post';
import { PUBLISH_DRY_RUN } from '@/lib/config';
import type { Platform, Post } from '@/lib/posts/types';
import { getProductWithVariants } from '@/lib/products/repository';
import type { ProductWithVariants } from '@/lib/products/types';
import { publicMediaUrl } from './media';
import { postCarouselToInstagram, postToFacebook, postToInstagram } from './meta';

/** Publishes the post and returns its ID on the platform. Throws if it could not or should not be published. */
export async function publishPost(post: Post): Promise<string> {
  const ad = await getAd(post.adId);
  if (!ad?.images[0]) throw new Error(`Ad ${post.adId} has no image to post`);

  // The checks run in dry run too, so a test shows the same problems a real post would hit.
  await checkStillTrue(ad);

  if (PUBLISH_DRY_RUN) {
    console.log(`[dry run] would post ad ${post.adId} to ${post.platform}`);
    return `dry-run-${post.platform}-${post.id}`;
  }

  return sendAd(ad, post.platform);
}

/**
 * Throws if the ad must not be shown any more: its product is gone or not Active, or its prices changed.
 * Run right before posting and before promoting it as a paid ad. Returns the product for the caller's use.
 */
export async function checkStillTrue(ad: Ad): Promise<ProductWithVariants> {
  const product = ad.productId ? await getProductWithVariants(ad.productId) : null;
  if (!product) throw new Error('The product is no longer in the catalog, so the ad is not posted');
  if (product.status !== 'ACTIVE') throw new Error('The product is no longer Active in Shopify, so the ad is not posted');
  // An ad must never advertise an old price. The worker syncs Shopify daily, so a change shows up here.
  if (ad.priceSignature && ad.priceSignature !== priceSignature(product)) {
    throw new Error('Prices changed in Shopify since this ad was made. Unschedule it, press Refresh design on the Review page, then approve it again.');
  }
  return product;
}

/**
 * Posts the ad's images, no checks: image 1 is the single post; images 2+ (when there are any) are the
 * Instagram carousel. Used by publishPost and by the test script, so a test posts exactly what the worker would.
 */
export async function sendAd(ad: Ad, platform: Platform): Promise<string> {
  const [single, ...carousel] = ad.images.map(publicMediaUrl);
  if (platform === 'facebook') return postToFacebook(single, ad.caption);
  return carousel.length >= 2 ? postCarouselToInstagram(carousel, ad.caption) : postToInstagram(single, ad.caption);
}
