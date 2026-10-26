// All SQL for ads and their images. Nothing here knows about Higgsfield, slides or pages.
import { query, withTransaction } from '@/lib/db';
import type { Ad, AdStatus } from './types';

const AD_SELECT = `
  SELECT a.id, a.product_id AS "productId", p.title AS "productTitle", a.status, a.caption,
         a.hero_request_id AS "heroRequestId", a.hero_attempt AS "heroAttempt", a.error, a.price_signature AS "priceSignature", a.created_at AS "createdAt",
         COALESCE((SELECT array_agg(i.image_url ORDER BY i.position) FROM ad_images i WHERE i.ad_id = a.id), '{}') AS images,
         (SELECT min(s.scheduled_at) FROM posts s WHERE s.ad_id = a.id AND s.status <> 'cancelled') AS "scheduledAt"
  FROM ads a
  LEFT JOIN products p ON p.id = a.product_id`;

/**
 * One new ad per product, queued for the worker to generate. Returns how many were created.
 * Only Active products with a photo: the same rule the Products page uses, checked here too because an action can be called directly.
 */
export async function createAds(productIds: string[]): Promise<number> {
  const rows = await query(
    `INSERT INTO ads (product_id, status)
     SELECT id, 'generating' FROM products WHERE id = ANY($1::text[]) AND status = 'ACTIVE' AND image_url IS NOT NULL
     RETURNING id`,
    [productIds],
  );
  return rows.length;
}

export async function getAd(id: string): Promise<Ad | null> {
  const [ad] = await query<Ad>(`${AD_SELECT} WHERE a.id = $1`, [id]);
  return ad ?? null;
}

/** Ads for the Review page: everything not yet posted, newest first. */
export async function listAdsByStatus(statuses: AdStatus[]): Promise<Ad[]> {
  return query<Ad>(`${AD_SELECT} WHERE a.status = ANY($1::text[]) ORDER BY a.created_at DESC`, [statuses]);
}

/** Ads the worker still has to generate, oldest first. */
export async function listAdsToGenerate(limit = 5): Promise<Ad[]> {
  return query<Ad>(`${AD_SELECT} WHERE a.status = 'generating' ORDER BY a.created_at LIMIT $1`, [limit]);
}

export async function setHeroRequest(adId: string, requestId: string): Promise<void> {
  await query(`UPDATE ads SET hero_request_id = $2 WHERE id = $1 AND status = 'generating'`, [adId, requestId]);
}

/** Saves the finished image, caption and the prices it shows, and moves the ad to 'ready' for review. */
export async function markAdReady(adId: string, imageKeys: string[], caption: string, priceSignature: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM ad_images WHERE ad_id = $1', [adId]);
    for (const [i, key] of imageKeys.entries()) {
      await client.query('INSERT INTO ad_images (ad_id, position, image_url) VALUES ($1, $2, $3)', [adId, i + 1, key]);
    }
    await client.query(`UPDATE ads SET status = 'ready', caption = $2, price_signature = $3, error = NULL WHERE id = $1`, [adId, caption, priceSignature]);
  });
}

export async function markAdFailed(adId: string, error: string): Promise<void> {
  await query(`UPDATE ads SET status = 'failed', error = $2 WHERE id = $1`, [adId, error.slice(0, 1000)]);
}

/** Queues the ad to be generated again with a new AI picture (one new paid image). */
export async function requeueAd(adId: string): Promise<void> {
  const rows = await query(
    `UPDATE ads SET status = 'generating', hero_request_id = NULL, hero_attempt = hero_attempt + 1, error = NULL
     WHERE id = $1 AND status IN ('ready', 'failed') RETURNING id`,
    [adId],
  );
  if (!rows.length) throw new Error('Only a ready or failed ad can be regenerated');
}

export async function updateCaption(adId: string, caption: string): Promise<void> {
  await query(`UPDATE ads SET caption = $2 WHERE id = $1 AND status IN ('ready', 'approved')`, [adId, caption]);
}

/** Un-schedules an approved ad: its posts are cancelled and it goes back to 'ready'. */
export async function unscheduleAd(adId: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(`UPDATE posts SET status = 'cancelled' WHERE ad_id = $1 AND status = 'scheduled'`, [adId]);
    await client.query(`UPDATE ads SET status = 'ready', approved_at = NULL WHERE id = $1 AND status = 'approved'`, [adId]);
  });
}

/** Deletes an ad that was never posted (its images and posts go with it). */
export async function deleteAd(adId: string): Promise<void> {
  const rows = await query(
    `DELETE FROM ads WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM posts WHERE ad_id = $1 AND status IN ('publishing', 'published'))
     RETURNING id`,
    [adId],
  );
  if (!rows.length) throw new Error('This ad has already been posted, so it is kept for the history');
}
