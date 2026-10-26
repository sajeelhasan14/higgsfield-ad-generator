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

/** The app's public https address (e.g. https://ads.example.com). Meta downloads the post images from it. */
export function publicBaseUrl(): string {
  const url = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (!url?.startsWith('https://')) throw new Error('PUBLIC_BASE_URL must be the app\'s public https address (see .env.example)');
  return url;
}
