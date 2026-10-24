// Display only: receives products as props and draws them. No data loading here.
import { formatPrice } from '@/lib/format';
import type { ProductWithVariants, Variant } from '@/lib/products/types';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  DRAFT: 'bg-amber-100 text-amber-800',
  ARCHIVED: 'bg-zinc-200 text-zinc-700',
};

export function ProductList({ products }: { products: ProductWithVariants[] }) {
  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
        No products yet. Press <strong>Sync from Shopify</strong> to load them.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {products.map((product) => (
        <li key={product.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start gap-4">
            <Thumbnail url={product.imageUrl} alt={product.title} size="h-16 w-16" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{product.title}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[product.status] ?? ''}`}>
                  {product.status.toLowerCase()}
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                {product.variants.length} variant{product.variants.length === 1 ? '' : 's'}
                {product.productType && ` · ${product.productType}`}
              </p>
            </div>
          </div>

          <table className="mt-4 w-full text-sm">
            <tbody>
              {product.variants.map((variant) => (
                <VariantRow key={variant.id} variant={variant} fallbackImage={product.imageUrl} />
              ))}
            </tbody>
          </table>
        </li>
      ))}
    </ul>
  );
}

function VariantRow({ variant, fallbackImage }: { variant: Variant; fallbackImage: string | null }) {
  const options = variant.options.map((o) => o.value).join(' / ');
  return (
    <tr className="border-t border-zinc-100 dark:border-zinc-800">
      <td className="w-12 py-2">
        <Thumbnail url={variant.imageUrl ?? fallbackImage} alt={variant.title} size="h-9 w-9" />
      </td>
      <td className="py-2">{options || variant.title}</td>
      <td className="py-2 text-zinc-500">{variant.sku}</td>
      <td className="py-2 text-right font-medium tabular-nums">
        {variant.compareAtPrice && (
          <span className="mr-2 text-zinc-400 line-through">{formatPrice(variant.compareAtPrice, variant.currency)}</span>
        )}
        {formatPrice(variant.price, variant.currency)}
      </td>
    </tr>
  );
}

function Thumbnail({ url, alt, size }: { url: string | null; alt: string; size: string }) {
  if (!url) return <div className={`${size} shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800`} />;
  // A plain <img> rather than next/image: Shopify's CDN already resizes images, so no extra setup is needed.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={`${size} shrink-0 rounded-md object-cover`} />;
}
