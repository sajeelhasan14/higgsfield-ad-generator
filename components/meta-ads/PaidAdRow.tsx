// One promotion on the Meta Ads page: what it is, its budget, Meta's status and results, and the on/off switch.
import { switchPaidAdAction } from '@/app/(dashboard)/meta-ads/actions';
import { ActionButton } from '@/components/ActionButton';
import { formatPrice, formatSlotTime } from '@/lib/format';
import type { PaidAd } from '@/lib/paid-ads/repository';
import type { MetaAdLive } from '@/lib/publishing/meta-ads';
import { mediaUrl } from '@/lib/storage';

// Meta's effective_status in plain words; anything not listed is shown as Meta sends it.
const META_STATUS: Record<string, { label: string; pill: string }> = {
  ACTIVE: { label: 'Running', pill: 'border-teal-200 bg-teal-50 text-teal-800' },
  PAUSED: { label: 'Off', pill: 'border-line bg-white text-muted' },
  CAMPAIGN_PAUSED: { label: 'Off', pill: 'border-line bg-white text-muted' },
  ADSET_PAUSED: { label: 'Off', pill: 'border-line bg-white text-muted' },
  PENDING_REVIEW: { label: 'In review at Meta', pill: 'border-amber-200 bg-amber-50 text-amber-800' },
  IN_PROCESS: { label: 'In review at Meta', pill: 'border-amber-200 bg-amber-50 text-amber-800' },
  PREAPPROVED: { label: 'Approved by Meta', pill: 'border-teal-200 bg-teal-50 text-teal-800' },
  DISAPPROVED: { label: 'Rejected by Meta', pill: 'border-red-200 bg-red-50 text-red-700' },
  WITH_ISSUES: { label: 'Has issues (see Ads Manager)', pill: 'border-red-200 bg-red-50 text-red-700' },
};

interface Props {
  paid: PaidAd;
  live: MetaAdLive | undefined;
  /** The ad account number, for the "Open in Ads Manager" link; null when not set. */
  adAccount: string | null;
}

export function PaidAdRow({ paid, live, adAccount }: Props) {
  const { finished } = paid;
  const metaStatus = live && META_STATUS[live.effectiveStatus];
  const budget = formatPrice(paid.dailyBudget, paid.currency);

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
      {paid.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- our own JPEG thumbnail
        <img src={mediaUrl(paid.image)} alt="" className="h-24 w-20 shrink-0 rounded-lg border border-line object-cover" />
      ) : (
        <div className="h-24 w-20 shrink-0 rounded-lg bg-stone-200" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-bold">{paid.productTitle ?? 'Product no longer in the catalog'}</p>
        <p className="text-sm text-muted">
          Ad #{paid.adId} · {budget}/day · {paid.days} days
          {paid.endsAt && ` · ${finished ? 'ended' : 'ends'} ${formatSlotTime(paid.endsAt)}`}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${paid.status === 'active' && !finished ? 'border-brand/20 bg-brand-soft text-brand' : 'border-line bg-white text-muted'}`}>
            {finished ? 'Finished' : paid.status === 'active' ? 'Switched on' : 'Switched off'}
          </span>
          {!paid.metaAdId && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">Dry run</span>}
          {live && (
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${metaStatus?.pill ?? 'border-line bg-white text-muted'}`}>
              Meta: {metaStatus?.label ?? live.effectiveStatus}
            </span>
          )}
          {live && (
            <span className="text-xs tabular-nums text-muted">
              spent {formatPrice(live.spend, paid.currency)} · {live.impressions.toLocaleString('en-GB')} views · {live.clicks.toLocaleString('en-GB')} clicks
            </span>
          )}
        </div>
        {paid.pausedReason && <p className="mt-1 text-xs text-red-600">Switched off automatically: {paid.pausedReason}</p>}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        {paid.campaignId && (
          <a
            href={`https://adsmanager.facebook.com/adsmanager/manage/ads?${adAccount ? `act=${adAccount}&` : ''}selected_campaign_ids=${paid.campaignId}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-stone-50"
          >
            Ads Manager
          </a>
        )}
        {!finished &&
          (paid.status === 'active' ? (
            <ActionButton action={switchPaidAdAction} fields={{ paidAdId: paid.id, on: '0' }} label="Switch off" />
          ) : (
            <ActionButton
              action={switchPaidAdAction}
              fields={{ paidAdId: paid.id, on: '1' }}
              label="Switch on"
              tone="primary"
              confirm={`Switch on? It can spend up to ${formatPrice(String(Number(paid.dailyBudget) * paid.days), paid.currency)} (${budget}/day for ${paid.days} days).`}
            />
          ))}
      </div>
    </li>
  );
}
