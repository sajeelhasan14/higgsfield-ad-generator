import { Suspense } from 'react';
import { connection } from 'next/server';
import Link from 'next/link';
import { AdCard } from '@/components/ads/AdCard';
import { AutoRefresh } from '@/components/AutoRefresh';
import { EmptyState, PageHeader, SectionTitle, StatRow } from '@/components/shell/PageParts';
import { listAdsByStatus } from '@/lib/ads/repository';
import type { Ad } from '@/lib/ads/types';

export default function ReviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Studio · Review" title="Review" subtitle="check each ad · edit the caption · approve to schedule" />
      <Suspense fallback={<p className="text-sm text-muted">Loading ads…</p>}>
        <Ads />
      </Suspense>
    </div>
  );
}

async function Ads() {
  await connection(); // always fresh from the database
  const ads = await listAdsByStatus(['generating', 'ready', 'failed']);
  const by = (status: Ad['status']) => ads.filter((a) => a.status === status);
  const generating = by('generating');

  return (
    <>
      <StatRow
        stats={[
          { label: 'In review', value: ads.length },
          { label: 'Generating', value: generating.length, tone: 'amber' },
          { label: 'Ready', value: by('ready').length, tone: 'green' },
          { label: 'Failed', value: by('failed').length, tone: 'red' },
        ]}
      />
      {ads.length === 0 ? (
        <EmptyState>
          No ads to review. Tick products on the{' '}
          <Link href="/products" className="font-medium text-brand underline-offset-2 hover:underline">
            Products
          </Link>{' '}
          page and press Generate.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-10">
          {/* Only while something is generating: re-check every few seconds so finished ads appear by themselves. */}
          {generating.length > 0 && <AutoRefresh />}
          <Section title="GENERATING" ads={generating} />
          <Section title="READY FOR REVIEW" ads={by('ready')} />
          <Section title="FAILED" ads={by('failed')} />
        </div>
      )}
    </>
  );
}

function Section({ title, ads }: { title: string; ads: Ad[] }) {
  if (ads.length === 0) return null;
  return (
    <section>
      <SectionTitle count={ads.length}>{title}</SectionTitle>
      <ul className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
        {ads.map((ad) => (
          <AdCard key={ad.id} ad={ad} />
        ))}
      </ul>
    </section>
  );
}
