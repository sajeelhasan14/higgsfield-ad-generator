import { Suspense } from 'react';
import { connection } from 'next/server';
import { removeSlotAction } from '@/app/(dashboard)/schedule/actions';
import { ActionButton } from '@/components/ActionButton';
import { AddSlotForm } from '@/components/schedule/AddSlotForm';
import { ScheduledAdRow } from '@/components/schedule/ScheduledAdRow';
import { EmptyState, PageHeader, SectionTitle, StatRow } from '@/components/shell/PageParts';
import { POSTING_TIMEZONE, PUBLISH_DRY_RUN } from '@/lib/config';
import { formatSlotTime } from '@/lib/format';
import { listHistory, listUpcoming } from '@/lib/posts/repository';
import { listSlots } from '@/lib/posts/slots';

export default function SchedulePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Studio · Schedule" title="Schedule" subtitle={`approved ads post at the next free time · ${POSTING_TIMEZONE}`} />
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
  const [upcoming, history, slots] = await Promise.all([listUpcoming(), listHistory(), listSlots()]);
  const published = history.filter((h) => h.posts.every((p) => p.status === 'published')).length;

  return (
    <>
      <StatRow
        stats={[
          { label: 'Upcoming', value: upcoming.length, tone: 'blue' },
          { label: 'Next post', value: upcoming[0] ? formatSlotTime(new Date(upcoming[0].scheduledAt)) : '—' },
          { label: 'Daily times', value: slots.length, tone: 'amber' },
          { label: 'Published', value: published, tone: 'green' },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_340px]">
        <section>
          <SectionTitle count={upcoming.length}>UPCOMING</SectionTitle>
          {upcoming.length === 0 ? (
            <EmptyState>Nothing scheduled. Approve an ad on the Review page.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map((item) => (
                <ScheduledAdRow key={item.adId} item={item} canUnschedule />
              ))}
            </ul>
          )}

          {history.length > 0 && (
            <div className="mt-10">
              <SectionTitle count={history.length}>HISTORY</SectionTitle>
              <ul className="flex flex-col gap-3">
                {history.map((item) => (
                  <ScheduledAdRow key={item.adId} item={item} canUnschedule={false} />
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="h-fit rounded-2xl border border-line bg-surface p-5">
          <SectionTitle>DAILY POSTING TIMES</SectionTitle>
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
