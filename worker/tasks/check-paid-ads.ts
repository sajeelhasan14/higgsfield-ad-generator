import { pauseOutdatedPaidAds } from '@/lib/paid-ads/promote';

const CHECK_EVERY_MS = 60 * 60 * 1000;
let nextCheck = 0;

/**
 * Once an hour: a running paid ad whose product went inactive or whose prices changed is switched off,
 * because unlike a post it keeps being shown after it went live. Prices are as fresh as the daily Shopify sync.
 */
export async function checkPaidAds(): Promise<void> {
  if (Date.now() < nextCheck) return;
  nextCheck = Date.now() + CHECK_EVERY_MS;
  await pauseOutdatedPaidAds();
}
