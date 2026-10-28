// Decides what goes on a product's post images, then renders them to JPEGs:
// - the single post (Facebook, and Instagram when there is no carousel): the cover with a strip of variant cards;
// - the Instagram carousel, only when every variant card has its own photo: cover, one slide per card, shop slide.
// The caption lists every variant.
import { formatPrice } from '@/lib/format';
import type { ProductWithVariants, Variant } from '@/lib/products/types';
import { download, toBackdropDataUri, toDataUri } from './images';
import { hasFromPrice, leadVariant, priceUnit } from './pricing';
import { renderSlide } from './render';
import { FRAME_HEIGHT, ShopSlide, VariantSlide } from './templates/CarouselSlides';
import { PostImage, type CardProps } from './templates/PostImage';
import { shortName, titleFacts } from './text';
import { variantCards, type VariantCard } from './variants';

/** Card photos are drawn about 200px wide; 400px keeps them sharp without making the render slow. */
const CARD_PHOTO_WIDTH = 400;
/** On a carousel slide the variant photo is about 950px wide. */
const SLIDE_PHOTO_WIDTH = 1080;

/** "£2,150" fits the image better than "£2,150.00"; pence stay when there are any. */
function shortPrice(amount: string, currency: string): string {
  return formatPrice(amount, currency).replace(/\.00$/, '');
}

const isOnSale = (v: Variant) => v.compareAtPrice !== null && Number(v.compareAtPrice) > Number(v.price);

/** Every variant's price as one string ("id:208.00:|id:84.00:"). If Shopify's prices change, so does this. */
export function priceSignature(product: ProductWithVariants): string {
  return product.variants.map((v) => `${v.id}:${v.price}:${v.compareAtPrice ?? ''}`).sort().join('|');
}

/** Downloads each distinct card photo once, at the given width. A failed download just leaves it out. */
async function cardPhotos(cards: VariantCard[], width: number): Promise<Record<string, string>> {
  const photos: Record<string, string> = {};
  for (const c of cards) {
    if (c.imageUrl && !photos[c.imageUrl]) {
      const photo = await toDataUri(c.imageUrl, width).catch(() => null);
      if (photo) photos[c.imageUrl] = photo;
    }
  }
  return photos;
}

/** For carousel slides: each distinct card photo, plus the blurred backdrop that fills its frame. */
async function slidePhotos(cards: VariantCard[]): Promise<Record<string, { photo: string; backdrop: string }>> {
  const photos: Record<string, { photo: string; backdrop: string }> = {};
  for (const c of cards) {
    if (!c.imageUrl || photos[c.imageUrl]) continue;
    const bytes = await download(c.imageUrl).catch(() => null);
    if (bytes) photos[c.imageUrl] = { photo: await toDataUri(bytes, SLIDE_PHOTO_WIDTH), backdrop: await toBackdropDataUri(bytes, SLIDE_PHOTO_WIDTH, FRAME_HEIGHT) };
  }
  return photos;
}

/** True when every card has a downloaded photo: only then are photos shown on the cards, or a carousel made. */
const allHavePhotos = (cards: VariantCard[], photos: Record<string, unknown>) => cards.length > 0 && cards.every((c) => c.imageUrl && photos[c.imageUrl]);

/**
 * The variant cards with their photos. If any card has no photo, the whole row is drawn without photos,
 * so the row never has a gap.
 */
function cardProps(cards: VariantCard[], photos: Record<string, string>): CardProps[] {
  const withPhotos = allHavePhotos(cards, photos);
  return cards.map((c) => ({
    label: c.label,
    price: shortPrice(c.price, c.currency),
    fromPrice: c.fromPrice,
    photo: withPhotos ? photos[c.imageUrl!] : null,
  }));
}

/**
 * The cover as JSX. Pure: the same product, picture and card photos (by Shopify URL) always give the same image.
 * With `swipe`, it is a carousel cover: no card strip, and the button says how many option slides follow.
 */
export function buildPost(product: ProductWithVariants, image: string, photos: Record<string, string> = {}, swipe: number | null = null) {
  const { variants } = product;
  if (variants.length === 0) throw new Error(`"${product.title}" has no variants to show`);

  const lead = leadVariant(variants);
  const headline = shortName(product.title);
  // The product type often repeats the name ("Gym Turf Sled Track" twice); the general label is used then.
  const eyebrow = product.productType && !headline.toLowerCase().includes(product.productType.toLowerCase()) ? product.productType : 'Gym Flooring';

  return (
    <PostImage
      image={image}
      eyebrow={eyebrow}
      headline={headline}
      facts={titleFacts(product.title)}
      cards={swipe ? [] : cardProps(variantCards(variants), photos)}
      price={shortPrice(lead.price, lead.currency)}
      fromPrice={hasFromPrice(variants)}
      unit={priceUnit(product)}
      wasPrice={isOnSale(lead) ? shortPrice(lead.compareAtPrice!, lead.currency) : null}
      swipe={swipe}
    />
  );
}

export interface RenderedAd {
  post: Buffer; // the single post image
  carousel: Buffer[]; // the Instagram carousel slides, or none
}

/** Draws the single post and, when every variant card has its own photo, the Instagram carousel. */
export async function renderAd(product: ProductWithVariants, image: string): Promise<RenderedAd> {
  const cards = variantCards(product.variants);
  const post = await renderSlide(buildPost(product, image, await cardPhotos(cards, CARD_PHOTO_WIDTH)));

  const photos = await slidePhotos(cards);
  if (!allHavePhotos(cards, photos)) return { post, carousel: [] };

  const name = shortName(product.title);
  const unit = priceUnit(product);
  const carousel = [await renderSlide(buildPost(product, image, {}, cards.length))];
  for (const c of cards) {
    const slide = (
      <VariantSlide
        photo={photos[c.imageUrl!].photo}
        backdrop={photos[c.imageUrl!].backdrop}
        chips={c.chips}
        productName={name}
        price={shortPrice(c.price, c.currency)}
        fromPrice={c.fromPrice}
        unit={unit}
      />
    );
    carousel.push(await renderSlide(slide));
  }
  carousel.push(await renderSlide(<ShopSlide headline={name} />));
  return { post, carousel };
}
