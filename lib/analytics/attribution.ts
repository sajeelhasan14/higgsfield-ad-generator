// The rule that decides which ad gets the credit for an order, and how to name where an order came from.
// No database or network here, so the rule is easy to read and to test on its own.
import type { OrderVisit } from '@/lib/shopify/orders';

/** Our paid ad links carry utm_campaign=adstudio-<ad id> (lib/paid-ads/promote.ts). */
const AD_TAG = /^adstudio-(\d{1,18})$/;

export interface Credit {
  adId: string;
  visit: 'last' | 'first';
}

function adIdOf(visit: OrderVisit | null): string | null {
  return visit?.utmCampaign?.trim().match(AD_TAG)?.[1] ?? null;
}

/**
 * The visit that led straight to the purchase counts first. If that one has no tag, the first visit is checked,
 * for someone who found the product through the ad and came back later by typing the address.
 */
export function creditFor(firstVisit: OrderVisit | null, lastVisit: OrderVisit | null): Credit | null {
  const last = adIdOf(lastVisit);
  if (last) return { adId: last, visit: 'last' };
  const first = adIdOf(firstVisit);
  return first ? { adId: first, visit: 'first' } : null;
}

const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paid_social', 'paidsocial']);

/** "google" + "cpc" → "Google ads", "chatgpt.com" → "Chatgpt.com". The visit that led to the purchase names the channel. */
export function channelFor(credit: Credit | null, firstVisit: OrderVisit | null, lastVisit: OrderVisit | null): string {
  if (credit) return 'Ad Studio ads';
  const visit = lastVisit ?? firstVisit;
  const source = visit?.utmSource?.trim() || visit?.source?.trim();
  if (!source) return 'Unknown';
  const name = source[0].toUpperCase() + source.slice(1);
  return PAID_MEDIUMS.has(visit?.utmMedium?.trim().toLowerCase() ?? '') ? `${name} ads` : name;
}
