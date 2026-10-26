// One ad on the Review page: the post image on the left, caption and buttons on the right.
import { approveAction, deleteAction, regenerateAction } from '@/app/(dashboard)/review/actions';
import { ActionButton } from '@/components/ActionButton';
import type { Ad } from '@/lib/ads/types';
import { mediaUrl } from '@/lib/storage';
import { CaptionForm } from './CaptionForm';

const REGENERATE_CONFIRM = 'Generate a new AI picture for this ad? Unless dry run is on, this uses one paid image.';

const STATUS_PILL: Record<string, string> = {
  generating: 'border-amber-200 bg-amber-50 text-amber-800',
  ready: 'border-teal-200 bg-teal-50 text-teal-800',
  failed: 'border-red-200 bg-red-50 text-red-700',
};

export function AdCard({ ad }: { ad: Ad }) {
  const title = ad.productTitle ?? 'Product no longer in the catalog';
  const id = { adId: ad.id };

  return (
    <li className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 sm:flex-row">
      <div className="w-full shrink-0 sm:w-64">
        {ad.status === 'ready' && ad.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- our own JPEG, already sized
          <img src={mediaUrl(ad.images[0])} alt={`Ad for ${title}`} className="aspect-[4/5] w-full rounded-xl border border-line object-cover" />
        ) : (
          <div className="grid aspect-[4/5] w-full place-items-center rounded-xl border border-dashed border-line bg-canvas text-sm text-muted">
            {ad.status === 'generating' ? <span className="animate-pulse">Drawing…</span> : 'No image'}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold leading-snug">{title}</h3>
            <p className="text-xs text-muted">
              Ad #{ad.id} · created {ad.createdAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_PILL[ad.status] ?? ''}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" /> {ad.status.charAt(0).toUpperCase() + ad.status.slice(1)}
          </span>
        </div>

        {ad.status === 'generating' && (
          <p className="text-sm text-muted">{ad.heroRequestId ? 'The AI is drawing the picture…' : 'Waiting for the worker to start…'}</p>
        )}

        {ad.status === 'failed' && (
          <>
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{ad.error}</p>
            <div className="flex flex-wrap gap-2">
              <ActionButton action={regenerateAction} fields={id} label="Try again" tone="primary" confirm={REGENERATE_CONFIRM} />
              <ActionButton action={deleteAction} fields={id} label="Delete" tone="danger" confirm="Delete this ad?" />
            </div>
          </>
        )}

        {ad.status === 'ready' && (
          <>
            <CaptionForm adId={ad.id} caption={ad.caption} />
            <div className="mt-auto flex flex-wrap gap-2">
              <ActionButton action={approveAction} fields={id} label="Approve & schedule" tone="primary" />
              <ActionButton action={regenerateAction} fields={id} label="Regenerate picture" confirm={REGENERATE_CONFIRM} />
              <ActionButton action={deleteAction} fields={id} label="Delete" tone="danger" confirm="Delete this ad?" />
            </div>
          </>
        )}
      </div>
    </li>
  );
}
