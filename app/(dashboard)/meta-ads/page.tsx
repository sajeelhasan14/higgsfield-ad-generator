import { Suspense } from 'react';
import { connection } from 'next/server';
import { AdPreview } from '@/components/ads/AdPreview';
import { PaidAdRow } from '@/components/meta-ads/PaidAdRow';
import { PromoteForm } from '@/components/meta-ads/PromoteForm';
import { EmptyState, PageHeader, SectionTitle, StatRow } from '@/components/shell/PageParts';
import { PAID_AD_LABEL } from '@/lib/ads/destinations';
import { listAdsByStatus } from '@/lib/ads/repository';
import type { Ad } from '@/lib/ads/types';
import { listRecommendations } from '@/lib/autopilot/recommendations';
import { PUBLISH_DRY_RUN } from '@/lib/config';
import { formatPrice } from '@/lib/format';
import { BUDGET_LIMITS } from '@/lib/paid-ads/promote';
import { listPaidAds, type PaidAd } from '@/lib/paid-ads/repository';
import { readMetaAds, type MetaAdLive } from '@/lib/publishing/meta-ads';
import { mediaUrl } from '@/lib/storage';

export default function MetaAdsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Meta Ads" subtitle="promote a finished ad · it is created switched off · you switch it on" />
      {PUBLISH_DRY_RUN && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Dry run: nothing is sent to Meta and nothing is spent. Promotions are only saved here so the page can be tried.
        </p>
      )}
      <Suspense fallback={<p className="text-sm text-muted">Loading ads…</p>}>
        <MetaAds />
      </Suspense>
    </div>
  );
}

/** Live status and results from Meta; if Meta can't be reached the page still shows, with the reason. */
async function readLive(paid: PaidAd[]): Promise<{ live: Map<string, MetaAdLive>; error: string | null }> {
  const onMeta = paid.filter((p) => p.metaAdId && p.campaignId).map((p) => ({ adId: p.metaAdId!, campaignId: p.campaignId! }));
  try {
    return { live: await readMetaAds(onMeta), error: null };
  } catch (err) {
    return { live: new Map(), error: err instanceof Error ? err.message : 'Could not read the ads from Meta' };
  }
}

function PromoteList({ ads }: { ads: Ad[] }) {
  return (
    <ul className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {ads.map((ad) => (
        <li key={ad.id} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
          <AdPreview images={[mediaUrl(ad.images[0])]} labels={[PAID_AD_LABEL]} title={ad.productTitle ?? 'Ad'} className="aspect-[4/5] w-28 rounded-xl border border-line object-cover" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <h3 className="font-display text-base font-bold leading-snug">{ad.productTitle ?? 'Product no longer in the catalog'}</h3>
              <p className="text-xs text-muted">Ad #{ad.id} · {ad.status === 'approved' ? 'scheduled as a post' : 'ready'}</p>
            </div>
            <PromoteForm adId={ad.id} limits={BUDGET_LIMITS} />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function MetaAds() {
  await connection(); // always fresh from the database and Meta
  const [paid, promotable, advice] = await Promise.all([listPaidAds(), listAdsByStatus(['ready', 'approved']), listRecommendations()]);
  const { live, error } = await readLive(paid);
  // An ad with a run still going, or switched off with days left, is in Paid ads above. One whose run finished can run again.
  const promoted = new Set(paid.filter((p) => !p.finished).map((p) => p.adId));
  const available = promotable.filter((ad) => !promoted.has(ad.id));
  const notPosted = available.filter((ad) => ad.status === 'ready');
  const posted = available.filter((ad) => ad.status === 'approved');
  const adAccount = process.env.META_AD_ACCOUNT_ID?.trim().replace(/^act_/, '') || null;

  const results = [...live.values()];
  const spent = results.reduce((sum, r) => sum + Number(r.spend), 0);
  const currency = paid[0]?.currency ?? 'GBP';

  return (
    <>
      <StatRow
        stats={[
          { label: 'Promotions', value: paid.length },
          { label: 'Switched on', value: paid.filter((p) => p.status === 'active').length, tone: 'blue' },
          { label: 'Spent', value: formatPrice(String(spent), currency), tone: 'amber' },
          { label: 'Clicks', value: results.reduce((sum, r) => sum + r.clicks, 0), tone: 'green' },
        ]}
      />
      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Meta: {error}</p>}

      <section>
        <SectionTitle count={paid.length}>Paid ads</SectionTitle>
        {paid.length === 0 ? (
          <EmptyState>Nothing promoted yet. Pick an ad below and press Promote.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {paid.map((p) => (
              <PaidAdRow key={p.id} paid={p} live={p.metaAdId ? live.get(p.metaAdId) : undefined} adAccount={adAccount} advice={advice.get(p.id)} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle count={notPosted.length}>Promote an ad</SectionTitle>
        {notPosted.length === 0 ? <EmptyState>No new ads to promote. Generate one on the Products page first.</EmptyState> : <PromoteList ads={notPosted} />}
      </section>

      {posted.length > 0 && (
        <section>
          <SectionTitle count={posted.length}>Posted or scheduled, not promoted</SectionTitle>
          <PromoteList ads={posted} />
        </section>
      )}
    </>
  );
}
