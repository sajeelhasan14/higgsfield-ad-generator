import { LOOK_COUNT } from '@/lib/ads/prompts';
import { pickProducts } from '@/lib/autopilot/choose';
import { chooseLook } from '@/lib/autopilot/learn';
import { countAutoAdsWaiting, createAutoAd, lastAutoCreateAt, listCandidates, listLookResults } from '@/lib/autopilot/repository';
import { isPaused } from '@/lib/autopilot/state';
import { AUTO_CREATE_ADS_PER_WEEK, MAX_AD_COST_PER_SALE } from '@/lib/config';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 60 * 1000;
let nextCheck = 0;

/**
 * Once a week, queues new ads for the products pickProducts chooses. They stop at Review: nothing is posted or
 * spent on Meta without a person's click. The last run is read from the database, so restarting doesn't reset the week.
 */
export async function autoCreateAdsWeekly(): Promise<void> {
  if (AUTO_CREATE_ADS_PER_WEEK === 0 || Date.now() < nextCheck) return;
  nextCheck = Date.now() + CHECK_EVERY_MS; // set first, so a failure is retried in an hour, not every tick

  if (await isPaused()) return;

  const last = await lastAutoCreateAt();
  if (last && Date.now() - last.getTime() < WEEK_MS) return;

  // Ads still waiting for review use up this week's allowance.
  const room = AUTO_CREATE_ADS_PER_WEEK - (await countAutoAdsWaiting());
  if (room <= 0) return console.log('Autopilot: no new ads, the last ones are still waiting for review');

  const picks = pickProducts(await listCandidates(), room, MAX_AD_COST_PER_SALE);
  if (picks.length === 0) return console.log('Autopilot: no product can get a new ad this week');
  const lookResults = await listLookResults();
  for (const pick of picks) {
    const { look, reason } = chooseLook(lookResults, pick.productType, MAX_AD_COST_PER_SALE, LOOK_COUNT);
    const fullReason = `${pick.reason}; ${reason}`;
    const adId = await createAutoAd(pick, look, fullReason);
    console.log(`Autopilot: queued ad ${adId} (${fullReason})`);
  }
}
