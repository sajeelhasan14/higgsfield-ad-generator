// TEMPORARY, until the client's Shopify Admin access arrives: loads the store's public products.json pages,
// saved from a browser, into the database in the same shape as a Shopify sync (lib/shopify/products.ts).
// Usage: npm run import:products-json                 reads every .json file in imports/
//        npm run import:products-json -- --currency EUR   products.json has no currency; GBP by default
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPool } from '@/lib/db';
import { replaceCatalog } from '@/lib/products/repository';
import type { Product, Variant } from '@/lib/products/types';

const IMPORT_DIR = 'imports';

// The parts of products.json we use.
interface JsonVariant {
  id: number;
  title: string;
  sku: string | null;
  price: string;
  compare_at_price: string | null;
  position: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  featured_image: { src: string } | null;
}

interface JsonProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  updated_at: string;
  options: { name: string; position: number }[];
  images: { src: string; position: number }[];
  variants: JsonVariant[];
}

// The real sync stores Shopify's global IDs; using the same ones keeps ads linked when it takes over.
const productGid = (id: number) => `gid://shopify/Product/${id}`;
const variantGid = (id: number) => `gid://shopify/ProductVariant/${id}`;

/** products.json gives the description as HTML; the Admin API (and so the rest of the app) uses plain text. */
function htmlToText(html: string | null): string {
  return (html ?? '')
    .replace(/<(br|\/p|\/li|\/h\d|\/div)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

async function main() {
  const flag = process.argv.indexOf('--currency');
  const currency = (flag > -1 ? process.argv[flag + 1] : 'GBP').toUpperCase();

  const files = (await readdir(IMPORT_DIR).catch(() => [])).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) throw new Error(`No .json files in ${IMPORT_DIR}/. Save the products.json pages there first.`);

  // A product can appear on two pages if the store changed while they were being saved; the last copy wins.
  const byId = new Map<number, JsonProduct>();
  for (const file of files) {
    const { products } = JSON.parse(await readFile(path.join(IMPORT_DIR, file), 'utf8')) as { products?: JsonProduct[] };
    if (!Array.isArray(products)) throw new Error(`${file} is not a products.json page`);
    for (const p of products) byId.set(p.id, p);
    console.log(`  ${file}: ${products.length} products`);
  }

  const products: Product[] = [];
  const variants: Variant[] = [];
  for (const p of byId.values()) {
    const optionNames = [...p.options].sort((a, b) => a.position - b.position).map((o) => o.name);
    products.push({
      id: productGid(p.id),
      title: p.title,
      handle: p.handle,
      description: htmlToText(p.body_html),
      vendor: p.vendor,
      productType: p.product_type,
      status: 'ACTIVE', // products.json only lists products that are live on the online store
      imageUrl: [...p.images].sort((a, b) => a.position - b.position)[0]?.src ?? null,
      shopifyUpdatedAt: p.updated_at,
    });
    for (const v of p.variants) {
      const values = [v.option1, v.option2, v.option3];
      variants.push({
        id: variantGid(v.id),
        productId: productGid(p.id),
        title: v.title,
        sku: v.sku || null,
        price: v.price,
        compareAtPrice: v.compare_at_price || null,
        currency,
        options: optionNames.flatMap((name, i) => (values[i] ? [{ name, value: values[i] }] : [])),
        imageUrl: v.featured_image?.src ?? null,
        position: v.position,
      });
    }
  }

  // replaceCatalog deletes every product not in the list, so an empty import must never reach it.
  if (products.length === 0) throw new Error('The files contain no products, so nothing was changed.');

  await replaceCatalog(products, variants);
  console.log(`Imported ${products.length} products and ${variants.length} variants (prices in ${currency}).`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
