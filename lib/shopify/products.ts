// Reads the whole catalog from Shopify and converts it into the app's own types.
import type { Product, ProductStatus, Variant } from '@/lib/products/types';
import { shopifyGraphql } from './client';

// Products and variants are fetched with two separate queries. Asking for "100 products, each with
// 100 variants" in one query would exceed Shopify's per-query cost limit; two flat lists stay well under it.
const SHOP_QUERY = `{ shop { currencyCode } }`;

const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id title handle description vendor productType status updatedAt
        featuredMedia { preview { image { url } } }
      }
    }
  }`;

const VARIANTS_QUERY = `
  query Variants($cursor: String) {
    productVariants(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id title sku price compareAtPrice position
        selectedOptions { name value }
        product { id }
        media(first: 1) { nodes { preview { image { url } } } }
      }
    }
  }`;

// The parts of Shopify's response we use.
interface Page<T> {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: T[];
}
type MediaImage = { preview: { image: { url: string } | null } | null } | null;

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  vendor: string;
  productType: string;
  status: ProductStatus;
  updatedAt: string;
  featuredMedia: MediaImage;
}

interface ShopifyVariant {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  position: number;
  selectedOptions: { name: string; value: string }[];
  product: { id: string };
  media: { nodes: MediaImage[] };
}

/** Shopify returns at most 100 items per request; this keeps asking for the next page until there are none. */
async function fetchAllPages<Data, T>(queryText: string, pick: (data: Data) => Page<T>): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const page: Page<T> = pick(await shopifyGraphql<Data>(queryText, { cursor }));
    items.push(...page.nodes);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return items;
}

const imageUrl = (media: MediaImage): string | null => media?.preview?.image?.url ?? null;

/** The full catalog: every product and every variant, already in the app's own format. */
export async function fetchShopifyCatalog(): Promise<{ products: Product[]; variants: Variant[] }> {
  const { shop } = await shopifyGraphql<{ shop: { currencyCode: string } }>(SHOP_QUERY);
  const rawProducts = await fetchAllPages(PRODUCTS_QUERY, (d: { products: Page<ShopifyProduct> }) => d.products);
  const rawVariants = await fetchAllPages(VARIANTS_QUERY, (d: { productVariants: Page<ShopifyVariant> }) => d.productVariants);

  const products: Product[] = rawProducts.map((p) => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description,
    vendor: p.vendor,
    productType: p.productType,
    status: p.status,
    imageUrl: imageUrl(p.featuredMedia),
    shopifyUpdatedAt: p.updatedAt,
  }));

  const variants: Variant[] = rawVariants.map((v) => ({
    id: v.id,
    productId: v.product.id,
    title: v.title,
    sku: v.sku || null,
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    currency: shop.currencyCode,
    options: v.selectedOptions,
    imageUrl: imageUrl(v.media.nodes[0] ?? null),
    position: v.position,
  }));

  return { products, variants };
}
