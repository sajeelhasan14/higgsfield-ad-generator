// All SQL for paid ads. Nothing here talks to Meta.
import { query } from '@/lib/db';

export interface PaidAd {
  id: string;
  adId: string;
  productTitle: string | null;
  image: string | null; // storage key of the ad's picture, for the thumbnail
  status: 'paused' | 'active';
  dailyBudget: string; // NUMERIC comes back from pg as a string, e.g. "5.00"
  currency: string;
  days: number;
  link: string;
  endsAt: Date | null;
  finished: boolean; // its days are over (ends_at has passed)
  pausedReason: string | null;
  campaignId: string | null; // null for one made in dry run
  adsetId: string | null;
  metaAdId: string | null;
  createdAt: Date;
}

const PAID_AD_SELECT = `
  SELECT pa.id, pa.ad_id AS "adId", p.title AS "productTitle",
         (SELECT i.image_url FROM ad_images i WHERE i.ad_id = pa.ad_id ORDER BY i.position LIMIT 1) AS image,
         pa.status, pa.daily_budget AS "dailyBudget", pa.currency, pa.days, pa.link, pa.ends_at AS "endsAt",
         COALESCE(pa.ends_at < now(), false) AS finished,
         pa.paused_reason AS "pausedReason", pa.campaign_id AS "campaignId", pa.adset_id AS "adsetId",
         pa.meta_ad_id AS "metaAdId", pa.created_at AS "createdAt"
  FROM paid_ads pa
  JOIN ads a ON a.id = pa.ad_id
  LEFT JOIN products p ON p.id = a.product_id`;

export async function insertPaidAd(row: {
  adId: string;
  dailyBudget: number;
  currency: string;
  days: number;
  link: string;
  ids: { campaignId: string; adsetId: string; creativeId: string; adId: string } | null;
}): Promise<string> {
  const [inserted] = await query<{ id: string }>(
    `INSERT INTO paid_ads (ad_id, daily_budget, currency, days, link, campaign_id, adset_id, creative_id, meta_ad_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [row.adId, row.dailyBudget, row.currency, row.days, row.link, row.ids?.campaignId, row.ids?.adsetId, row.ids?.creativeId, row.ids?.adId],
  );
  return inserted.id;
}

/** Every promotion, newest first, for the Meta Ads page. */
export async function listPaidAds(): Promise<PaidAd[]> {
  return query<PaidAd>(`${PAID_AD_SELECT} ORDER BY pa.created_at DESC`);
}

export async function listActivePaidAds(): Promise<PaidAd[]> {
  return query<PaidAd>(`${PAID_AD_SELECT} WHERE pa.status = 'active'`);
}

export async function getPaidAd(id: string): Promise<PaidAd | null> {
  const [row] = await query<PaidAd>(`${PAID_AD_SELECT} WHERE pa.id = $1`, [id]);
  return row ?? null;
}

/** Switching on clears any old pause reason; endsAt is only given the first time it is switched on. */
export async function setPaidAdStatus(id: string, status: PaidAd['status'], extra: { endsAt?: Date; pausedReason?: string } = {}): Promise<void> {
  await query(
    `UPDATE paid_ads SET status = $2, ends_at = COALESCE($3, ends_at), paused_reason = $4 WHERE id = $1`,
    [id, status, extra.endsAt ?? null, extra.pausedReason ?? null],
  );
}
