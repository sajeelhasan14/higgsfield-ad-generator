// Serves a post image to Instagram and Facebook, which download it without logging in:
// /public-media/<signature>/ads/12/a4-post-….jpg. Only links made by lib/publishing/media.ts are accepted.
import { isValidMediaSignature } from '@/lib/auth';
import { readStoredFile } from '@/lib/storage';

export async function GET(_request: Request, ctx: { params: Promise<{ sig: string; key: string[] }> }) {
  const { sig, key: parts } = await ctx.params;
  const key = parts.join('/');
  // Missing file, wrong signature and anything outside ads/ all look the same from outside.
  const notFound = new Response('Not found', { status: 404 });
  if (!key.startsWith('ads/') || !isValidMediaSignature(key, sig)) return notFound;
  try {
    const bytes = await readStoredFile(key);
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
  } catch {
    return notFound;
  }
}
