import { Suspense } from 'react';
import { connection } from 'next/server';
import { ProductBrowser, type ProductCard } from '@/components/products/ProductBrowser';
import { SyncButton } from '@/components/products/ProductActions';
import { PageHeader, StatRow } from '@/components/shell/PageParts';
import { GENERATION_DRY_RUN } from '@/lib/config';
import { formatPrice } from '@/lib/format';
import { lastSyncedAt, listProductsWithVariants } from '@/lib/products/repository';
import type { ProductWithVariants } from '@/lib/products/types';

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* The page frame shows instantly; the numbers and the grid stream in once the database answers. */}
      <Suspense fallback={<PageHeader eyebrow="Store · Catalog" title="Products" subtitle="Loading products…" actions={<SyncButton />} />}>
        <Products />
      </Suspense>
    </div>
  );
}

/** Only what a product card needs, so the browser isn't sent 678 full descriptions and every variant. */
function toCard(p: ProductWithVariants): ProductCard {
  const prices = p.variants.map((v) => Number(v.price));
  const currency = p.variants[0]?.currency ?? 'GBP';
  const min = prices.length ? Math.min(...prices) : null;
  return {
    id: p.id,
    title: p.title,
    productType: p.productType,
    status: p.status,
    imageUrl: p.imageUrl,
    variantCount: p.variants.length,
    minPrice: min,
    price: min === null ? '—' : `${new Set(prices).size > 1 ? 'from ' : ''}${formatPrice(String(min), currency)}`,
    onSale: p.variants.some((v) => v.compareAtPrice !== null && Number(v.compareAtPrice) > Number(v.price)),
  };
}

async function Products() {
  await connection(); // always read fresh rows from the database, never a copy saved at build time
  const [products, syncedAt] = await Promise.all([listProductsWithVariants(), lastSyncedAt()]);
  const variants = products.reduce((sum, p) => sum + p.variants.length, 0);
  const withPhoto = products.filter((p) => p.imageUrl).length;

  return (
    <>
      <PageHeader
        eyebrow="Store · Catalog"
        title="Products"
        subtitle={`${products.length.toLocaleString('en-GB')} products · ${variants.toLocaleString('en-GB')} variants · ${
          syncedAt ? `synced with Shopify ${syncedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : 'not synced yet'
        }`}
        actions={<SyncButton />}
      />
      <StatRow
        stats={[
          { label: 'Total products', value: products.length },
          { label: 'Variants', value: variants, tone: 'blue' },
          { label: 'Ready for ads', value: withPhoto, tone: 'green' },
          { label: 'No photo', value: products.length - withPhoto, tone: 'red' },
        ]}
      />
      <ProductBrowser products={products.map(toCard)} dryRun={GENERATION_DRY_RUN} />
    </>
  );
}
