// Which products get a new ad. Fixed rules, not AI, so every choice can be explained in one line.
// Profit and stock are not used yet: product costs are empty on Shopify and stock is not read.
import { formatPrice } from '@/lib/format';

/** A product is left alone this long after its last ad, so the same few products don't fill every week. */
export const COOLDOWN_DAYS = 28;

/** One ad in every this many tests a low seller, to find products that could grow. */
const ADS_PER_GROWTH_TEST = 3;
/** A low seller must have something priced at least this, so cheap add-ons aren't sent to win sales that can't pay for an ad. */
const MIN_PRICE_FOR_GROWTH_TEST = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Candidate {
  id: string;
  productType: string;
  sales: number; // value of its orders in the last 60 days
  orders: number;
  lastAdAt: Date | null; // null: never advertised
  maxPrice: number; // its dearest variant
  productSpend: number; // what its own paid ads have spent, and the orders they brought
  productOrders: number;
  typeSpend: number; // the same, for every product of this type
  typeOrders: number;
}

export interface ProductPick {
  productId: string;
  productType: string;
  reason: string;
}

/** What past ads say: 1 this type of product sold within the limit, -1 this product's own ads failed, 0 nothing known yet. */
function adHistory(c: Candidate, maxCostPerSale: number): -1 | 0 | 1 {
  if (maxCostPerSale <= 0) return 0;
  if (c.productOrders === 0 && c.productSpend >= maxCostPerSale) return -1;
  if (c.typeOrders > 0 && c.typeSpend / c.typeOrders <= maxCostPerSale) return 1;
  return 0;
}

const HISTORY_NOTE = { '-1': ', its last ads sold nothing', '0': '', '1': ', ads for this type of product have sold' };

/**
 * Most ads go to the safest bets: what past ads say first, then best sellers; when sales are equal, the product that
 * has waited longest. One in every 3 goes to the lowest seller worth testing, so slow products get a chance to grow.
 * If no product is worth testing, the place goes to the next best seller.
 */
export function pickProducts(candidates: Candidate[], count: number, maxCostPerSale = 0, now = new Date()): ProductPick[] {
  const daysSince = (date: Date) => Math.floor((now.getTime() - date.getTime()) / DAY_MS);
  const ranked = candidates
    .filter((c) => !c.lastAdAt || daysSince(c.lastAdAt) >= COOLDOWN_DAYS)
    .sort((a, b) => adHistory(b, maxCostPerSale) - adHistory(a, maxCostPerSale) || b.sales - a.sales || (a.lastAdAt?.getTime() ?? 0) - (b.lastAdAt?.getTime() ?? 0) || a.id.localeCompare(b.id));

  const growthPlaces = Math.floor(count / ADS_PER_GROWTH_TEST);
  const best = ranked.slice(0, count - growthPlaces);
  const growth = ranked
    .slice(count - growthPlaces)
    .filter((c) => c.maxPrice >= MIN_PRICE_FOR_GROWTH_TEST && adHistory(c, maxCostPerSale) !== -1)
    .sort((a, b) => a.sales - b.sales || (a.lastAdAt?.getTime() ?? 0) - (b.lastAdAt?.getTime() ?? 0) || a.id.localeCompare(b.id))
    .slice(0, growthPlaces);
  const used = new Set([...best, ...growth]);
  const fill = ranked.filter((c) => !used.has(c)).slice(0, count - best.length - growth.length);

  return [...best, ...fill, ...growth]
    .map((c) => {
      const test = growth.includes(c) ? 'growth test for a low seller: ' : '';
      const sales = c.orders ? `${formatPrice(String(c.sales), 'GBP')} of sales from ${c.orders} order${c.orders === 1 ? '' : 's'} in the last 60 days` : 'no sales in the last 60 days';
      const history = c.lastAdAt ? `last advertised ${daysSince(c.lastAdAt)} days ago` : 'never advertised';
      return { productId: c.id, productType: c.productType, reason: `${test}${sales}, ${history}${HISTORY_NOTE[adHistory(c, maxCostPerSale)]}` };
    });
}
