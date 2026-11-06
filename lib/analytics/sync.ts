// Copies the numbers from Shopify and Meta into our database. Run by the worker; both only read from those services.
import { POSTING_TIMEZONE } from '@/lib/config';
import { readAdDailyStats } from '@/lib/publishing/meta-ads';
import { fetchOrders } from '@/lib/shopify/orders';
import { channelFor, creditFor } from './attribution';
import { listAdIds, listPaidAdsOnMeta, saveAdDay, saveOrder } from './repository';

/** Reads every order again, not only new ones, so refunds and late visit details reach the dashboard. */
export async function syncOrders(): Promise<number> {
  const [orders, adIds] = await Promise.all([fetchOrders(), listAdIds()]);
  for (const order of orders) {
    const found = creditFor(order.firstVisit, order.lastVisit);
    // A tag for an ad we don't have (e.g. made on another copy of the app) earns no credit.
    const credit = found && adIds.has(found.adId) ? found : null;
    await saveOrder(order, credit, channelFor(credit, order.firstVisit, order.lastVisit));
  }
  return orders.length;
}

/** "2026-11-06" in UK time, the same day boundaries as the ad account. */
function ukDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: POSTING_TIMEZONE }).format(date);
}

/** Reads each paid ad's days from when it was made until today. With no paid ads it does nothing, so Meta needn't be set up. */
export async function syncAdStats(): Promise<number> {
  const paidAds = await listPaidAdsOnMeta();
  if (paidAds.length === 0) return 0;

  const earliest = paidAds.reduce((min, p) => (p.createdAt < min ? p.createdAt : min), paidAds[0].createdAt);
  const days = await readAdDailyStats(paidAds.map((p) => p.metaAdId), ukDay(earliest), ukDay(new Date()));

  const paidAdIdOf = new Map(paidAds.map((p) => [p.metaAdId, p.id]));
  for (const day of days) {
    const paidAdId = paidAdIdOf.get(day.metaAdId);
    if (paidAdId) await saveAdDay(paidAdId, day);
  }
  return days.length;
}
