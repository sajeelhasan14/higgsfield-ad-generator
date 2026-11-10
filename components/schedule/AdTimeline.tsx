// The life of one ad in one line: made → approved → posted on each platform → promoted as a paid ad.
// Shown under each ad on the Schedule page. Steps that haven't happened yet are simply left out.
import { formatPrice, formatSlotTime } from '@/lib/format';
import type { ScheduledAd } from '@/lib/posts/repository';

export function AdTimeline({ item }: { item: ScheduledAd }) {
  const steps: { label: string; at: Date | string; note?: string }[] = [{ label: 'Made', at: item.createdAt }];
  if (item.approvedAt) steps.push({ label: 'Approved', at: item.approvedAt });
  for (const post of item.posts) {
    if (post.publishedAt) steps.push({ label: `Posted on ${post.platform}`, at: post.publishedAt });
  }
  for (const paid of item.paidAds) {
    const budget = `${formatPrice(paid.dailyBudget, paid.currency)}/day`;
    // A promotion that was never switched on only exists as a paused ad in Meta.
    steps.push(paid.startedAt
      ? { label: 'Paid ad live', at: paid.startedAt, note: `${budget}, until ${formatSlotTime(new Date(paid.endsAt!))}` }
      : { label: 'Paid ad made (paused)', at: paid.createdAt, note: budget });
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
