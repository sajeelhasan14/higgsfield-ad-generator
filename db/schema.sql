-- Every statement is safe to run again (IF NOT EXISTS), so `npm run migrate` can be re-run after adding tables.

-- One row per Shopify product. id is Shopify's own ID (gid://shopify/Product/123),
-- so a second sync updates the same row instead of adding a duplicate.
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  handle TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  vendor TEXT NOT NULL DEFAULT '',
  product_type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,                        -- ACTIVE, DRAFT or ARCHIVED (Shopify's values)
  image_url TEXT NULL,
  shopify_updated_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per variant (e.g. "20mm / Black"). Deleting a product deletes its variants.
CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sku TEXT NULL,
  price NUMERIC(12, 2) NOT NULL,
  compare_at_price NUMERIC(12, 2) NULL,         -- the "was" price, when the variant is on sale
  options JSONB NOT NULL DEFAULT '[]',          -- e.g. [{"name":"Thickness","value":"20mm"}]
  image_url TEXT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS variants_product_id_idx ON variants(product_id);

-- Added after the first version: the store's currency (e.g. GBP), so ads can show "£45.00".
-- ADD COLUMN IF NOT EXISTS updates databases that already have the table.
ALTER TABLE variants ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'GBP';

-- One ad = one carousel for one product. Its lifecycle:
--   draft → generating → ready (all images done) → approved (scheduled into posts); failed if generation fails.
-- SET NULL keeps an ad's history if its product is later removed from Shopify.
CREATE TABLE IF NOT EXISTS ads (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NULL REFERENCES products(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'approved', 'failed')),
  caption TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ NULL
);

-- Generation: the worker submits the hero picture to Higgsfield (hero_request_id), checks it on later
-- ticks, then renders the slides. hero_attempt goes up on each "regenerate", so each try gets its own
-- Higgsfield idempotency key. error holds the reason when status is 'failed'.
ALTER TABLE ads ADD COLUMN IF NOT EXISTS hero_request_id TEXT NULL;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS hero_attempt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS error TEXT NULL;

-- The variant prices the post image was drawn with (e.g. "id:208.00|id:84.00"). Checked again right before
-- posting: if Shopify's prices changed since, the post is stopped instead of advertising a wrong price.
ALTER TABLE ads ADD COLUMN IF NOT EXISTS price_signature TEXT NULL;

-- An ad's images, in order. Position 1 is the single post; positions 2+ are the Instagram carousel slides,
-- when there is one. image_url holds the file's storage key (e.g. "ads/12/a1-slide-1-….jpg"); lib/storage turns it into a URL.
CREATE TABLE IF NOT EXISTS ad_images (
  ad_id BIGINT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  PRIMARY KEY (ad_id, position)
);

-- One row per ad per platform. kind is 'organic' (a normal post) for now; paid ads will be another kind.
-- scheduled_at is the slot shown to people; run_at is when the worker should next try (later than
-- scheduled_at after a failed attempt).
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  kind TEXT NOT NULL DEFAULT 'organic' CHECK (kind IN ('organic')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  run_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ NULL,                 -- when the worker started publishing; spots a post a crash left half-done
  last_error TEXT NULL,
  external_id TEXT NULL,                       -- the post's ID on Instagram/Facebook once published
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ad_id, platform, kind)
);
-- The post's web address (e.g. https://www.instagram.com/p/…), asked from Meta after publishing,
-- because an Instagram address can't be built from external_id.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS permalink TEXT NULL;

-- The worker asks "which scheduled posts are due?" every 30 seconds; this index answers it quickly.
CREATE INDEX IF NOT EXISTS posts_due_idx ON posts(status, run_at);

-- Daily posting times, in POSTING_TIMEZONE (e.g. 12:00 and 18:00 UK time).
CREATE TABLE IF NOT EXISTS posting_slots (
  time_of_day TIME PRIMARY KEY
);

-- Default slots, only when the table is empty, so re-running migrate never brings back a slot you deleted.
INSERT INTO posting_slots (time_of_day)
SELECT t FROM (VALUES (TIME '12:00'), (TIME '18:00')) AS defaults(t)
WHERE NOT EXISTS (SELECT 1 FROM posting_slots);

-- Paid Meta ads (Marketing API). One row per time an ad is promoted; an ad can be promoted more than once.
-- Each row is one Meta campaign with one ad set (budget, audience, end date) and one ad (the picture + caption + link).
-- It is created paused; status is what we last set ('paused' or 'active'). Meta's own view (in review,
-- rejected, running…) is read live from Meta. The Meta IDs are NULL for one made in dry run.
-- An ad that has been promoted can't be deleted (no ON DELETE), so the spend history stays.
CREATE TABLE IF NOT EXISTS paid_ads (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES ads(id),
  status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('paused', 'active')),
  daily_budget NUMERIC(10, 2) NOT NULL,        -- in the ad account's currency, e.g. 5.00
  currency TEXT NOT NULL,
  days INTEGER NOT NULL,                       -- how long it runs once switched on
  link TEXT NOT NULL,                          -- the product page the "Shop Now" button opens
  ends_at TIMESTAMPTZ NULL,                    -- set when first switched on: now + days
  paused_reason TEXT NULL,                     -- why the worker switched it off (e.g. prices changed in Shopify)
  campaign_id TEXT NULL,
  adset_id TEXT NULL,
  creative_id TEXT NULL,
  meta_ad_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS paid_ads_ad_id_idx ON paid_ads(ad_id);
