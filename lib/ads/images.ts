// Prepares pictures for the slides. Satori only accepts PNG/JPEG data, so everything is converted here.
import sharp from 'sharp';

/** Any image (bytes or a URL, e.g. from Shopify or Higgsfield) → a JPEG data URI no wider than maxWidth. */
export async function toDataUri(source: Buffer | string, maxWidth = 1080): Promise<string> {
  const bytes = typeof source === 'string' ? await download(source) : source;
  // Converting also handles formats Satori can't read, like WebP from Shopify's CDN.
  const jpeg = await sharp(bytes).resize({ width: maxWidth, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download image (${res.status}): ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
