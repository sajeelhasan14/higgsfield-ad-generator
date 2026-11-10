import { Suspense } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { QueueRow } from '@/components/schedule/QueueRow';
import { listAdsByStatus } from '@/lib/ads/repository';
import { planPaidLaunches } from '@/lib/autopilot/launch-plan';
import { listActivePaidAds } from '@/lib/paid-ads/repository';
import { removeSlotAction } from '@/app/(dashboard)/schedule/actions';
import { ActionButton } from '@/components/ActionButton';
import { AddSlotForm } from '@/components/schedule/AddSlotForm';
import { ScheduledAdRow } from '@/components/schedule/ScheduledAdRow';
import { EmptyState, PageHeader, SectionTitle, StatRow } from '@/components/shell/PageParts';
import { POSTING_TIMEZONE, PUBLISH_DRY_RUN } from '@/lib/config';
import { formatPrice, formatSlotTime } from '@/lib/format';
import { listHistory, listUpcoming } from '@/lib/posts/repository';
import { listSlots } from '@/lib/posts/slots';

export default function SchedulePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Schedule" subtitle={`what was posted, what is next, and when · posts and paid ads · ${POSTING_TIMEZONE}`} />
      {PUBLISH_DRY_RUN && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Dry run: Instagram and Facebook are not connected yet, so &quot;published&quot; means the worker only logged it.
        </p>
      )}
      <Suspense fallback={<p className="text-sm text-muted">Loading schedule…</p>}>
        <Schedule />
      </Suspense>
    </div>
  );
}

async function Schedule() {
  await connection(); // always fresh from the database
  const [upcoming, history, slots, launchPlan, activePaid, waiting] = await Promise.all([
    listUpcoming(), listHistory(), listSlots(), planPaidLaunches(), listActivePaidAds(), listAdsByStatus(['ready']),
  ]);
  const published = history.filter((h) => h.posts.every((p) => p.status === 'published')).length;
  // Real ads still inside their days. Dry-run ones (no Meta ID) never ran on Meta.
  const running = activePaid.filter((paid) => !paid.finished && paid.metaAdId);
  const nextLaunch = launchPlan.blocked ? null : launchPlan.queue[0];

  return (
    <>
      <StatRow
        stats={[
          { label: 'Next post', value: upcoming[0] ? formatSlotTime(new Date(upcoming[0].scheduledAt)) : '—', tone: 'blue', note: `${upcoming.length} waiting` },
          { label: 'Next paid ad', value: nextLaunch ? formatSlotTime(nextLaunch.earliestAt) : '—', tone: 'amber', note: launchPlan.blocked ? 'not launching by itself' : `${launchPlan.queue.length} waiting` },
          { label: 'Paid ads running', value: running.length, tone: 'green' },
          { label: 'Posted', value: published, note: `${slots.length} daily times` },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <SectionTitle count={upcoming.length}>Next posts · Facebook &amp; Instagram</SectionTitle>
          {upcoming.length === 0 ? (
            <EmptyState>No post is booked. Approve an ad on the Review page and it takes the next free daily time.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map((item) => (
                <ScheduledAdRow key={item.adId} item={item} canUnschedule />
              ))}
            </ul>
          )}

          <div className="mt-10">
            <SectionTitle count={launchPlan.queue.length}>Next paid ads · Meta</SectionTitle>
            {launchPlan.blocked && <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{launchPlan.blocked}</p>}
            {launchPlan.queue.length === 0 ? (
              <EmptyState>Every approved ad has already been a paid ad. New approved ads join this list.</EmptyState>
            ) : (
              <>
                {!launchPlan.blocked && (
                  <p className="-mt-2 mb-3 text-sm text-muted">The autopilot launches one paid ad a day, oldest first. It checks once an hour, so each can start up to an hour after the time shown.</p>
                )}
                <ul className="flex flex-col gap-3">
                  {launchPlan.queue.map((launch) => (
                    <QueueRow
                      key={launch.ad.id}
                      image={launch.ad.images[0] ?? null}
                      title={`${launch.ad.productTitle ?? 'Product no longer in the catalog'} · Ad #${launch.ad.id}`}
                      when={launchPlan.blocked ? 'Waiting' : `From ${formatSlotTime(launch.earliestAt)}`}
                      detail={`${formatPrice(String(launch.dailyBudget), 'GBP')}/day for ${launch.days} days`}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>

          {running.length > 0 && (
            <div className="mt-10">
              <SectionTitle count={running.length}>Paid ads running now</SectionTitle>
              <ul className="flex flex-col gap-3">
                {running.map((paid) => (
                  <QueueRow
                    key={paid.id}
                    image={paid.image}
                    title={`${paid.productTitle ?? 'Product no longer in the catalog'} · Ad #${paid.adId}`}
                    when={paid.endsAt ? `Running until ${formatSlotTime(new Date(paid.endsAt))}` : 'Made, not switched on yet'}
                    detail={`${formatPrice(paid.dailyBudget, paid.currency)}/day · ${paid.status === 'active' ? 'on' : 'paused'} · see Meta Ads for results`}
                  />
                ))}
              </ul>
            </div>
          )}

          {waiting.length > 0 && (
            <div className="mt-10">
              <SectionTitle count={waiting.length}>Waiting for your approval</SectionTitle>
              <p className="-mt-2 mb-3 text-sm text-muted">These are not posted or promoted until you approve them on the Review page.</p>
              <ul className="flex flex-col gap-3">
                {waiting.map((ad) => (
                  <QueueRow
                    key={ad.id}
                    image={ad.images[0] ?? null}
                    title={`${ad.productTitle ?? 'Product no longer in the catalog'} · Ad #${ad.id}`}
                    when="Not booked"
                    detail={`Made ${formatSlotTime(new Date(ad.createdAt))}`}
                  >
                    <Link href="/review" className="mt-1 inline-block text-xs font-medium text-brand hover:underline">Open Review →</Link>
                  </QueueRow>
                ))}
              </ul>
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-10">
              <SectionTitle count={history.length}>History</SectionTitle>
              <ul className="flex flex-col gap-3">
                {history.map((item) => (
                  <ScheduledAdRow key={item.adId} item={item} canUnschedule={false} />
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="h-fit rounded-2xl border border-line bg-surface p-5">
          <SectionTitle>Daily posting times</SectionTitle>
          <p className="-mt-2 mb-4 text-sm text-muted">Each approved ad takes the next free time, on Instagram and Facebook together.</p>
          <ul className="mb-4 flex flex-col gap-2">
            {slots.map((time) => (
              <li key={time} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-2">
                <span className="font-display text-lg font-bold tabular-nums">{time}</span>
                <ActionButton action={removeSlotAction} fields={{ time }} label="Remove" tone="danger" confirm={`Stop posting at ${time}?`} />
              </li>
            ))}
          </ul>
          <AddSlotForm />
        </section>
      </div>
    </>
  );
}
