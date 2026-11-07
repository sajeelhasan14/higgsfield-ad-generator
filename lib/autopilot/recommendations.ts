// Advice for the Meta Ads page, and what happens when a person accepts it or says not now.
// Nothing here runs by itself: only a click acts on an ad. Each click is logged, so the rules can be judged before Stage 4.
import { BUDGET_LIMITS, pausePaidAd, raisePaidAdBudget } from '@/lib/paid-ads/promote';
import { getPaidAd } from '@/lib/paid-ads/repository';
import { listRunningAdFacts, logDecision } from './repository';
import { recommend, type Recommendation } from './rules';
import { getSettings } from './settings';

/** The advice for every running paid ad, keyed by paid ad ID. Worked out fresh from the stored spend and orders. */
export async function listRecommendations(): Promise<Map<string, Recommendation>> {
  const [ads, { maxCostPerSale }] = await Promise.all([listRunningAdFacts(), getSettings()]);
  return new Map(ads.map((ad) => [ad.paidAdId, recommend(ad, { maxCostPerSale, roomInBudget: BUDGET_LIMITS.maxDaily - ad.dailyBudget })]));
}

/** Worked out again on click: the page may be old, and the new budget must never come from the browser. */
async function currentAdvice(paidAdId: string, kind: string): Promise<Extract<Recommendation, { kind: 'pause' | 'increase' }>> {
  const advice = (await listRecommendations()).get(paidAdId);
  if (advice?.kind !== kind || (advice.kind !== 'pause' && advice.kind !== 'increase')) throw new Error('This advice has changed. Refresh the page to see the latest.');
  return advice;
}

export async function acceptRecommendation(paidAdId: string, kind: string): Promise<string> {
  const advice = await currentAdvice(paidAdId, kind);
  if (advice.kind === 'increase') await raisePaidAdBudget(paidAdId, advice.newBudget);
  else {
    const paid = await getPaidAd(paidAdId);
    if (paid) await pausePaidAd(paid, advice.reason);
  }
  await logDecision(`accept-${advice.kind}`, paidAdId, advice.reason);
  return advice.kind === 'pause' ? 'Switched off' : 'Budget raised';
}

export async function notNowRecommendation(paidAdId: string, kind: string): Promise<string> {
  const advice = await currentAdvice(paidAdId, kind);
  await logDecision(`not-now-${advice.kind}`, paidAdId, advice.reason);
  return 'Hidden for 7 days';
}
