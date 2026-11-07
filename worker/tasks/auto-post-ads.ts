import { approveAd } from '@/lib/ads/approve';
import { listAdsToAutoPost, logEvent } from '@/lib/autopilot/repository';
import { getSettings } from '@/lib/autopilot/settings';
import { isPaused } from '@/lib/autopilot/state';
import { formatSlotTime } from '@/lib/format';

const CHECK_EVERY_MS = 5 * 60 * 1000;
let nextCheck = 0;

/**
 * Every 5 minutes, when Auto-post is on: ads the autopilot made that passed the check are approved, exactly as if a
 * person pressed Approve & schedule. Ads a person made, and ads that failed the check, always wait for a person.
 */
export async function autoPostAds(): Promise<void> {
  if (Date.now() < nextCheck) return;
  nextCheck = Date.now() + CHECK_EVERY_MS;
  const { autoPost } = await getSettings();
  if (!autoPost || (await isPaused())) return;

  for (const adId of await listAdsToAutoPost()) {
    const at = await approveAd(adId);
    await logEvent('auto-post', `Ad #${adId} passed the check and was scheduled for ${formatSlotTime(at)}`, { adId });
    console.log(`Auto-post: ad ${adId} scheduled`);
  }
}
