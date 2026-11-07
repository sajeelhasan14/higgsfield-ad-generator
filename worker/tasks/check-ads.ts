import { checkAd } from '@/lib/ads/check';
import { listAdsToCheck, saveAdCheck } from '@/lib/ads/repository';
import { AD_CHECK_ENABLED } from '@/lib/config';
import { getProductWithVariants } from '@/lib/products/repository';

const CHECK_EVERY_MS = 5 * 60 * 1000;
let nextCheck = 0;

/** Every 5 minutes: finished ads get the automatic check, when a Claude key is set. Without a key, a person's review is the only check. */
export async function checkFinishedAds(): Promise<void> {
  if (!AD_CHECK_ENABLED || Date.now() < nextCheck) return;
  nextCheck = Date.now() + CHECK_EVERY_MS;
  for (const ad of await listAdsToCheck()) {
    const product = ad.productId ? await getProductWithVariants(ad.productId) : null;
    if (!product?.imageUrl) continue;
    const { passed, problems } = await checkAd(ad, product);
    await saveAdCheck(ad.id, passed, problems.join(' '));
    console.log(`Ad ${ad.id} check: ${passed ? 'passed' : 'failed'}`);
  }
}
