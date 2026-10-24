import { Suspense } from 'react';
import { connection } from 'next/server';
import { ProductList } from '@/components/products/ProductList';
import { SyncButton } from '@/components/products/SyncButton';
import { lastSyncedAt, listProductsWithVariants } from '@/lib/products/repository';

export default function ProductsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Products</h1>
        <SyncButton />
      </header>
      {/* The page frame shows instantly; the list streams in once the database answers. */}
      <Suspense fallback={<p className="text-zinc-500">Loading products…</p>}>
        <Products />
      </Suspense>
    </main>
  );
}

async function Products() {
  await connection(); // always read fresh rows from the database, never a copy saved at build time
  const [products, syncedAt] = await Promise.all([listProductsWithVariants(), lastSyncedAt()]);
  return (
    <>
      {syncedAt && <p className="mb-4 text-sm text-zinc-500">Last synced {syncedAt.toLocaleString('en-GB')}</p>}
      <ProductList products={products} />
    </>
  );
}
