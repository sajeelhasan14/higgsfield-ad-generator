// When the autopilot will next make new ads by itself, and for which products. The worker (auto-create-ads.ts) and
// the Schedule page both use these rules, so what the page promises is what the worker does.
import { getProductWithVariants } from '@/lib/products/repository';
import { pickProducts } from './choose';
import { countAutoAdsWaiting, lastAutoCreateAt, listCandidates } from './repository';
import { getSettings } from './settings';
import { isPaused, workerStatus } from './state';

/** A new batch is made this long after the last one. */
export const CREATE_GAP_MS = 7 * 24 * 60 * 60 * 1000;

export interface BatchPlan {
  /** Why no batch will be made by itself; null when one will. */
  blocked: string | null;
  earliestAt: Date; // the worker checks hourly, so it can come up to an hour after this
  count: number; // how many ads the batch will make
  /** The products that would be chosen if the batch ran right now. Sales and stock can change that by then. */
  likely: { title: string; reason: string }[];
}

export async function planNextBatch(): Promise<BatchPlan> {
  const [settings, paused, worker, last, waiting] = await Promise.all([getSettings(), isPaused(), workerStatus(), lastAutoCreateAt(), countAutoAdsWaiting()]);
  const earliestAt = new Date(Math.max(Date.now(), last ? last.getTime() + CREATE_GAP_MS : 0));
  // Ads from the last batch that nobody has dealt with use up places, as in the worker.
  const count = Math.max(0, settings.weeklyAds - waiting);

  const blocked = paused ? 'Pause everything is on, so no new ads will be made until you resume on the Autopilot page.'
    : settings.weeklyAds === 0 ? 'Weekly ads is 0 on the Autopilot page, so no new ads will be made by themselves.'
    : count === 0 ? `The last ${waiting} new ad${waiting === 1 ? ' is' : 's are'} still waiting on the Review page, so no more will be made until they are dealt with.`
    : !worker.alive ? 'The worker is not running, so nothing will be made until it is back.'
    : null;

  const picks = blocked ? [] : pickProducts(await listCandidates(), count, settings.maxCostPerSale);
  const likely = await Promise.all(picks.map(async (pick) => ({
    title: (await getProductWithVariants(pick.productId))?.title ?? 'Unknown product',
    reason: pick.reason,
  })));
  return { blocked, earliestAt, count, likely };
}
