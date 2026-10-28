// Prepares pictures for the slides. Satori only accepts PNG/JPEG data, so everything is converted here.
import sharp from 'sharp';

/** Any image (bytes or a URL, e.g. from Shopify or Higgsfield) → a JPEG data URI no wider than maxWidth. */
export async function toDataUri(source: Buffer | string, maxWidth = 1080): Promise<string> {
  const bytes = typeof source === 'string' ? await download(source) : source;
  // Converting also handles formats Satori can't read, like WebP from Shopify's CDN.
  const jpeg = await sharp(bytes).resize({ width: maxWidth, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

/** A blurred, darkened copy that fills a frame of the given size: the backdrop behind a photo shown whole. */
export async function toBackdropDataUri(source: Buffer, width: number, height: number): Promise<string> {
  const jpeg = await sharp(source).resize(width, height, { fit: 'cover' }).blur(40).modulate({ brightness: 0.55 }).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

/** Downloads an image, trying once more after a short pause: Shopify's CDN occasionally drops a request. */
export async function download(url: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Could not download image (${res.status}): ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt >= 2) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}
