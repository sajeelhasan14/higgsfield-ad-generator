// When the autopilot will turn approved ads into paid Meta ads. The worker (act.ts) and the Schedule page both use
// the numbers below, so what the page promises is what the worker does.
import { AUTO_LAUNCH_WITHOUT_REVIEW } from '@/lib/config';
import { getAd } from '@/lib/ads/repository';
import type { Ad } from '@/lib/ads/types';
import { BUDGET_LIMITS } from '@/lib/paid-ads/promote';
import { lastActionAt, listLaunchableAds } from './repository';
import { getSettings } from './settings';
import { isPaused, workerStatus } from './state';

/** What each ad gets when the autopilot launches it by itself. */
export const AUTO_LAUNCH_DAILY_BUDGET = 20;
/** At most one launch a day, so results stay readable and spending rises slowly. */
export const LAUNCH_GAP_MS = 24 * 60 * 60 * 1000;

/** Long enough to reach the limit per sale, so the ad gets a fair test. E.g. £100 limit at £20/day → 5 + 1 = 6 days. */
export function autoLaunchDays(maxCostPerSale: number): number {
  return Math.min(BUDGET_LIMITS.maxDays, Math.ceil(maxCostPerSale / AUTO_LAUNCH_DAILY_BUDGET) + 1);
}

export interface PlannedLaunch {
  ad: Ad;
  earliestAt: Date; // the autopilot checks hourly, so the launch can come up to an hour after this
  dailyBudget: number;
  days: number;
}

export interface LaunchPlan {
  /** Why nothing will launch by itself right now; null when launches are on. */
  blocked: string | null;
  queue: PlannedLaunch[]; // in launch order, oldest ad first (the order act.ts uses)
}

export async function planPaidLaunches(): Promise<LaunchPlan> {
  const [settings, paused, worker, adIds, last] = await Promise.all([
    getSettings(), isPaused(), workerStatus(), listLaunchableAds(AUTO_LAUNCH_WITHOUT_REVIEW), lastActionAt('auto-launch'),
  ]);
  const ads = (await Promise.all(adIds.map(getAd))).filter((ad): ad is Ad => ad !== null);

  // The same checks runAutopilot and launchNextAd make, in plain words.
  const blocked = paused ? 'Pause everything is on, so no paid ad will launch until you resume on the Autopilot page.'
    : settings.mode !== 'full' ? `The autopilot mode is "${settings.mode}", so paid ads only launch when you press Promote on the Meta Ads page.`
    : settings.maxCostPerSale <= 0 ? 'No limit per sale is set on the Autopilot page, so the autopilot cannot launch ads.'
    : !worker.alive ? 'The worker is not running, so nothing will launch until it is back.'
    : null;

  const days = autoLaunchDays(settings.maxCostPerSale);
  // The first launch can happen 24 hours after the last one (or now); each one after that waits another 24 hours.
  const first = Math.max(Date.now(), last ? last.getTime() + LAUNCH_GAP_MS : 0);
  const queue = ads.map((ad, i) => ({ ad, earliestAt: new Date(first + i * LAUNCH_GAP_MS), dailyBudget: AUTO_LAUNCH_DAILY_BUDGET, days }));
  return { blocked, queue };
}
