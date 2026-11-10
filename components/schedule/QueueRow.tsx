// One ad in a Schedule list that is not a booked post: a paid ad waiting to launch, one running now, or an ad
// waiting for approval. Same look as ScheduledAdRow: picture, a bold "when" line, then what it is.
import type { ReactNode } from 'react';
import { AdPreview } from '@/components/ads/AdPreview';
import { mediaUrl } from '@/lib/storage';

export function QueueRow({ image, title, when, detail, children }: { image: string | null; title: string; when: string; detail: string; children?: ReactNode }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3 pr-4">
      {image ? (
        <AdPreview images={[mediaUrl(image)]} labels={['Ad picture']} title={title} className="h-20 w-16 rounded-lg border border-line object-cover" />
      ) : (
        <div className="h-20 w-16 shrink-0 rounded-lg bg-stone-200" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold">{when}</p>
        <p className="truncate text-sm text-muted">{title}</p>
        <p className="mt-1 text-xs text-muted">{detail}</p>
        {children}
      </div>
    </li>
  );
}
