// Settings read from environment variables, in one place so each has one default and one explanation.

/** The timezone posting slots are in, so "18:00" means 18:00 in the UK, also after the clocks change. */
export const POSTING_TIMEZONE = process.env.POSTING_TIMEZONE || 'Europe/London';

/**
 * The Higgsfield model that turns the product's real photo into the ad picture (image editing).
 * The request fields in lib/ads/generate.ts are this model's; another model may need different ones.
 */
export const HIGGSFIELD_MODEL = process.env.HIGGSFIELD_MODEL || 'alibaba/qwen-image-3/edit';

/** true: use the product's real Shopify photo as it is instead of calling Higgsfield, so testing costs nothing. */
export const GENERATION_DRY_RUN = process.env.GENERATION_DRY_RUN === '1';

/**
 * How many ads the autopilot makes each week, which is also the limit on its AI image spending.
 * Off (0) unless set, because each ad uses paid Higgsfield credits. At most 10, to catch a typo.
 */
export const AUTO_CREATE_ADS_PER_WEEK = Math.min(10, Math.max(0, Math.floor(Number(process.env.AUTO_CREATE_ADS_PER_WEEK) || 0)));

/** The most the client will pay in ads to win one sale, in pounds. The advice on the Meta Ads page needs it; 0 means not set, so no advice is given. */
export const MAX_AD_COST_PER_SALE = Math.max(0, Number(process.env.MAX_AD_COST_PER_SALE) || 0);

/**
 * How far the autopilot may go by itself. advice: only gives advice. pause: also pauses poor ads.
 * full: also launches ads and raises budgets. Anything other than these means advice, so a typo can't spend money.
 */
export const AUTOPILOT_LEVEL: 'advice' | 'pause' | 'full' = process.env.AUTOPILOT_LEVEL === 'pause' || process.env.AUTOPILOT_LEVEL === 'full' ? process.env.AUTOPILOT_LEVEL : 'advice';

/** true: in full mode, ads that passed the automatic check launch without a person approving them. Off by default. */
export const AUTO_LAUNCH_WITHOUT_REVIEW = process.env.AUTO_LAUNCH_WITHOUT_REVIEW === '1';

/** The automatic ad check runs only with a Claude key. */
export const AD_CHECK_ENABLED = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

/** VAT inside the store's prices, in percent. For real profit. */
export const VAT_PERCENT = process.env.VAT_PERCENT ? Number(process.env.VAT_PERCENT) : 20;

/** Profit as a percent of the price before VAT, used for items with no cost in Shopify. Unset means no guessing. */
export const ROUGH_MARGIN_PERCENT = process.env.ROUGH_MARGIN_PERCENT ? Number(process.env.ROUGH_MARGIN_PERCENT) : null;

/** Slack or Discord incoming webhook for alerts and the weekly report. */
export const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL?.trim() || null;

/** A monitor (e.g. healthchecks.io) the worker pings hourly; it raises the alarm when the pings stop. */
export const HEALTHCHECK_PING_URL = process.env.HEALTHCHECK_PING_URL?.trim() || null;

/** Every platform the app can post to. */
export const PLATFORMS = ['instagram', 'facebook'] as const;

/**
 * Where approved ads are posted, from POST_PLATFORMS (e.g. "facebook" while the Instagram account
 * doesn't exist yet). Empty or missing means both.
 */
export const POST_PLATFORMS = (process.env.POST_PLATFORMS?.trim() || PLATFORMS.join(','))
  .split(',')
  .map((p) => p.trim())
  .filter((p): p is (typeof PLATFORMS)[number] => (PLATFORMS as readonly string[]).includes(p));

/**
 * true while Meta is not connected: the worker logs "would post" instead of posting.
 * Defaults to on outside production, so a test run can never post to the real accounts.
 */
export const PUBLISH_DRY_RUN = (process.env.PUBLISH_DRY_RUN ?? (process.env.NODE_ENV === 'production' ? '0' : '1')) === '1';

/** The Graph API version used for Instagram and Facebook calls (v26.0 is current as of July 2026). */
export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v26.0';

export interface MetaSettings {
  accessToken: string; // a System User token from the client's Meta Business portfolio
  pageId: string;
  igUserId: string;
  pageAccessToken: string | null; // optional: otherwise fetched from the Page with accessToken
}

/** Meta settings, read when posting, so a missing one gives a clear message instead of stopping the app. */
export function metaSettings(): MetaSettings {
  const read = (name: string) => process.env[name]?.trim() || '';
  // The Instagram account is only needed when Instagram is one of the platforms posted to.
  const required = ['META_ACCESS_TOKEN', 'META_PAGE_ID', ...(POST_PLATFORMS.includes('instagram') ? ['META_IG_USER_ID'] : [])];
  const missing = required.filter((name) => !read(name));
  if (missing.length) throw new Error(`Posting is not set up: add ${missing.join(', ')} to the environment (see .env.example)`);
  return {
    accessToken: read('META_ACCESS_TOKEN'),
    pageId: read('META_PAGE_ID'),
    igUserId: read('META_IG_USER_ID'),
    pageAccessToken: read('META_PAGE_ACCESS_TOKEN') || null,
  };
}

/**
 * Paid ads: the ad account ("act_123…" or just the number) and the Page the ads run as.
 * Uses the same System User token as posting; it also needs ads_management and the ad account assigned.
 */
export function metaAdsSettings(): { accessToken: string; pageId: string; adAccountId: string } {
  const read = (name: string) => process.env[name]?.trim() || '';
  const missing = ['META_ACCESS_TOKEN', 'META_PAGE_ID', 'META_AD_ACCOUNT_ID'].filter((name) => !read(name));
  if (missing.length) throw new Error(`Paid ads are not set up: add ${missing.join(', ')} to the environment (see .env.example)`);
  return {
    accessToken: read('META_ACCESS_TOKEN'),
    pageId: read('META_PAGE_ID'),
    adAccountId: `act_${read('META_AD_ACCOUNT_ID').replace(/^act_/, '')}`,
  };
}

/** The app's public https address (e.g. https://ads.example.com). Meta downloads the post images from it. */
export function publicBaseUrl(): string {
  const url = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (!url?.startsWith('https://')) throw new Error('PUBLIC_BASE_URL must be the app\'s public https address (see .env.example)');
  return url;
}
