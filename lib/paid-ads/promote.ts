// Turning a finished ad into a paid Meta ad, and switching it on and off. The same checks as posting run
// first (product still Active, prices unchanged), so a paid ad never shows a wrong price either.
import { BRAND } from '@/lib/ads/brand';
import { getAd } from '@/lib/ads/repository';
import { shortName } from '@/lib/ads/text';
import { PUBLISH_DRY_RUN } from '@/lib/config';
import { checkStillTrue } from '@/lib/publishing';
import { adAccountCurrency, createMetaAd, setAdsetEnd, setCampaignStatus } from '@/lib/publishing/meta-ads';
import { readStoredFile } from '@/lib/storage';
import { getPaidAd, insertPaidAd, listActivePaidAds, setPaidAdStatus } from './repository';

// Limits that catch a typo (500 instead of 5) before it costs money. Raise them here if the client wants more.
export const BUDGET_LIMITS = { minDaily: 1, maxDaily: 100, minDays: 1, maxDays: 30 };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Creates the paid ad on Meta, switched off. Returns the new paid ad's ID.
 * In dry run nothing is sent to Meta; a row is saved so the page can be tried out.
 */
export async function promoteAd(adId: string, dailyBudget: number, days: number): Promise<string> {
  const { minDaily, maxDaily, minDays, maxDays } = BUDGET_LIMITS;
  if (!(dailyBudget >= minDaily && dailyBudget <= maxDaily)) throw new Error(`The daily budget must be between ${minDaily} and ${maxDaily}`);
  if (!(Number.isInteger(days) && days >= minDays && days <= maxDays)) throw new Error(`The number of days must be a whole number from ${minDays} to ${maxDays}`);

  const ad = await getAd(adId);
  if (!ad || !['ready', 'approved'].includes(ad.status) || !ad.images[0]) throw new Error('Only a finished (ready or approved) ad can be promoted');
  const product = await checkStillTrue(ad);

  // The utm_ tags make these visits show up as "facebook / paid" in Shopify's reports, separate from the free posts.
  const link = `https://${BRAND.website}/products/${product.handle}?utm_source=facebook&utm_medium=paid&utm_campaign=adstudio-${ad.id}`;

  if (PUBLISH_DRY_RUN) {
    console.log(`[dry run] would create a paid ad for ad ${ad.id}: ${dailyBudget}/day for ${days} days`);
    return insertPaidAd({ adId: ad.id, dailyBudget, currency: 'GBP', days, link, ids: null });
  }

  const currency = await adAccountCurrency();
  const ids = await createMetaAd({
    name: `Ad Studio #${ad.id} · ${shortName(product.title)}`,
    image: await readStoredFile(ad.images[0]),
    message: ad.caption,
    headline: shortName(product.title),
    link,
    // Budgets go to Meta in the currency's smallest unit (pence for GBP).
    dailyBudgetMinor: Math.round(dailyBudget * 100),
    // A first end date in case it is switched on in Ads Manager; switching it on here moves it to "now + days".
    endsAt: new Date(Date.now() + days * DAY_MS),
  });
  return insertPaidAd({ adId: ad.id, dailyBudget, currency, days, link, ids });
}

/** Switches a paid ad on (spending starts once Meta has approved it) or off. */
export async function switchPaidAd(id: string, on: boolean): Promise<string> {
  const paid = await getPaidAd(id);
  if (!paid) throw new Error('This paid ad does not exist');

  if (!on) {
    if (paid.campaignId) await setCampaignStatus(paid.campaignId, 'PAUSED');
    await setPaidAdStatus(id, 'paused');
    return 'Switched off';
  }

  if (paid.endsAt && paid.endsAt.getTime() < Date.now()) throw new Error('This paid ad has finished its days. Promote the ad again for a new run.');
  const ad = await getAd(paid.adId);
  if (!ad) throw new Error('The ad no longer exists');
  await checkStillTrue(ad);

  // The first time it goes on, its days start counting now; switching off and on again keeps that end date.
  const endsAt = paid.endsAt ?? new Date(Date.now() + paid.days * DAY_MS);
  if (paid.campaignId && paid.adsetId) {
    if (!paid.endsAt) await setAdsetEnd(paid.adsetId, endsAt);
    await setCampaignStatus(paid.campaignId, 'ACTIVE');
  }
  await setPaidAdStatus(id, 'active', { endsAt });
  return paid.campaignId ? 'Switched on. It runs once Meta has reviewed it.' : 'Switched on (dry run: nothing sent to Meta)';
}

/**
 * Switches off every running paid ad that is no longer true (product not Active, prices changed).
 * Run by the worker; the reason is shown on the Meta Ads page.
 */
export async function pauseOutdatedPaidAds(): Promise<void> {
  for (const paid of await listActivePaidAds()) {
    const ad = await getAd(paid.adId);
    const problem = ad ? await checkStillTrue(ad).then(() => null, (err: Error) => err.message) : 'The ad no longer exists';
    if (!problem) continue;
    if (paid.campaignId) await setCampaignStatus(paid.campaignId, 'PAUSED');
    await setPaidAdStatus(paid.id, 'paused', { pausedReason: problem });
    console.log(`Paid ad ${paid.id} switched off: ${problem}`);
  }
}
