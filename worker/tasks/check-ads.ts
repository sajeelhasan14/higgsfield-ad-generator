import { checkAd } from '@/lib/ads/check';
import { claimCheckRetry, listAdsToCheck, requeueAd, saveAdCheck } from '@/lib/ads/repository';
import { logEvent } from '@/lib/autopilot/repository';
import { isPaused } from '@/lib/autopilot/state';
import { AI_ENABLED } from '@/lib/config';
import { getProductWithVariants } from '@/lib/products/repository';

const CHECK_EVERY_MS = 5 * 60 * 1000;
let nextCheck = 0;

/**
 * Every 5 minutes: finished ads get the automatic check, when an OpenAI key is set. Without a key, a person's review is the only check.
 * It saves a label. A brand-new ad that fails gets one new picture; any other ad is never changed, and a person decides.
 */
export async function checkFinishedAds(): Promise<void> {
  if (!AI_ENABLED || Date.now() < nextCheck) return;
  nextCheck = Date.now() + CHECK_EVERY_MS;
  for (const ad of await listAdsToCheck()) {
    const product = ad.productId ? await getProductWithVariants(ad.productId) : null;
    if (!product?.imageUrl) continue;
    const { passed, problems } = await checkAd(ad, product);
    await saveAdCheck(ad.id, passed, problems.join(' '));
    console.log(`Ad ${ad.id} check: ${passed ? 'passed' : 'failed'}`);

    if (!passed && !(await isPaused()) && (await claimCheckRetry(ad.id))) {
      await requeueAd(ad.id);
      await logEvent('auto-retry', `New ad #${ad.id} failed the check, so a new picture was requested: ${problems.join(' ')}`, { adId: ad.id });
    }
  }
}
