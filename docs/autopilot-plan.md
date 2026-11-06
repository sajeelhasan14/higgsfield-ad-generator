# Ad Studio Autopilot Plan

**Client:** Gym Flooring UK
**Written:** 6 November 2026
**Status:** Plan only. Nothing in this document has been built yet, except where it says so.

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
| Product costs | Not read yet. We don't know if they are filled in on Shopify |

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
| Product cost | Shopify's "Cost per item" box, a list from the client, or a rough margin | To check |
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
- Check how many products have a cost in Shopify.
- Get the answers in section 8.

### Stage 2: Auto-create

The app chooses products and makes ads each week. A person approves them with one click. This spends no ad money, but AI images cost Higgsfield credits.

### Stage 3: Recommendations

The app says "pause this" or "increase that", with its reason. A person clicks to accept. This shows whether its judgment is good before it acts by itself.

### Stage 4: Auto-pause

The app pauses poor ads by itself, because stopping is the safe direction.

### Stage 5: Auto-launch and budget changes

The app launches ads and changes budgets by itself, within the limits in section 6.

### Stage 6: Learning

New ads use what has worked before, by product type and ad angle.

**Build stages 1 to 3 now.** Stages 4 to 6 wait until the recommendations have proved reliable on real results.

## 6. Limits that always apply

- A monthly and a daily spending limit the app cannot exceed.
- A limit on AI image spending.
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
| 1 | What is the monthly ad budget? | Client |
| 2 | What is the most they would pay in ads to get one sale? | Client |
| 3 | Do they agree to automatic spending, in writing? | Client |
| 4 | Should a person review ads before they go live? We recommend yes at first | Client and team |
| 5 | Are product costs in Shopify, or will they give a list or rough margin? | Client |
| 6 | Will they connect the Meta Pixel, and does the store have a working cookie banner? | Client |

## 9. Next steps

1. Confirm the latest update is live on the server.
2. Check that ad #2 has started spending.
3. Run a read-only check of product costs in Shopify.
4. Ask the client the questions in section 8.
5. Start Stage 2.
