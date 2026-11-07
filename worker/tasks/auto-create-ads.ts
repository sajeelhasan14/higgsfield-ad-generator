import { ANGLES } from '@/lib/ads/angles';
import { LOOK_COUNT } from '@/lib/ads/prompts';
import { pickProducts } from '@/lib/autopilot/choose';
import { chooseOption } from '@/lib/autopilot/learn';
import { countAutoAdsWaiting, createAutoAd, lastAutoCreateAt, listApprovedIdeas, listCandidates, listOptionResults } from '@/lib/autopilot/repository';
import { isPaused } from '@/lib/autopilot/state';
import { getSettings } from '@/lib/autopilot/settings';
import { AI_ENABLED } from '@/lib/config';

const LOOKS = Array.from({ length: LOOK_COUNT }, (_, look) => look);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 60 * 1000;
let nextCheck = 0;

/**
 * Once a week, queues new ads for the products pickProducts chooses. They stop at Review: nothing is posted or
 * spent on Meta without a person's click. The last run is read from the database, so restarting doesn't reset the week.
 */
export async function autoCreateAdsWeekly(): Promise<void> {
  if (Date.now() < nextCheck) return;
  nextCheck = Date.now() + CHECK_EVERY_MS; // set first, so a failure is retried in an hour, not every tick

  const { weeklyAds, maxCostPerSale } = await getSettings();
  if (weeklyAds === 0 || (await isPaused())) return;

  const last = await lastAutoCreateAt();
  if (last && Date.now() - last.getTime() < WEEK_MS) return;

  // Ads still waiting for review use up this week's allowance.
  const room = weeklyAds - (await countAutoAdsWaiting());
  if (room <= 0) return console.log('Autopilot: no new ads, the last ones are still waiting for review');

  const picks = pickProducts(await listCandidates(), room, maxCostPerSale);
  if (picks.length === 0) return console.log('Autopilot: no product can get a new ad this week');
  const [lookResults, angleResults, ideas] = await Promise.all([listOptionResults('look'), listOptionResults('angle'), listApprovedIdeas()]);
  const angles = [...ANGLES, ...ideas];
  for (const pick of picks) {
    const look = chooseOption(lookResults, pick.productType, maxCostPerSale, LOOKS, (l) => `photo style ${l + 1}`);
    const angle = AI_ENABLED ? chooseOption(angleResults, pick.productType, maxCostPerSale, angles, (a) => `the "${a}" angle`) : null;
    const fullReason = [pick.reason, look.reason, angle?.reason].filter(Boolean).join('; ');
    const adId = await createAutoAd(pick, look.option, angle?.option ?? null, fullReason);
    console.log(`Autopilot: queued ad ${adId} (${fullReason})`);
  }
}
