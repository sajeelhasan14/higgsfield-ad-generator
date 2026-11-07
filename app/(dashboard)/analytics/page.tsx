import Link from 'next/link';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { AdRanking, FunnelSteps, RankedBars, ratio, RecentOrdersTable } from '@/components/analytics/ResultTables';
import { RunningTotalChart } from '@/components/analytics/RunningTotalChart';
import { StoreSalesChart } from '@/components/analytics/StoreSalesChart';
import { PageHeader, SectionTitle, StatRow } from '@/components/shell/PageParts';
import { getDashboard } from '@/lib/analytics/repository';
import { formatPrice, formatSlotTime } from '@/lib/format';

const RANGES = [7, 30, 90, 365];
const DEFAULT_RANGE = 30;

type Search = Promise<{ days?: string | string[] }>;

export default function AnalyticsPage({ searchParams }: { searchParams: Search }) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Analytics" subtitle="what the paid ads cost and what they sold" />
      <Suspense fallback={<p className="text-sm text-muted">Loading numbers…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function RangeLinks({ days }: { days: number }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Date range">
      {RANGES.map((range) => (
        <Link
          key={range}
          href={`/analytics?days=${range}`}
          aria-current={range === days ? 'page' : undefined}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${range === days ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink/75 hover:text-ink'}`}
        >
          Last {range} days
        </Link>
      ))}
    </nav>
  );
}

/** "Up 12% on the previous 30 days". Nothing to compare with gives no line, rather than a meaningless percentage. */
function changeNote(now: number, before: number, days: number): string | undefined {
  if (before === 0) return now > 0 ? 'New this period' : undefined;
  const change = Math.round(((now - before) / before) * 100);
  if (change === 0) return `Same as the previous ${days} days`;
  return `${change > 0 ? 'Up' : 'Down'} ${Math.abs(change)}% on the previous ${days} days`;
}

async function Results({ searchParams }: { searchParams: Search }) {
  await connection(); // always fresh from the database
  const asked = Number((await searchParams).days);
  const days = RANGES.includes(asked) ? asked : DEFAULT_RANGE;

  const { summary, previous, daily, ads, products, channels, recentOrders, lastSynced, profit } = await getDashboard(days);
  const { currency, spend, adRevenue, adOrders, storeRevenue, impressions, linkClicks, landingViews, addToCarts, checkouts } = summary;
  const money = (amount: number | null) => (amount === null ? '—' : formatPrice(String(amount), currency));

  const perPound = ratio(adRevenue, spend);
  const previousPerPound = ratio(previous.adRevenue, previous.spend);
  const adShare = ratio(adRevenue, storeRevenue);
  // Not just "an ad has a row": a new ad can report a day with nothing spent yet, and there is nothing to chart then.
  const hasAdResults = spend > 0 || adRevenue > 0;
  const hasStoreSales = daily.some((d) => d.storeRevenue > 0);

  return (
    <>
      <RangeLinks days={days} />

      <StatRow
        stats={[
          { label: 'Earned from ads', value: money(adRevenue), tone: 'green', note: changeNote(adRevenue, previous.adRevenue, days) },
          { label: 'Spent on ads', value: money(spend), tone: 'amber', note: changeNote(spend, previous.spend, days) },
          { label: 'Earned per £1 spent', value: money(perPound), tone: 'blue', note: perPound !== null && previousPerPound !== null ? changeNote(perPound, previousPerPound, days) : undefined },
          { label: 'Orders from ads', value: adOrders, note: changeNote(adOrders, previous.adOrders, days) },
        ]}
      />

      <p className="rounded-2xl border border-line bg-surface p-4 text-sm">
        <span className="font-semibold">Profit from ads: {profit === null ? 'needs product costs' : money(profit)}.</span>{' '}
        <span className="text-muted">
          {profit === null ? 'Fill in Cost per item on Shopify, or set a rough margin, to see this.' : 'After VAT, product costs and ad spend. Delivery is left out.'}
        </span>
      </p>

      {hasAdResults ? (
        <>
          <section>
            <SectionTitle>Are the ads ahead?</SectionTitle>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <RunningTotalChart days={daily} currency={currency} />
            </div>
          </section>

          <section>
            <SectionTitle>From seeing the ad to buying</SectionTitle>
            <FunnelSteps shown={impressions} clicks={linkClicks} landingViews={landingViews} addToCarts={addToCarts} checkouts={checkouts} orders={adOrders} />
          </section>

          <section>
            <SectionTitle count={ads.length}>Which ads earn the most</SectionTitle>
            <AdRanking ads={ads} currency={currency} />
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-bold">Waiting for the first ad results</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Spend, clicks and sales from your paid ads appear here once Meta reports them. The whole store&apos;s sales below are already live.
          </p>
        </section>
      )}

      {hasStoreSales && (
        <section>
          <SectionTitle>What ads add to the store</SectionTitle>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="mb-3 text-sm text-muted">
              Ads brought in <span className="font-semibold text-ink">{adShare === null ? '0%' : `${(adShare * 100).toFixed(1)}%`}</span> of the {money(storeRevenue)} the store sold in this period.
            </p>
            <StoreSalesChart days={daily} currency={currency} />
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {products.length > 0 && (
          <section>
            <SectionTitle>Best sellers from ads</SectionTitle>
            <RankedBars items={products.map((p) => ({ label: p.title, value: p.revenue, note: `${p.quantity} sold` }))} currency={currency} />
          </section>
        )}

        {channels.length > 0 && (
          <section className={products.length === 0 ? 'xl:col-span-2' : undefined}>
            <SectionTitle>Where all orders came from</SectionTitle>
            <RankedBars
              items={channels.map((c) => ({ label: c.channel, value: c.revenue, note: `${c.orders} ${c.orders === 1 ? 'order' : 'orders'}` }))}
              currency={currency}
            />
          </section>
        )}
      </div>

      {recentOrders.length > 0 && (
        <section>
          <SectionTitle>Latest sales from ads</SectionTitle>
          <RecentOrdersTable orders={recentOrders} currency={currency} />
        </section>
      )}

      <p className="text-xs text-muted">
        Earned means what Shopify charged after refunds, including VAT and delivery. An order only counts as from an ad if its visit carried one of our ad tags, so the real figure can be higher.
        {lastSynced ? ` Orders last read ${formatSlotTime(lastSynced)}.` : ' Orders have not been read yet; the worker does this every 15 minutes.'}
      </p>
    </>
  );
}
