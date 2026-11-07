# Ad Studio Autopilot Plan

**Client:** Gym Flooring UK
**Written:** 6 November 2026
**Status:** All stages were built on 7 November 2026, and anything that acts on money by itself is switched off. See section 10.

## 1. The goal

Today a person picks each product, reviews each ad and switches each ad on. The goal is for the app to run this loop by itself:

> Choose a product → make an ad → check it → launch it → measure it → decide what to do → learn → repeat.

We are building an **autopilot with limits**, not a system with no controls. It works by itself, but a hard spending limit and an off switch always stay in place, because it spends the client's real money under the client's brand.

## 2. Where we are today

| Part | Status |
|---|---|
| Sync products from Shopify | Done |
| Make ads from real product photos | Done |
| Review, schedule and post to Facebook and Instagram | Done |
| Create paid Meta ads, switch them on and off | Done |
| Pause running ads when prices change or a product goes inactive | Done |
| Read Shopify orders and match them to ads | Done, but not yet proven on a real ad sale |
| Read spend and clicks per ad from Meta | Built, not yet proven on a real ad with results |
| Analytics page | Done |
| Meta Pixel | Not connected to the ad account as of 6 November 2026 |
| Product costs | Empty on Shopify: 0 of 137 variants on the 16 active products have a cost (checked 7 November 2026) |

## 3. How the autopilot works

| Step | What the app does | Status |
|---|---|---|
| 1. Choose | Picks a product using sales, profit, stock, and how recently it was advertised | New |
| 2. Create | Makes the image and caption, trying different angles | Mostly exists |
| 3. Check | Compares the AI image with the real photo, and checks prices and claims | Price check exists, the rest is new |
| 4. Launch | Starts the ad within the budget limit | Manual today |
| 5. Measure | Reads spend, clicks and orders | Built |
| 6. Decide | Keeps, pauses or increases budget using fixed rules | New |
| 7. Learn | Records which products and angles worked, and uses that for the next ads | New |
| 8. Report | Sends a weekly summary, alerts people to problems, and logs every decision with its reason | New |

**Fixed rules make the money decisions, not AI.** A money decision should be predictable and easy to explain, for example "paused because it spent £X with no orders". AI can suggest new angles and explain results.

## 4. How the app will judge an ad

### Real profit

Sales are not the same as profit. For each sale, the app works out:

| Example | |
|---|---|
| Selling price | £50 |
| Product cost, from Shopify | −£30 |
| **Profit before ads** | **£20** |
| Ad cost, from Meta | −£8 |
| **Real profit** | **£12** |

VAT and delivery must also be taken out of the selling price, or profit will look higher than it is.

Ad cost is the ad's spend divided by its sales. An ad that spent £40 and made 5 sales cost £8 per sale. An ad that spent £40 and made no sales is a £40 loss.

These figures are examples, not the client's real numbers.

### Where the data comes from

| Data | Source | Status |
|---|---|---|
| Sales, refunds, products sold | Shopify orders | Available |
| Which ad made the sale | Link tag saved with the Shopify order | Available |
| Spend, clicks, times shown | Meta ad reports | Available |
| Product cost | Shopify's "Cost per item" box, a list from the client, or a rough margin | Needed from the client |
| Stock levels | Shopify | Not read yet |
| Add-to-carts and checkouts | Meta Pixel | Not available until the Pixel is connected |

### Giving an ad a fair chance

An ad must spend enough before it can be judged. Spending £10 with no sale tells us nothing. Spending far more than a sale is worth, with no sale, tells us the ad is weak.

The store's average order in the last 30 days was about £373 (£11,187.32 from 30 orders). If the client could afford, for example, £150 of ads per sale:

| Daily budget | Time to spend £150 on one ad |
|---|---|
| £1 | About 5 months |
| £5 | About a month |
| £20 | About a week |

At £1 a day the autopilot would mostly be reacting to luck. This is why the budget and the Pixel both matter: the Pixel gives add-to-cart signals long before a sale happens, and it lets ads aim for purchases instead of clicks.

## 5. Build order

Each stage is safe to run on its own. The risky ones come last.

### Stage 1: Foundations

- Commit the code to git.
- Prove one real click and order through an ad.
- Connect the Meta Pixel.
- Get product costs or a rough margin from the client.
- Get the answers in section 8.

### Stage 2: Auto-create

The app chooses products and makes ads each week. A person approves them with one click. This spends no ad money, but AI images cost Higgsfield credits.

**Built on 7 November 2026, switched off until `AUTO_CREATE_ADS_PER_WEEK` is set on the server.** Most ads go to the best sellers of the last 60 days. One in every 3 tests the lowest seller with something priced at £30 or more, so slow products get a chance to grow. A product is skipped for 28 days after its last ad. Stock is used once the client tracks it. Profit is not used yet.

### Stage 3: Recommendations

The app says "pause this" or "increase that", with its reason. A person clicks to accept. This shows whether its judgment is good before it acts by itself.

**Built on 7 November 2026. It gives no advice until the limit per sale is set on the Autopilot page.** Advice appears on each running ad on the Meta Ads page, and each Accept or Not now is saved in `autopilot_log`.

| Advice | When |
|---|---|
| Wait | The ad has no orders and has spent less than the limit per sale |
| Pause | It has spent the limit with no orders, or its cost per sale is above the limit |
| Raise by 20% | It has 2 or more orders at half the limit or better, had no rise in the last 3 days, and its budget is under £100 a day |
| Keep | Anything else |

Not now hides advice for 7 days. The 20%, 3-day and 7-day values are starting numbers, and are set in `lib/autopilot/rules.ts`.

### Stage 4: Auto-pause

The app pauses poor ads by itself, because stopping is the safe direction.

### Stage 5: Auto-launch and budget changes

The app launches ads and changes budgets by itself, within the limits in section 6.

### Stage 6: Learning

New ads use what has worked before, by product type and ad angle.

**Stages 4 to 6 are built but must stay switched off** until the recommendations have proved reliable on real results and the client has agreed in writing.

## 6. Limits that always apply

- ~~A monthly and a daily spending limit the app cannot exceed.~~ Removed on 7 November 2026 by decision. Each ad has only the budget chosen when promoting it, so nothing limits total spend. The full mode should not be used without one.
- A limit on AI image spending. Built for the autopilot: `AUTO_CREATE_ADS_PER_WEEK`. Regenerating a picture by hand is not limited.
- One **Pause everything** button.
- Small, spaced-out budget increases, because big changes can disrupt how Meta delivers an ad.
- No judgment until an ad has enough data.
- No invented claims.
- The app stops if a price or stock level changes.
- Every action is logged with its reason.

## 7. Other ideas

### Most useful

- **Stock check:** never advertise a product that is out of stock.
- **Real profit on the dashboard:** show "Profit from ads" next to "Earned from ads".
- **Failure alerts:** send a message if the worker stops or Meta rejects an ad.
- **Off-site backups:** backups are currently on the same server, so one disk failure could lose them.
- **Client report:** a plain summary, such as "you spent £300, sold £2,000 and made £500 real profit".

### Later

- Show ads from the Instagram account. Ads can't use it yet, because the account isn't assigned to our system user.
- Replace an ad when the same people have seen it too often.
- Show ads to people who visited but didn't buy. This needs the Pixel.
- Use the same loop for normal Facebook and Instagram posts.
- Try video ads and carousels.
- Flag products with high refunds, or where discounts leave too little profit.
- Add AI, server and service costs to a monthly summary of whether the system is worth it.

## 8. Decisions needed

| # | Question | From |
|---|---|---|
| 1 | ~~What is the ad budget?~~ Decided on 7 November 2026: chosen for each ad when promoting it, £1 to £100 a day. No total limit | Done |
| 2 | What is the most they would pay in ads to get one sale? | Client |
| 3 | Do they agree to automatic spending, in writing? | Client |
| 4 | Should a person review ads before they go live? We recommend yes at first | Client and team |
| 5 | Product costs are empty on Shopify. Will they fill them in, send a list, or give a rough margin? | Client |
| 6 | Will they connect the Meta Pixel, and does the store have a working cookie banner? | Client |

## 9. Next steps

1. Ask the client the remaining questions in section 8.
2. Deploy, and set Weekly ads and the limit per sale on the Autopilot page.
3. Find out why ad #2 spent so far below its budget.
4. Read stock from Shopify, so the autopilot skips products that are out of stock.
5. Review the accepted and declined advice before moving `AUTOPILOT_LEVEL` past `advice`.

## 10. What is built

| Part | Where | Needs before it works |
|---|---|---|
| Weekly ads (Stage 2) | `worker/tasks/auto-create-ads.ts` | `AUTO_CREATE_ADS_PER_WEEK` |
| Advice (Stage 3) | `lib/autopilot/rules.ts`, Meta Ads page | The limit per sale, on the Autopilot page |
| Auto-pause (Stage 4) | `lib/autopilot/act.ts` | `AUTOPILOT_LEVEL=pause` and the client's written OK |
| Auto-launch and budgets (Stage 5) | `lib/autopilot/act.ts` | `AUTOPILOT_LEVEL=full` and the client's written OK |
| Automatic posting | `worker/tasks/auto-post-ads.ts` | Auto-post set to On on the Autopilot page. Only ads the autopilot made that passed the check |
| Learning (Stage 6) | `lib/autopilot/learn.ts` | Real results from paid ads |
| Automatic ad check. A brand-new ad that fails gets one new picture. An ad older than a day, or scheduled, posted or promoted, is only labelled | `lib/ads/check.ts`, `worker/tasks/check-ads.ts` | `OPENAI_API_KEY` |
| AI caption angles | `lib/ads/angles.ts` | `OPENAI_API_KEY` |
| Weekly explanation and ad ideas | `lib/autopilot/insights.ts` | `OPENAI_API_KEY`, and real spend. Ideas also need real sales |
| Pause everything, log, report | `/autopilot` page | Nothing |
| Budget for each ad | The Promote form on the Meta Ads page | Chosen per ad, £1 to £100 a day. Auto-launch uses £20 |
| After-click steps: page views, add to cart, checkout | Analytics page, overall and per ad | The Pixel linked to the ad account. Counted per ad by Meta |
| Real profit | `lib/analytics/profit.ts` | Product costs or `ROUGH_MARGIN_PERCENT` |
| Stock check | `lib/shopify/products.ts` | The client turning on stock tracking: all 137 variants are untracked |
| Alerts, worker status and 7-day report | `/autopilot` page | Nothing. They show in the app only, so someone must open the page |
| Off-site backups | `deploy/pull-backup.sh` | Running it from a laptop |

Mode (`AUTOPILOT_LEVEL`), weekly ads and the limit per sale are set on the Autopilot page, saved in the database, and override the server values named above. Secret keys stay in the server file.

Not built: the "Later" ideas in section 7, and purchase-goal ads, which need the Pixel. Ads still aim for clicks.
