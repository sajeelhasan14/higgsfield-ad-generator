// A made-up product (based on the Gym Floor Store reference ad) for previews before Shopify is connected.
import type { ProductWithVariants, Variant } from '@/lib/products/types';

const variant = (id: string, price: string, compareAtPrice: string | null, options: [string, string][]): Variant => ({
  id,
  productId: 'sample',
  title: options.map(([, v]) => v).join(' / '),
  sku: null,
  price,
  compareAtPrice,
  currency: 'GBP',
  options: options.map(([name, value]) => ({ name, value })),
  imageUrl: null,
  position: 0,
});

export const sampleProduct: ProductWithVariants = {
  id: 'sample',
  title: 'GFS Connect Tile – Interlocking Rubber Gym Tile',
  handle: 'gfs-connect-tile',
  description: '',
  vendor: 'Gym Floor Store',
  productType: 'Rubber gym flooring',
  status: 'ACTIVE',
  imageUrl: null,
  shopifyUpdatedAt: new Date().toISOString(),
  variants: [
    variant('v1', '45.00', null, [['Thickness', '20mm'], ['Colour', 'Black fleck']]),
    variant('v2', '22.50', null, [['Thickness', '20mm'], ['Colour', 'Light grey']]),
    variant('v3', '30.00', null, [['Thickness', '30mm'], ['Colour', 'Black']]),
    variant('v4', '39.25', '45.00', [['Thickness', '40mm'], ['Colour', 'Red fleck']]),
  ],
};

/** How each sample variant looks, in words, for the AI prompts. */
export const sampleLooks: Record<string, string> = {
  hero: 'matte black rubber with fine white and grey flecks',
  v1: '20mm thick matte black rubber with fine white and grey flecks',
  v2: '20mm thick light grey rubber with dark grey and white flecks',
  v3: '30mm thick solid matte black rubber',
  v4: '40mm thick matte black rubber with bright red and orange flecks',
};
