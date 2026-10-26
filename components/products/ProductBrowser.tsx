'use client';

// The product catalogue: search, filters, sort, grid or list view, and ticking products to make ads from.
// It runs in the browser so filtering 678 products is instant, without asking the server each time.
import { useActionState, useMemo, useState } from 'react';
import { createAdsAction } from '@/app/(dashboard)/products/actions';
import { Icon } from '@/components/shell/Icon';
import type { ProductStatus } from '@/lib/products/types';

export interface ProductCard {
  id: string;
  title: string;
  productType: string;
  status: ProductStatus;
  imageUrl: string | null;
  variantCount: number;
  minPrice: number | null; // for sorting
  price: string; // already formatted, e.g. "from £14.00"
  onSale: boolean;
}

const PAGE_SIZE = 48;
const SORTS = {
  'name-asc': { label: 'Name (A–Z)', compare: (a: ProductCard, b: ProductCard) => a.title.localeCompare(b.title) },
  'name-desc': { label: 'Name (Z–A)', compare: (a: ProductCard, b: ProductCard) => b.title.localeCompare(a.title) },
  'price-asc': { label: 'Price (low–high)', compare: (a: ProductCard, b: ProductCard) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity) },
  'price-desc': { label: 'Price (high–low)', compare: (a: ProductCard, b: ProductCard) => (b.minPrice ?? -1) - (a.minPrice ?? -1) },
};
type SortKey = keyof typeof SORTS;

const STATUS_PILL: Record<ProductStatus, string> = {
  ACTIVE: 'border-brand/20 bg-brand-soft text-brand',
  UNLISTED: 'border-violet-200 bg-violet-50 text-violet-700',
  DRAFT: 'border-amber-200 bg-amber-50 text-amber-800',
  ARCHIVED: 'border-stone-200 bg-stone-100 text-stone-600',
};

const statusLabel = (s: ProductStatus) => s.charAt(0) + s.slice(1).toLowerCase();

/** Asks Shopify's CDN for a smaller copy of the photo, so the grid loads quickly. */
const sized = (url: string, width: number) => `${url}${url.includes('?') ? '&' : '?'}width=${width}`;

/** Ads are made from the product photo, so a product without one (or without variants) can't be ticked. */
const canMakeAd = (p: ProductCard) => Boolean(p.imageUrl) && p.variantCount > 0;

export function ProductBrowser({ products, dryRun }: { products: ProductCard[]; dryRun: boolean }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<SortKey>('name-asc');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const types = useMemo(() => [...new Set(products.map((p) => p.productType).filter(Boolean))].sort(), [products]);
  // Only the statuses this store really uses, so no filter option ever shows an empty list.
  const statuses = useMemo(() => [...new Set(products.map((p) => p.status))].sort(), [products]);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return products
      .filter((p) => (type === 'all' || p.productType === type) && (status === 'all' || p.status === status))
      .filter((p) => words.every((w) => p.title.toLowerCase().includes(w)))
      .sort(SORTS[sort].compare);
  }, [products, query, type, status, sort]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visible = shown.slice(0, limit);

  return (
    <section className="flex flex-col gap-5 pb-24">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3">
        <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-muted focus-within:border-brand">
          <Icon name="search" className="h-4 w-4" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Search products…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </label>
        <Select value={type} onChange={setType} options={[['all', 'All types'], ...types.map((t) => [t, t] as [string, string])]} />
        <Select value={status} onChange={setStatus} options={[['all', 'All statuses'], ...statuses.map((s) => [s, statusLabel(s)] as [string, string])]} />
        <Select value={sort} onChange={(v) => setSort(v as SortKey)} options={Object.entries(SORTS).map(([k, s]) => [k, s.label])} />
        <div className="flex overflow-hidden rounded-xl border border-line bg-white">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-label={`${v} view`}
              className={`grid h-10 w-11 place-items-center ${view === v ? 'bg-brand-soft text-brand' : 'text-muted hover:text-ink'}`}
            >
              <Icon name={v} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted">
        Showing {visible.length.toLocaleString('en-GB')} of {shown.length.toLocaleString('en-GB')}
        {shown.length !== products.length && ` (filtered from ${products.length.toLocaleString('en-GB')})`}
      </p>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">
          {products.length === 0 ? 'No products yet. Press Sync from Shopify to load them.' : 'No products match these filters.'}
        </p>
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((p) => (
            <GridCard key={p.id} product={p} selected={selected.has(p.id)} onToggle={() => toggle(p.id)} />
          ))}
        </ul>
      ) : (
        <ListView products={visible} selected={selected} onToggle={toggle} />
      )}

      {visible.length < shown.length && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE_SIZE)}
          className="mx-auto rounded-full border border-line bg-surface px-6 py-2.5 text-sm font-medium hover:bg-white"
        >
          Show more
        </button>
      )}

      {selected.size > 0 && <SelectionBar ids={[...selected]} dryRun={dryRun} onClear={() => setSelected(new Set())} />}
    </section>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 max-w-52 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Checkbox({ checked, disabled, onToggle, label }: { checked: boolean; disabled: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`grid h-6 w-6 place-items-center rounded-md border transition ${
        checked ? 'border-brand bg-brand text-white' : 'border-stone-300 bg-white/90 text-transparent hover:border-brand'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Icon name="check" className="h-4 w-4" />
    </button>
  );
}

function GridCard({ product: p, selected, onToggle }: { product: ProductCard; selected: boolean; onToggle: () => void }) {
  const usable = canMakeAd(p);
  return (
    <li
      className={`group overflow-hidden rounded-2xl border bg-surface transition ${
        selected ? 'border-brand ring-2 ring-brand/30' : 'border-line hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.18)]'
      }`}
    >
      <div className="relative aspect-square bg-white">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Shopify's CDN already resizes; next/image would need extra setup
          <img src={sized(p.imageUrl, 600)} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">No photo</div>
        )}
        <span className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_PILL[p.status]}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" /> {statusLabel(p.status)}
        </span>
        <span className="absolute right-3 top-3">
          <Checkbox checked={selected} disabled={!usable} onToggle={onToggle} label={`Select ${p.title}`} />
        </span>
        {!p.imageUrl && (
          <span className="absolute bottom-3 left-3 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">Can&apos;t make an ad</span>
        )}
        {p.onSale && <span className="absolute bottom-3 right-3 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white">Sale</span>}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-[15px] font-semibold leading-snug">{p.title}</h3>
        <p className="truncate text-xs text-muted">{p.productType || 'No type'} · {p.variantCount} variant{p.variantCount === 1 ? '' : 's'}</p>
        <p className="mt-2 font-display text-lg font-bold">{p.price}</p>
      </div>
    </li>
  );
}

function ListView({ products, selected, onToggle }: { products: ProductCard[]; selected: Set<string>; onToggle: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left text-[11px] font-semibold tracking-[0.14em] text-muted">
          <tr>
            <th className="w-12 p-3" />
            <th className="p-3">PRODUCT</th>
            <th className="hidden p-3 md:table-cell">TYPE</th>
            <th className="p-3 text-right">VARIANTS</th>
            <th className="p-3 text-right">PRICE</th>
            <th className="hidden p-3 sm:table-cell">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={`border-t border-line first:border-t-0 ${selected.has(p.id) ? 'bg-brand-soft/60' : 'hover:bg-white'}`}>
              <td className="p-3">
                <Checkbox checked={selected.has(p.id)} disabled={!canMakeAd(p)} onToggle={() => onToggle(p.id)} label={`Select ${p.title}`} />
              </td>
              <td className="p-3">
                <div className="flex items-center gap-3">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Shopify's CDN already resizes
                    <img src={sized(p.imageUrl, 120)} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-lg bg-stone-200" />
                  )}
                  <span className="line-clamp-2 font-medium">{p.title}</span>
                </div>
              </td>
              <td className="hidden p-3 text-muted md:table-cell">{p.productType}</td>
              <td className="p-3 text-right tabular-nums">{p.variantCount}</td>
              <td className="whitespace-nowrap p-3 text-right font-semibold tabular-nums">{p.price}</td>
              <td className="hidden p-3 sm:table-cell">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_PILL[p.status]}`}>{statusLabel(p.status)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Appears at the bottom when products are ticked: how many, and the button that queues their ads. */
function SelectionBar({ ids, dryRun, onClear }: { ids: string[]; dryRun: boolean; onClear: () => void }) {
  const [state, action, pending] = useActionState(createAdsAction, null);
  const cost = dryRun ? 'Dry run is on, so this is free.' : `Each uses one paid AI picture (${ids.length} in total).`;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Generate ${ids.length} ad(s)? ${cost}`)) e.preventDefault();
      }}
      className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-full bg-rail py-2 pl-6 pr-2 text-sm text-white shadow-2xl"
    >
      {ids.map((id) => (
        <input key={id} type="hidden" name="productId" value={id} />
      ))}
      <span className="font-medium">{ids.length} selected</span>
      <button type="button" onClick={onClear} className="text-white/60 hover:text-white">
        Clear
      </button>
      {state && !state.ok && <span className="text-red-300">{state.message}</span>}
      <button type="submit" disabled={pending} className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 font-semibold hover:bg-brand-dark disabled:opacity-60">
        <Icon name="sparkle" className="h-4 w-4" />
        {pending ? 'Creating…' : `Generate ${ids.length === 1 ? 'ad' : `${ids.length} ads`}`}
      </button>
    </form>
  );
}
