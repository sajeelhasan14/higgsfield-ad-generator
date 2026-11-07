// All SQL for the autopilot. The rules for choosing are in choose.ts.
import { POSTING_TIMEZONE } from '@/lib/config';
import { query, withTransaction } from '@/lib/db';
import type { Candidate, ProductPick } from './choose';
import type { OptionResult } from './learn';
import type { AdFacts } from './rules';

/**
 * Products that could get an ad: the same rule as the Products page (Active, with a photo), plus at least one
 * variant, because an ad without one fails. Cancelled and fully refunded orders don't count as sales.
 * The last ad date also reads the log, so a product whose ad was deleted isn't picked again straight away.
 */
export async function listCandidates(): Promise<Candidate[]> {
  return query<Candidate>(
    `SELECT p.id, p.product_type AS "productType", COALESCE(s.sales, 0)::float8 AS sales, COALESCE(s.orders, 0)::int AS orders,
            (SELECT max(v.price)::float8 FROM variants v WHERE v.product_id = p.id) AS "maxPrice",
            (SELECT COALESCE(sum(st.spend), 0)::float8 FROM ad_daily_stats st JOIN paid_ads pa ON pa.id = st.paid_ad_id JOIN ads a ON a.id = pa.ad_id
             WHERE a.product_id = p.id) AS "productSpend",
            (SELECT count(*)::int FROM orders o JOIN ads a ON a.id = o.ad_id WHERE a.product_id = p.id AND o.cancelled_at IS NULL AND o.total > 0) AS "productOrders",
            (SELECT COALESCE(sum(st.spend), 0)::float8 FROM ad_daily_stats st JOIN paid_ads pa ON pa.id = st.paid_ad_id JOIN ads a ON a.id = pa.ad_id
             JOIN products same ON same.id = a.product_id WHERE same.product_type = p.product_type AND p.product_type <> '') AS "typeSpend",
            (SELECT count(*)::int FROM orders o JOIN ads a ON a.id = o.ad_id JOIN products same ON same.id = a.product_id
             WHERE same.product_type = p.product_type AND p.product_type <> '' AND o.cancelled_at IS NULL AND o.total > 0) AS "typeOrders",
            (SELECT max(t.at) FROM (
               SELECT created_at AS at FROM ads WHERE product_id = p.id
               UNION ALL
               SELECT created_at FROM autopilot_log WHERE product_id = p.id
             ) t) AS "lastAdAt"
     FROM products p
     LEFT JOIN LATERAL (
       SELECT sum(oi.amount) AS sales, count(DISTINCT oi.order_id) AS orders
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = p.id AND o.cancelled_at IS NULL AND o.total > 0 AND o.placed_at > now() - interval '60 days'
     ) s ON true
     WHERE p.status = 'ACTIVE' AND p.in_stock AND p.image_url IS NOT NULL AND EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id)`,
  );
}

/** When the autopilot last made an ad, or null if it never has. */
export async function lastAutoCreateAt(): Promise<Date | null> {
  const [row] = await query<{ at: Date | null }>(`SELECT max(created_at) AS at FROM autopilot_log WHERE action = 'auto-create'`);
  return row?.at ?? null;
}

/** Autopilot ads nobody has dealt with yet, so unreviewed ads never pile up and keep using credits. */
export async function countAutoAdsWaiting(): Promise<number> {
  const [row] = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM ads a
     JOIN autopilot_log l ON l.ad_id = a.id AND l.action = 'auto-create'
     WHERE a.status IN ('generating', 'ready')`,
  );
  return row?.count ?? 0;
}

/**
 * The facts the rules judge, for paid ads that are switched on and have days left. Spend and orders are per ad,
 * not per promotion, because orders are credited to the ad: an ad promoted twice is judged on both runs together.
 */
export async function listRunningAdFacts(): Promise<(AdFacts & { paidAdId: string })[]> {
  return query(
    `SELECT pa.id AS "paidAdId", pa.daily_budget::float8 AS "dailyBudget",
            COALESCE((SELECT sum(s.spend) FROM ad_daily_stats s JOIN paid_ads x ON x.id = s.paid_ad_id WHERE x.ad_id = pa.ad_id), 0)::float8 AS spend,
            (SELECT count(*) FROM orders o WHERE o.ad_id = pa.ad_id AND o.cancelled_at IS NULL AND o.total > 0)::int AS orders,
            (SELECT max(l.created_at) FROM autopilot_log l WHERE l.paid_ad_id = pa.id AND l.action IN ('accept-increase', 'auto-increase')) AS "lastIncreaseAt",
            (SELECT max(l.created_at) FROM autopilot_log l WHERE l.paid_ad_id = pa.id AND l.action LIKE 'not-now-%') AS "lastNotNowAt"
     FROM paid_ads pa
     WHERE pa.status = 'active' AND (pa.ends_at IS NULL OR pa.ends_at >= now())`,
  );
}

/** Records a person's answer to a piece of advice. */
export async function logDecision(action: string, paidAdId: string, reason: string): Promise<void> {
  await query(`INSERT INTO autopilot_log (action, paid_ad_id, reason) VALUES ($1, $2, $3)`, [action, paidAdId, reason]);
}

/** Anything else the autopilot did, in its log. */
export async function logEvent(action: string, reason: string, ids: { adId?: string } = {}): Promise<void> {
  await query(`INSERT INTO autopilot_log (action, ad_id, reason) VALUES ($1, $2, $3)`, [action, ids.adId ?? null, reason]);
}

export async function lastActionAt(action: string): Promise<Date | null> {
  const [row] = await query<{ at: Date | null }>(`SELECT max(created_at) AS at FROM autopilot_log WHERE action = $1`, [action]);
  return row?.at ?? null;
}

export interface LogEntry {
  id: string;
  action: string;
  reason: string;
  createdAt: Date;
}

export async function listLog(limit = 50): Promise<LogEntry[]> {
  return query<LogEntry>(`SELECT id, action, reason, created_at AS "createdAt" FROM autopilot_log ORDER BY id DESC LIMIT $1`, [limit]);
}

/** Spend so far this calendar month, UK time, from Meta's numbers (read hourly). */
export async function spentThisMonth(): Promise<number> {
  const [row] = await query<{ spent: number }>(
    `SELECT COALESCE(sum(spend), 0)::float8 AS spent FROM ad_daily_stats WHERE day >= date_trunc('month', now() AT TIME ZONE $1::text)::date`,
    [POSTING_TIMEZONE],
  );
  return row?.spent ?? 0;
}

/** Each photo style's or caption angle's results, for ads that ran as paid ads. The column is one of the two fixed names, never user input. */
export async function listOptionResults<T extends 'look' | 'angle'>(column: T): Promise<OptionResult<T extends 'look' ? number : string>[]> {
  return query(
    `SELECT COALESCE(p.product_type, '') AS "productType", a.${column} AS option,
            COALESCE((SELECT sum(st.spend) FROM ad_daily_stats st JOIN paid_ads pa ON pa.id = st.paid_ad_id WHERE pa.ad_id = a.id), 0)::float8 AS spend,
            (SELECT count(*)::int FROM orders o WHERE o.ad_id = a.id AND o.cancelled_at IS NULL AND o.total > 0) AS orders
     FROM ads a LEFT JOIN products p ON p.id = a.product_id
     WHERE a.${column} IS NOT NULL AND EXISTS (SELECT 1 FROM paid_ads pa WHERE pa.ad_id = a.id)`,
  );
}

/**
 * Finished ads that have never been promoted, oldest first. An ad a person approved can launch unless the
 * automatic check failed it. A ready ad can launch only if allowed, and only after passing the check.
 */
export async function listLaunchableAds(withoutReview: boolean): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT a.id FROM ads a
     WHERE ((a.status = 'approved' AND a.check_status IS DISTINCT FROM 'failed') OR ($1 AND a.status = 'ready' AND a.check_status = 'passed'))
       AND NOT EXISTS (SELECT 1 FROM paid_ads pa WHERE pa.ad_id = a.id)
     ORDER BY a.created_at`,
    [withoutReview],
  );
  return rows.map((row) => row.id);
}

/** Ads the autopilot made that passed the check and were never scheduled. Ads a person made never qualify. */
export async function listAdsToAutoPost(): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT a.id FROM ads a
     JOIN autopilot_log l ON l.ad_id = a.id AND l.action = 'auto-create'
     WHERE a.status = 'ready' AND a.check_status = 'passed' AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.ad_id = a.id)
     ORDER BY a.created_at`,
  );
  return rows.map((row) => row.id);
}

/** Posts and ads that failed lately, to alert about. */
export async function listRecentFailures(): Promise<{ key: string; message: string }[]> {
  return query(
    `SELECT 'post-' || id AS key, 'Post ' || id || ' (ad #' || ad_id || ', ' || platform || ') failed: ' || COALESCE(last_error, 'no reason given') AS message
     FROM posts WHERE status = 'failed' AND run_at > now() - interval '1 day'
     UNION ALL
     SELECT 'ad-' || id, 'Ad #' || id || ' failed to generate: ' || COALESCE(error, 'no reason given')
     FROM ads WHERE status = 'failed' AND created_at > now() - interval '1 day'`,
  );
}

export interface AdIdea {
  id: string;
  idea: string;
}

/** Ideas waiting for a person. An idea seen before is skipped, so a dismissed one never comes back. */
export async function saveIdeas(ideas: string[]): Promise<void> {
  for (const idea of ideas) await query(`INSERT INTO ad_ideas (idea) VALUES ($1) ON CONFLICT (idea) DO NOTHING`, [idea]);
}

export async function listNewIdeas(): Promise<AdIdea[]> {
  return query<AdIdea>(`SELECT id, idea FROM ad_ideas WHERE status = 'new' ORDER BY id`);
}

/** Ideas a person chose to use, which join the caption angles. */
export async function listApprovedIdeas(): Promise<string[]> {
  return (await query<{ idea: string }>(`SELECT idea FROM ad_ideas WHERE status = 'approved' ORDER BY id`)).map((row) => row.idea);
}

export async function setIdeaStatus(id: string, status: 'approved' | 'dismissed'): Promise<void> {
  await query(`UPDATE ad_ideas SET status = $2 WHERE id = $1`, [id, status]);
}

/** The newest weekly explanation. Saved, so opening a page never costs an AI call. */
export async function latestInsight(): Promise<string | null> {
  const [row] = await query<{ reason: string }>(`SELECT reason FROM autopilot_log WHERE action = 'insight' ORDER BY id DESC LIMIT 1`);
  return row?.reason ?? null;
}

/** Queues the ad and logs it together: an ad without its log row would not count towards the weekly limit. */
export async function createAutoAd(pick: ProductPick, look: number, angle: string | null, reason: string): Promise<string> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(`INSERT INTO ads (product_id, status, look, angle) VALUES ($1, 'generating', $2, $3) RETURNING id`, [pick.productId, look, angle]);
    await client.query(`INSERT INTO autopilot_log (action, ad_id, product_id, reason) VALUES ('auto-create', $1, $2, $3)`, [rows[0].id, pick.productId, reason]);
    return rows[0].id;
  });
}
