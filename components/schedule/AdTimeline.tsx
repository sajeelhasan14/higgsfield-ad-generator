// The life of one ad in one line: made → approved → posted on each platform → uploaded to Meta as a paid ad → switched on.
// Shown under every ad on the Schedule page. Steps that haven't happened yet are simply left out.
import { formatPrice, formatSlotTime } from '@/lib/format';
import type { AdTimelineData } from '@/lib/posts/repository';

export function AdTimeline({ item }: { item: AdTimelineData }) {
  const steps: { label: string; at: Date | string; note?: string }[] = [{ label: 'Made', at: item.createdAt }];
  if (item.approvedAt) steps.push({ label: 'Approved', at: item.approvedAt });
  for (const post of item.posts) {
    if (post.publishedAt) steps.push({ label: `Posted on ${post.platform}`, at: post.publishedAt });
  }
  for (const paid of item.paidAds) {
    const budget = `${formatPrice(paid.dailyBudget, paid.currency)}/day`;
    // Uploaded: the paid ad was made on Meta, paused. Switched on: it started spending (never, if startedAt is null).
    steps.push({ label: 'Uploaded to Meta as paid ad', at: paid.createdAt, note: budget });
    if (paid.startedAt) steps.push({ label: 'Paid ad switched on', at: paid.startedAt, note: `until ${formatSlotTime(new Date(paid.endsAt!))}` });
  }
  // Oldest first, so it reads as a story.
  steps.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>→</span>}
          <span className="font-medium text-ink">{s.label}</span>
          <span className="tabular-nums">{formatSlotTime(new Date(s.at))}</span>
          {s.note && <span>({s.note})</span>}
        </li>
      ))}
    </ol>
  );
}
