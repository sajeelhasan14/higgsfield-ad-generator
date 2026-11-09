// One ad on the Schedule page: when, what, and how each platform's post is doing.
import { unscheduleAction } from '@/app/(dashboard)/schedule/actions';
import { ActionButton } from '@/components/ActionButton';
import { formatSlotTime } from '@/lib/format';
import type { ScheduledAd } from '@/lib/posts/repository';
import { AdPreview } from '@/components/ads/AdPreview';
import { PostStatusPills } from '@/components/posts/PostStatusPills';
import { mediaUrl } from '@/lib/storage';

export function ScheduledAdRow({ item, canUnschedule }: { item: ScheduledAd; canUnschedule: boolean }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3 pr-4">
      {item.firstSlide ? (
        <AdPreview images={[mediaUrl(item.firstSlide)]} labels={['Scheduled post']} title={item.productTitle ?? 'Ad'} className="h-20 w-16 rounded-lg border border-line object-cover" />
      ) : (
        <div className="h-20 w-16 shrink-0 rounded-lg bg-stone-200" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold">{formatSlotTime(new Date(item.scheduledAt))}</p>
        <p className="truncate text-sm text-muted">
          {item.productTitle ?? 'Product no longer in the catalog'} · Ad #{item.adId}
        </p>
        <div className="mt-2">
          <PostStatusPills posts={item.posts} />
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
