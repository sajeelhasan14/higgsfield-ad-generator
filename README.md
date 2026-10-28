# Ad Studio

Turns the Shopify products of **Plot And Harvest Co** into Instagram and Facebook ads and posts them on a schedule.

**Flow:** Shopify sync → tick products → the worker makes each ad from the product's real photo (Higgsfield AI) → review and approve → the ad takes the next free posting time → the worker posts it to Instagram and Facebook.

## How it fits together

| Part | What it does | Code |
|---|---|---|
| Dashboard (Next.js) | Login, Products, Review, Schedule | `app/`, `components/` |
| Worker (separate process) | Generates ads, posts due posts, syncs Shopify daily | `worker/` |
| Database (PostgreSQL via `pg`) | Products, ads, posts, posting times | `db/schema.sql`, `lib/*/repository.ts` |
| Shopify | Read-only product sync (never writes to the store) | `lib/shopify/` |
| Higgsfield | Edits the real product photo into a new scene (`alibaba/qwen-image-3/edit`) | `lib/higgsfield/`, `lib/ads/` |
| Meta Graph API | Posts one image + caption to Instagram and the Facebook Page | `lib/publishing/` |
| Image files | Generated pictures and post images, in `storage/` | `lib/storage/` |

Rules that keep ads correct:

- Only **Active** products with a photo can be advertised.
- All text and prices on the image are drawn by our template from Shopify data, never by the AI.
- Right before posting, the ad's prices are compared with Shopify's current prices; if they changed, the post is stopped (unschedule → **Refresh design** → approve again).

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run migrate              # create the database tables
npm run dev                  # the dashboard, http://localhost:3000
npm run worker               # in a second terminal: generation, posting, daily sync
```

Both dry runs are on by default outside production, so testing costs nothing and posts nothing:
`GENERATION_DRY_RUN=1` uses the real Shopify photo instead of AI, and posting only logs "would post".
The top bar of the dashboard always shows which mode is on.

## Scripts

| Command | What it does |
|---|---|
| `npm run preview:ad -- "trough planter"` | Renders a real product's post into `preview/` (free) |
| `npm run try:higgsfield -- "x brace"` | Makes **one paid** AI picture for a product, to judge quality |
| `npm run meta:check` | Checks the Meta settings, read-only, before posting goes live |
| `npm run meta:check -- --try-instagram` | Also prepares an Instagram post without publishing it, to prove posting is allowed |
| `npm run meta:test-post` | On the server: posts one ready ad to the Facebook Page for real, then deletes it when you press Enter (`-- --instagram` for Instagram) |
| `npm run import:products-json` | Temporary: loads `products.json` pages saved from the store's website (in `imports/`) instead of a Shopify sync |
| `npm run migrate` | Applies `db/schema.sql` (safe to run again) |

## Going live with Instagram and Facebook

1. The client's Instagram is a **Business** account linked to their Facebook **Page**, both in their Meta Business portfolio.
2. Create a Meta app (type Business) and a **System User** with `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`; assign it the Page and the Instagram account and generate its token.
3. Fill in `META_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID` and `PUBLIC_BASE_URL` (the app's public https address; Meta downloads images from it).
4. Run `npm run meta:check` until every line shows ✓.
5. Set `PUBLISH_DRY_RUN=0` and restart the worker.

## Paid Meta ads (the Meta Ads page)

A finished ad can be promoted as a paid link ad ("Shop Now" → the product page): one campaign (Traffic) → one ad set (daily budget, days, UK adults, automatic Facebook + Instagram placements) → one ad. It is created **switched off**; pressing Switch on starts its days. The worker switches off a running paid ad within the hour if its product stops being Active or its prices change.

1. In Business settings: an ad account with a payment method, assigned to the System User with **Manage campaigns**.
2. In the Meta app: add the **Marketing API** product; regenerate the System User token with **`ads_management`** (plus the permissions above).
3. Set `META_AD_ACCOUNT_ID`, run `npm run migrate`, restart the app and the worker.

## Deploying on the VPS

Ubuntu with Node.js 22+, PostgreSQL and Caddy. Files are in `deploy/`.

```bash
# as root
adduser --system --group adstudio
git clone <repo> /opt/adstudio && chown -R adstudio:adstudio /opt/adstudio
sudo -u postgres createuser -P adgen && sudo -u postgres createdb -O adgen adgen

# as adstudio, in /opt/adstudio
npm ci                       # includes dev dependencies: the worker runs with tsx
cp .env.example .env.local   # fill in; DATABASE_URL=postgresql://adgen:…@localhost:5432/adgen
npm run migrate
npm run build

# as root
cp deploy/adstudio-web.service deploy/adstudio-worker.service /etc/systemd/system/
systemctl enable --now adstudio-web adstudio-worker
cp deploy/Caddyfile /etc/caddy/Caddyfile   # set your domain first
systemctl reload caddy
```

Updating later: `git pull && npm ci && npm run migrate && npm run build`, then `systemctl restart adstudio-web adstudio-worker`.

Keep `storage/` (the images) and the database in your backups.
