// What to do with a running paid ad. Fixed rules, not AI: a money decision must be predictable and easy to explain.
// It only judges cost per sale. Real profit needs product costs, which are empty on Shopify.
import { formatPrice } from '@/lib/format';

/** An increase is at most this much, because big changes can disrupt how Meta delivers an ad. */
const INCREASE_RATE = 0.2;
const DAYS_BETWEEN_INCREASES = 3;
/** Sales needed before raising a budget, so one lucky order isn't enough. */
const ORDERS_BEFORE_INCREASE = 2;
/** After "Not now", the same advice stays away this long. */
const DAYS_AFTER_NOT_NOW = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AdFacts {
  dailyBudget: number;
  spend: number; // everything spent on this ad, over all its promotions
  orders: number; // real sales credited to this ad
  lastIncreaseAt: Date | null;
  lastNotNowAt: Date | null;
}

export interface Limits {
  maxCostPerSale: number; // 0 until the client has given the number
  roomInBudget: number; // how much more this ad can get a day before it reaches the limit for one ad
}

export type Recommendation =
  | { kind: 'wait'; reason: string }
  | { kind: 'keep'; reason: string }
  | { kind: 'pause'; reason: string }
  | { kind: 'increase'; reason: string; newBudget: number };

const gbp = (amount: number) => formatPrice(amount.toFixed(2), 'GBP');
const within = (date: Date | null, days: number, now: Date) => date !== null && now.getTime() - date.getTime() < days * DAY_MS;

function judge(ad: AdFacts, limits: Limits, now: Date): Recommendation {
  const { maxCostPerSale, roomInBudget } = limits;
  if (maxCostPerSale <= 0) return { kind: 'wait', reason: 'No advice yet: the most the client will pay in ads for one sale is not set.' };

  const spent = gbp(ad.spend);
  const limit = gbp(maxCostPerSale);
  if (ad.orders === 0) {
    if (ad.spend < maxCostPerSale) return { kind: 'wait', reason: `Too early to judge: spent ${spent} of the ${limit} it gets to win a sale.` };
    return { kind: 'pause', reason: `Spent ${spent} with no orders, and the limit is ${limit} per sale.` };
  }

  const costPerSale = ad.spend / ad.orders;
  const results = `${spent} spent, ${ad.orders} order${ad.orders === 1 ? '' : 's'}, ${gbp(costPerSale)} per sale`;
  if (costPerSale > maxCostPerSale) return { kind: 'pause', reason: `${results}, above the ${limit} limit.` };

  const doingWell = ad.orders >= ORDERS_BEFORE_INCREASE && costPerSale <= maxCostPerSale / 2;
  if (!doingWell) return { kind: 'keep', reason: `${results}, within the ${limit} limit.` };
  if (within(ad.lastIncreaseAt, DAYS_BETWEEN_INCREASES, now)) return { kind: 'keep', reason: `${results}. The budget went up recently, so it is left to settle.` };

  const rise = Math.min(Math.round(ad.dailyBudget * INCREASE_RATE * 100) / 100, roomInBudget);
  if (rise <= 0) return { kind: 'keep', reason: `${results}. Doing well, and already at the daily limit for one ad.` };
  const newBudget = Math.round((ad.dailyBudget + rise) * 100) / 100;
  return { kind: 'increase', newBudget, reason: `${results}, well under the ${limit} limit. Raise the budget from ${gbp(ad.dailyBudget)} to ${gbp(newBudget)} a day.` };
}

/** The advice for one running ad. Advice a person turned down recently becomes "keep", saying so. */
export function recommend(ad: AdFacts, limits: Limits, now = new Date()): Recommendation {
  const advice = judge(ad, limits, now);
  const actsOnAd = advice.kind === 'pause' || advice.kind === 'increase';
  if (actsOnAd && within(ad.lastNotNowAt, DAYS_AFTER_NOT_NOW, now)) return { kind: 'keep', reason: `You chose Not now, so this will be looked at again later. ${advice.reason}` };
  return advice;
}
