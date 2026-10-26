// One ad on the Schedule page: when, what, and how each platform's post is doing.
import { unscheduleAction } from '@/app/(dashboard)/schedule/actions';
import { ActionButton } from '@/components/ActionButton';
import { formatSlotTime } from '@/lib/format';
import type { ScheduledAd } from '@/lib/posts/repository';
import { mediaUrl } from '@/lib/storage';

const STATUS_PILL: Record<string, string> = {
  scheduled: 'border-brand/20 bg-brand-soft text-brand',
  publishing: 'border-amber-200 bg-amber-50 text-amber-800',
  published: 'border-teal-200 bg-teal-50 text-teal-800',
  failed: 'border-red-200 bg-red-50 text-red-700',
};

export function ScheduledAdRow({ item, canUnschedule }: { item: ScheduledAd; canUnschedule: boolean }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3 pr-4">
      {item.firstSlide ? (
        // eslint-disable-next-line @next/next/no-img-element -- our own JPEG thumbnail
        <img src={mediaUrl(item.firstSlide)} alt="" className="h-20 w-16 shrink-0 rounded-lg border border-line object-cover" />
      ) : (
        <div className="h-20 w-16 shrink-0 rounded-lg bg-stone-200" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold">{formatSlotTime(new Date(item.scheduledAt))}</p>
        <p className="truncate text-sm text-muted">
          {item.productTitle ?? 'Product no longer in the catalog'} · Ad #{item.adId}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {item.posts.map((p) => (
            <span key={p.platform} title={p.lastError ?? undefined} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_PILL[p.status] ?? ''}`}>
              {p.platform} · {p.status}
            </span>
          ))}
        </div>
        {item.posts
          .filter((p) => p.lastError)
          .map((p) => (
            <p key={p.platform} className="mt-1 text-xs text-red-600">
              {p.platform}: {p.lastError}
            </p>
          ))}
      </div>
      {canUnschedule && <ActionButton action={unscheduleAction} fields={{ adId: item.adId }} label="Unschedule" confirm="Take this ad off the schedule?" />}
    </li>
  );
}
