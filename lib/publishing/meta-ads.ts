// The only file that talks to Meta's Marketing API (paid ads). An ad on Meta is three nested objects:
// campaign (the goal: traffic to the website) → ad set (daily budget, end date, who sees it) → ad (picture,
// text, "Shop Now" link). We make one of each per promotion, so each can be switched on and off by itself.
import { metaAdsSettings } from '@/lib/config';
import { graph } from './meta';

/** Who sees the ads: people in the UK (the store only delivers there), adults. Meta finds the buyers within that. */
const AUDIENCE = {
  geo_locations: { countries: ['GB'] },
  age_min: 18,
  age_max: 65,
  // Advantage+ audience: Meta may widen age beyond the range above if it finds buyers there; the country stays fixed.
  targeting_automation: { advantage_audience: 1 },
};

export interface NewMetaAd {
  name: string; // shown in Ads Manager, e.g. "Ad Studio #12 · 30mm Acoustic Tiles"
  image: Buffer; // the post JPEG
  message: string; // the text above the picture (the caption)
  headline: string; // the bold line under the picture
  link: string; // the product page
  dailyBudgetMinor: number; // pence (the ad account's currency, smallest unit)
  endsAt: Date;
}

export interface MetaAdIds {
  campaignId: string;
  adsetId: string;
  creativeId: string;
  adId: string;
}

/** The ad account's currency (e.g. "GBP"): budgets are always in it. */
export async function adAccountCurrency(): Promise<string> {
  const { accessToken, adAccountId } = metaAdsSettings();
  const account = await graph<{ currency: string }>(adAccountId, { fields: 'currency', access_token: accessToken });
  return account.currency;
}

/**
 * Creates campaign → ad set → ad. The campaign is created PAUSED, so nothing is spent until it is switched on;
 * the ad set and ad underneath are active, so switching on the campaign is the one switch.
 * If a step fails, the campaign (and whatever was made under it) is deleted again, so no half-made ad is left.
 */
export async function createMetaAd(ad: NewMetaAd): Promise<MetaAdIds> {
  const { accessToken, adAccountId, pageId } = metaAdsSettings();
  const token = { access_token: accessToken };

  // 1. Upload the picture into the ad account; Meta answers with a "hash" that the ad refers to.
  const uploaded = await graph<{ images: Record<string, { hash: string }> }>(
    `${adAccountId}/adimages`,
    { bytes: ad.image.toString('base64'), ...token },
    'POST',
  );
  const imageHash = Object.values(uploaded.images)[0]?.hash;
  if (!imageHash) throw new Error('Meta: the picture upload returned no image hash');

  // 2. The campaign: the goal is clicks to the website. special_ad_categories is required ([] = not housing, jobs, credit…).
  const campaign = await graph<{ id: string }>(
    `${adAccountId}/campaigns`,
    {
      name: ad.name,
      objective: 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      special_ad_categories: '[]',
      // The budget is set on the ad set, not shared across the campaign.
      is_adset_budget_sharing_enabled: 'false',
      ...token,
    },
    'POST',
  );

  try {
    // 3. The ad set: budget, end date, audience. No placements given = Meta's automatic ones (Facebook + Instagram).
    const adset = await graph<{ id: string }>(
      `${adAccountId}/adsets`,
      {
        name: ad.name,
        campaign_id: campaign.id,
        daily_budget: String(ad.dailyBudgetMinor),
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        destination_type: 'WEBSITE',
        targeting: JSON.stringify(AUDIENCE),
        end_time: ad.endsAt.toISOString(),
        status: 'ACTIVE',
        ...token,
      },
      'POST',
    );

    // 4. The creative: what people see. A link ad, so the picture and the "Shop Now" button open the product page.
    const creative = await graph<{ id: string }>(
      `${adAccountId}/adcreatives`,
      {
        name: ad.name,
        object_story_spec: JSON.stringify({
          page_id: pageId,
          link_data: {
            image_hash: imageHash,
            link: ad.link,
            message: ad.message,
            name: ad.headline,
            call_to_action: { type: 'SHOP_NOW', value: { link: ad.link } },
          },
        }),
        ...token,
      },
      'POST',
    );

    // 5. The ad: puts the creative into the ad set. Meta reviews it before it can run.
    const metaAd = await graph<{ id: string }>(
      `${adAccountId}/ads`,
      { name: ad.name, adset_id: adset.id, creative: JSON.stringify({ creative_id: creative.id }), status: 'ACTIVE', ...token },
      'POST',
    );

    return { campaignId: campaign.id, adsetId: adset.id, creativeId: creative.id, adId: metaAd.id };
  } catch (err) {
    await graph(campaign.id, token, 'DELETE').catch(() => {}); // best effort; the error below is the one that matters
    throw err;
  }
}

/** Switches the whole promotion on or off (the campaign; its ad set and ad follow it). */
export async function setCampaignStatus(campaignId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> {
  const { accessToken } = metaAdsSettings();
  await graph(campaignId, { status, access_token: accessToken }, 'POST');
}

/** Moves the ad set's end date, e.g. to "now + days" when it is first switched on. */
export async function setAdsetEnd(adsetId: string, endsAt: Date): Promise<void> {
  const { accessToken } = metaAdsSettings();
  await graph(adsetId, { end_time: endsAt.toISOString(), access_token: accessToken }, 'POST');
}

export interface MetaAdLive {
  /** Meta's view of the ad: ACTIVE, PAUSED, CAMPAIGN_PAUSED, PENDING_REVIEW, IN_PROCESS, DISAPPROVED, WITH_ISSUES… */
  effectiveStatus: string;
  spend: string; // in the account currency, e.g. "4.12"
  impressions: number;
  clicks: number;
}

/** Status and results so far, for several promotions. Keyed by the Meta ad ID. */
export async function readMetaAds(ads: { adId: string; campaignId: string }[]): Promise<Map<string, MetaAdLive>> {
  const result = new Map<string, MetaAdLive>();
  if (ads.length === 0) return result;
  const { accessToken, adAccountId } = metaAdsSettings();

  // One read per ad, all at once: Graph API v26 removed the ?ids=a,b,c shortcut.
  const statuses = new Map(
    await Promise.all(
      ads.map(async (a) => {
        const ad = await graph<{ effective_status: string }>(a.adId, { fields: 'effective_status', access_token: accessToken });
        return [a.adId, ad.effective_status] as const;
      }),
    ),
  );
  const insights = await graph<{ data: { campaign_id: string; spend: string; impressions: string; clicks: string }[] }>(`${adAccountId}/insights`, {
    level: 'campaign',
    fields: 'campaign_id,spend,impressions,clicks',
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: ads.map((a) => a.campaignId) }]),
    date_preset: 'maximum',
    access_token: accessToken,
  });

  for (const a of ads) {
    // A campaign with no results yet has no insights row.
    const row = insights.data.find((d) => d.campaign_id === a.campaignId);
    result.set(a.adId, {
      effectiveStatus: statuses.get(a.adId) ?? 'UNKNOWN',
      spend: row?.spend ?? '0',
      impressions: Number(row?.impressions ?? 0),
      clicks: Number(row?.clicks ?? 0),
    });
  }
  return result;
}

export interface MetaAdDay {
  metaAdId: string;
  day: string; // "2026-11-06"
  spend: string;
  impressions: number;
  linkClicks: number;
  purchases: number; // what Meta counts through a Pixel; 0 without one
  purchaseValue: string;
}

interface MetaAction {
  action_type: string;
  value: string;
}

/** Meta lists the same purchases under several names; omni_purchase is the combined one, so only one is read. */
function purchaseAction(actions: MetaAction[] | undefined): string {
  const find = (type: string) => actions?.find((a) => a.action_type === type)?.value;
  return find('omni_purchase') ?? find('purchase') ?? '0';
}

interface InsightsPage {
  data: {
    ad_id: string;
    date_start: string;
    spend?: string;
    impressions?: string;
    inline_link_clicks?: string;
    actions?: MetaAction[];
    action_values?: MetaAction[];
  }[];
  paging?: { next?: string; cursors?: { after?: string } };
}

/** Results per ad per day between two days (both included). Days with no results have no row. */
export async function readAdDailyStats(metaAdIds: string[], since: string, until: string): Promise<MetaAdDay[]> {
  const { accessToken, adAccountId } = metaAdsSettings();
  const days: MetaAdDay[] = [];
  let after: string | undefined;

  do {
    const page: InsightsPage = await graph<InsightsPage>(`${adAccountId}/insights`, {
      level: 'ad',
      time_increment: '1', // one row per day
      time_range: JSON.stringify({ since, until }),
      fields: 'ad_id,spend,impressions,inline_link_clicks,actions,action_values',
      filtering: JSON.stringify([{ field: 'ad.id', operator: 'IN', value: metaAdIds }]),
      limit: '500',
      ...(after ? { after } : {}),
      access_token: accessToken,
    });

    for (const row of page.data) {
      days.push({
        metaAdId: row.ad_id,
        day: row.date_start,
        spend: row.spend ?? '0',
        impressions: Number(row.impressions ?? 0),
        linkClicks: Number(row.inline_link_clicks ?? 0),
        purchases: Math.round(Number(purchaseAction(row.actions))),
        purchaseValue: purchaseAction(row.action_values),
      });
    }
    after = page.paging?.next ? page.paging.cursors?.after : undefined;
  } while (after);

  return days;
}
