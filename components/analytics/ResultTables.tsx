// The parts of the Analytics page that need no pointer tracking: the funnel, the ad ranking, the ranked bars and recent purchases.
import { Fragment, type ReactNode } from 'react';
import { Icon } from '@/components/shell/Icon';
import type { AdResult, CreditedOrder } from '@/lib/analytics/repository';
import { formatPrice, formatSlotTime } from '@/lib/format';
import { mediaUrl } from '@/lib/storage';

const money = (amount: number, currency: string) => formatPrice(String(amount), currency);

/** A number worked out from two others, or null when it can't be (nothing was spent or sold yet). */
export function ratio(top: number, bottom: number): number | null {
  return bottom > 0 ? top / bottom : null;
}

function percent(part: number, whole: number): string {
  const share = ratio(part, whole);
  if (share === null) return '—';
  return `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`;
}

/**
 * Numbers instead of bars on purpose: thousands of views next to a few orders would leave the last bars invisible.
 * Every step but the last comes from Meta, counted per ad, so other sites on the Pixel don't get in. "Orders" comes from Shopify.
 */
export function FunnelSteps({ shown, clicks, landingViews, addToCarts, checkouts, orders }: { shown: number; clicks: number; landingViews: number; addToCarts: number; checkouts: number; orders: number }) {
  const steps = [
    { label: 'Times shown', value: shown, note: 'how often people saw the ads' },
    { label: 'Clicks', value: clicks, note: `${percent(clicks, shown)} of times shown` },
    { label: 'Page views', value: landingViews, note: `${percent(landingViews, clicks)} of clicks` },
    { label: 'Add to cart', value: addToCarts, note: `${percent(addToCarts, clicks)} of clicks` },
    { label: 'Checkout', value: checkouts, note: `${percent(checkouts, clicks)} of clicks` },
    { label: 'Orders', value: orders, note: `${percent(orders, clicks)} of clicks` },
  ];
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 lg:flex-row lg:items-center lg:gap-3">
      {steps.map((step, i) => (
        <Fragment key={step.label}>
          {i > 0 && <Icon name="chevron" className="h-5 w-5 shrink-0 rotate-90 self-center text-muted lg:rotate-0" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">{step.label}</p>
            <p className="font-display text-2xl font-bold tabular-nums">{step.value.toLocaleString('en-GB')}</p>
            <p className="text-xs text-muted">{step.note}</p>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/** Best seller first. The bar shows what each ad earned compared with the best one. */
export function AdRanking({ ads, currency }: { ads: AdResult[]; currency: string }) {
  const most = Math.max(...ads.map((ad) => ad.revenue));
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {ads.map((ad) => {
        const perPound = ratio(ad.revenue, ad.spend);
        return (
          <li key={ad.adId} className="flex items-center gap-4 p-4">
            {ad.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- our own JPEG thumbnail
              <img src={mediaUrl(ad.image)} alt="" className="h-16 w-14 shrink-0 rounded-lg border border-line object-cover" />
            ) : (
              <div className="h-16 w-14 shrink-0 rounded-lg bg-stone-200" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <p className="min-w-0 truncate text-sm font-medium">{ad.productTitle ?? 'Product no longer in the catalog'}</p>
                <p className="shrink-0 font-semibold tabular-nums">{money(ad.revenue, currency)}</p>
              </div>
              <div className="mt-2 h-2 rounded-r bg-black/5">
                {ad.revenue > 0 && <div className="h-2 rounded-r bg-brand" style={{ width: `${Math.max(1, (ad.revenue / most) * 100)}%` }} />}
              </div>
              <p className="mt-2 text-xs text-muted">
                Ad #{ad.adId} · {money(ad.spend, currency)} spent · {ad.orders} {ad.orders === 1 ? 'order' : 'orders'}
                {perPound !== null && ` · ${money(perPound, currency)} earned per £1`}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {ad.linkClicks.toLocaleString('en-GB')} clicks → {ad.landingViews.toLocaleString('en-GB')} page views → {ad.addToCarts.toLocaleString('en-GB')} add to cart → {ad.checkouts.toLocaleString('en-GB')} checkout → {ad.orders}{' '}
                {ad.orders === 1 ? 'order' : 'orders'}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export interface BarItem {
  label: string;
  value: number;
  note: string;
}

/** One bar per item, longest first: only the length carries the amount, so one colour is enough. */
export function RankedBars({ items, currency }: { items: BarItem[]; currency: string }) {
  const most = Math.max(...items.map((item) => item.value));
  return (
    <ul className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
      {items.map((item) => (
        <li key={item.label} className="text-sm">
          <p className="flex items-baseline justify-between gap-4">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold">{money(item.value, currency)}</span>
              <span className="ml-2 text-xs text-muted">{item.note}</span>
            </span>
          </p>
          <div className="mt-1.5 h-2 rounded-r bg-brand" style={{ width: `${Math.max(1, (item.value / most) * 100)}%` }} />
        </li>
      ))}
    </ul>
  );
}

function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return <th className={`whitespace-nowrap px-4 py-3 text-xs font-medium text-muted ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}

export function RecentOrdersTable({ orders, currency }: { orders: CreditedOrder[]; currency: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="border-b border-line">
          <tr>
            <Th>Order</Th>
            <Th>When</Th>
            <Th>Ad</Th>
            <Th right>Value</Th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-line last:border-0">
              <td className="whitespace-nowrap px-4 py-3 font-medium">{o.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">{formatSlotTime(o.placedAt)}</td>
              <td className="px-4 py-3">
                <span className="block max-w-72 truncate">{o.productTitle ?? 'Product no longer in the catalog'}</span>
                <span className="text-xs text-muted">
                  Ad #{o.adId} · {o.creditedVisit === 'last' ? 'bought on the ad visit' : 'came back later to buy'}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                {money(o.total, currency)}
                {o.refunded > 0 && <span className="block text-xs text-amber-700">{money(o.refunded, currency)} refunded</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
