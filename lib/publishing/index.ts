// Sends one post to its platform, after checking the ad is still right to post.
import { getAd } from '@/lib/ads/repository';
import { priceSignature } from '@/lib/ads/post';
import { PUBLISH_DRY_RUN } from '@/lib/config';
import type { Post } from '@/lib/posts/types';
import { getProductWithVariants } from '@/lib/products/repository';
import { publicMediaUrl } from './media';
import { postToFacebook, postToInstagram } from './meta';

/** Publishes the post and returns its ID on the platform. Throws if it could not or should not be published. */
export async function publishPost(post: Post): Promise<string> {
  const ad = await getAd(post.adId);
  if (!ad?.images[0]) throw new Error(`Ad ${post.adId} has no image to post`);

  // The checks run in dry run too, so a test shows the same problems a real post would hit.
  const product = ad.productId ? await getProductWithVariants(ad.productId) : null;
  if (!product) throw new Error('The product is no longer in the catalog, so the ad is not posted');
  if (product.status !== 'ACTIVE') throw new Error('The product is no longer Active in Shopify, so the ad is not posted');
  // An ad must never advertise an old price. The worker syncs Shopify daily, so a change shows up here.
  if (ad.priceSignature && ad.priceSignature !== priceSignature(product)) {
    throw new Error('Prices changed in Shopify since this ad was made. Unschedule it, press Refresh design on the Review page, then approve it again.');
  }

  if (PUBLISH_DRY_RUN) {
    console.log(`[dry run] would post ad ${post.adId} to ${post.platform}`);
    return `dry-run-${post.platform}-${post.id}`;
  }

  const imageUrl = publicMediaUrl(ad.images[0]);
  if (post.platform === 'instagram') return postToInstagram(imageUrl, ad.caption);
  return postToFacebook(imageUrl, ad.caption);
}
