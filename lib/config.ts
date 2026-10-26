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

/** Platforms every approved ad is posted to. */
export const PLATFORMS = ['instagram', 'facebook'] as const;

/**
 * true while Meta is not connected: the worker logs "would post" instead of posting.
 * Defaults to on outside production, so a test run can never post to the real accounts.
 */
export const PUBLISH_DRY_RUN = (process.env.PUBLISH_DRY_RUN ?? (process.env.NODE_ENV === 'production' ? '0' : '1')) === '1';
