// All SQL for the Analytics page: saving orders and Meta's daily numbers, and adding them up.
// Nothing here talks to Shopify or Meta.
import { POSTING_TIMEZONE } from '@/lib/config';
import { query, withTransaction } from '@/lib/db';
import type { MetaAdDay } from '@/lib/publishing/meta-ads';
import type { ShopifyOrder } from '@/lib/shopify/orders';
import type { Credit } from './attribution';

export async function listAdIds(): Promise<Set<string>> {
  const rows = await query<{ id: string }>(`SELECT id FROM ads`);
  return new Set(rows.map((r) => r.id));
}

/** Adds the order or updates it. Its items are replaced, so an edited order never keeps old lines. */
export async function saveOrder(order: ShopifyOrder, credit: Credit | null, channel: string): Promise<void> {
  const visit = credit?.visit === 'first' ? order.firstVisit : (order.lastVisit ?? order.firstVisit);
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO orders (id, name, placed_at, currency, total, refunded, payment_status, cancelled_at, channel, utm_campaign, ad_id, credited_visit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, placed_at = EXCLUDED.placed_at, currency = EXCLUDED.currency, total = EXCLUDED.total,
         refunded = EXCLUDED.refunded, payment_status = EXCLUDED.payment_status, cancelled_at = EXCLUDED.cancelled_at,
         channel = EXCLUDED.channel, utm_campaign = EXCLUDED.utm_campaign, ad_id = EXCLUDED.ad_id,
         credited_visit = EXCLUDED.credited_visit, synced_at = now()`,
      [
        order.id, order.name, order.placedAt, order.currency, order.total, order.refunded, order.paymentStatus, order.cancelledAt,
        channel, visit?.utmCampaign ?? null, credit?.adId ?? null, credit?.visit ?? null,
      ],
    );
    await client.query(`DELETE FROM order_items WHERE order_id = $1`, [order.id]);
    for (const [position, item] of order.items.entries()) {
      await client.query(
        `INSERT INTO order_items (order_id, position, product_id, title, quantity, amount) VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, position, item.productId, item.title, item.quantity, item.amount],
      );
    }
  });
}

export async function listPaidAdsOnMeta(): Promise<{ id: string; metaAdId: string; createdAt: Date }[]> {
  return query(`SELECT id, meta_ad_id AS "metaAdId", created_at AS "createdAt" FROM paid_ads WHERE meta_ad_id IS NOT NULL`);
}

export async function saveAdDay(paidAdId: string, day: MetaAdDay): Promise<void> {
  await query(
    `INSERT INTO ad_daily_stats (paid_ad_id, day, spend, impressions, link_clicks, meta_purchases, meta_revenue)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (paid_ad_id, day) DO UPDATE SET
       spend = EXCLUDED.spend, impressions = EXCLUDED.impressions, link_clicks = EXCLUDED.link_clicks,
       meta_purchases = EXCLUDED.meta_purchases, meta_revenue = EXCLUDED.meta_revenue`,
    [paidAdId, day.day, day.spend, day.impressions, day.linkClicks, day.purchases, day.purchaseValue],
  );
}

export interface Summary {
  currency: string;
  spend: number;
  impressions: number;
  linkClicks: number;
  adOrders: number;
  adRevenue: number;
  storeRevenue: number;
}

/** The same period just before the chosen one, for "up 12%". */
export interface PreviousPeriod {
  spend: number;
  adOrders: number;
  adRevenue: number;
}

export interface DayPoint {
  day: string; // "2026-11-06"
  spend: number;
  revenue: number; // from our ads
  storeRevenue: number; // the whole store, ads included
}

export interface AdResult {
  adId: string;
  productTitle: string | null;
  image: string | null;
  spend: number;
  linkClicks: number;
  orders: number;
  revenue: number;
}

export interface ProductResult {
  title: string;
  quantity: number;
  revenue: number;
}

export interface ChannelResult {
  channel: string;
  orders: number;
  revenue: number;
}

export interface CreditedOrder {
  id: string;
  name: string;
  placedAt: Date;
  total: number;
  refunded: number;
  adId: string;
  productTitle: string | null;
  creditedVisit: 'last' | 'first';
}

export interface Dashboard {
  summary: Summary;
  previous: PreviousPeriod;
  daily: DayPoint[];
  ads: AdResult[];
  products: ProductResult[];
  channels: ChannelResult[];
  recentOrders: CreditedOrder[];
  lastSynced: Date | null;
}

// Every query below takes $1 = number of days, $2 = timezone. "Today" counts as one of the days.
const FROM_DAY = `(date_trunc('day', now() AT TIME ZONE $2::text) - make_interval(days => $1::int - 1))`;
const PREVIOUS_FROM_DAY = `(date_trunc('day', now() AT TIME ZONE $2::text) - make_interval(days => $1::int * 2 - 1))`;
// A cancelled or fully refunded order is not a sale.
const REAL_SALE = `o.cancelled_at IS NULL AND o.total > 0`;
const COUNTED_ORDER = `${REAL_SALE} AND o.placed_at >= (${FROM_DAY} AT TIME ZONE $2::text)`;

/** Everything the Analytics page shows, for the last `days` days in UK time. NUMERICs become plain numbers here for the sums. */
export async function getDashboard(days: number): Promise<Dashboard> {
  const params = [days, POSTING_TIMEZONE];

  const [[summary], [previous], daily, ads, products, channels, recentOrders, [{ lastSynced }]] = await Promise.all([
    query<Summary>(
      `WITH meta AS (
         SELECT COALESCE(SUM(spend), 0)::float8 AS spend, COALESCE(SUM(impressions), 0)::int AS impressions,
                COALESCE(SUM(link_clicks), 0)::int AS link_clicks
         FROM ad_daily_stats WHERE day >= ${FROM_DAY}::date
       ), sales AS (
         SELECT COUNT(*) FILTER (WHERE o.ad_id IS NOT NULL)::int AS ad_orders,
                COALESCE(SUM(o.total) FILTER (WHERE o.ad_id IS NOT NULL), 0)::float8 AS ad_revenue,
                COALESCE(SUM(o.total), 0)::float8 AS store_revenue
         FROM orders o WHERE ${COUNTED_ORDER}
       )
       SELECT COALESCE((SELECT currency FROM orders ORDER BY placed_at DESC LIMIT 1), 'GBP') AS currency,
              meta.spend, meta.impressions, meta.link_clicks AS "linkClicks",
              sales.ad_orders AS "adOrders", sales.ad_revenue AS "adRevenue", sales.store_revenue AS "storeRevenue"
       FROM meta, sales`,
      params,
    ),
    query<PreviousPeriod>(
      `SELECT (SELECT COALESCE(SUM(spend), 0)::float8 FROM ad_daily_stats
               WHERE day >= ${PREVIOUS_FROM_DAY}::date AND day < ${FROM_DAY}::date) AS spend,
              COUNT(*) FILTER (WHERE o.ad_id IS NOT NULL)::int AS "adOrders",
              COALESCE(SUM(o.total) FILTER (WHERE o.ad_id IS NOT NULL), 0)::float8 AS "adRevenue"
       FROM orders o
       WHERE ${REAL_SALE} AND o.placed_at >= (${PREVIOUS_FROM_DAY} AT TIME ZONE $2::text) AND o.placed_at < (${FROM_DAY} AT TIME ZONE $2::text)`,
      params,
    ),
    query<DayPoint>(
      `SELECT to_char(d, 'YYYY-MM-DD') AS day, COALESCE(s.spend, 0)::float8 AS spend,
              COALESCE(r.revenue, 0)::float8 AS revenue, COALESCE(r.store_revenue, 0)::float8 AS "storeRevenue"
       FROM generate_series(${FROM_DAY}, date_trunc('day', now() AT TIME ZONE $2::text), interval '1 day') AS d
       LEFT JOIN (SELECT day, SUM(spend) AS spend FROM ad_daily_stats GROUP BY day) s ON s.day = d::date
       LEFT JOIN (
         SELECT (o.placed_at AT TIME ZONE $2::text)::date AS day, SUM(o.total) AS store_revenue,
                COALESCE(SUM(o.total) FILTER (WHERE o.ad_id IS NOT NULL), 0) AS revenue
         FROM orders o WHERE ${COUNTED_ORDER} GROUP BY 1
       ) r ON r.day = d::date
       ORDER BY d`,
      params,
    ),
    query<AdResult>(
      `WITH spent AS (
         SELECT pa.ad_id, SUM(s.spend) AS spend, SUM(s.link_clicks) AS link_clicks
         FROM ad_daily_stats s JOIN paid_ads pa ON pa.id = s.paid_ad_id
         WHERE s.day >= ${FROM_DAY}::date GROUP BY pa.ad_id
       ), sold AS (
         SELECT o.ad_id, COUNT(*) AS orders, SUM(o.total) AS revenue
         FROM orders o WHERE o.ad_id IS NOT NULL AND ${COUNTED_ORDER} GROUP BY o.ad_id
       )
       SELECT a.id AS "adId", p.title AS "productTitle",
              (SELECT i.image_url FROM ad_images i WHERE i.ad_id = a.id ORDER BY i.position LIMIT 1) AS image,
              COALESCE(spent.spend, 0)::float8 AS spend, COALESCE(spent.link_clicks, 0)::int AS "linkClicks",
              COALESCE(sold.orders, 0)::int AS orders, COALESCE(sold.revenue, 0)::float8 AS revenue
       FROM spent FULL JOIN sold USING (ad_id)
       JOIN ads a ON a.id = ad_id
       LEFT JOIN products p ON p.id = a.product_id
       ORDER BY revenue DESC, spend DESC`,
      params,
    ),
    query<ProductResult>(
      `SELECT i.title, SUM(i.quantity)::int AS quantity, SUM(i.amount)::float8 AS revenue
       FROM order_items i JOIN orders o ON o.id = i.order_id
       WHERE o.ad_id IS NOT NULL AND ${COUNTED_ORDER}
       GROUP BY i.title ORDER BY revenue DESC LIMIT 5`,
      params,
    ),
    query<ChannelResult>(
      `SELECT o.channel, COUNT(*)::int AS orders, SUM(o.total)::float8 AS revenue
       FROM orders o WHERE ${COUNTED_ORDER}
       GROUP BY o.channel ORDER BY revenue DESC`,
      params,
    ),
    query<CreditedOrder>(
      `SELECT o.id, o.name, o.placed_at AS "placedAt", o.total::float8 AS total, o.refunded::float8 AS refunded,
              o.ad_id AS "adId", p.title AS "productTitle", o.credited_visit AS "creditedVisit"
       FROM orders o JOIN ads a ON a.id = o.ad_id LEFT JOIN products p ON p.id = a.product_id
       WHERE ${COUNTED_ORDER}
       ORDER BY o.placed_at DESC LIMIT 5`,
      params,
    ),
    query<{ lastSynced: Date | null }>(`SELECT MAX(synced_at) AS "lastSynced" FROM orders`),
  ]);

  return { summary, previous, daily, ads, products, channels, recentOrders, lastSynced };
}
