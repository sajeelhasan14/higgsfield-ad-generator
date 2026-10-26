// Serves stored files (post JPEGs) to the dashboard: /media/ads/12/a1-post.jpg
import { isLoggedIn } from '@/lib/auth';
import { readStoredFile } from '@/lib/storage';

export async function GET(_request: Request, ctx: RouteContext<'/media/[...key]'>) {
  if (!(await isLoggedIn())) return new Response('Unauthorized', { status: 401 });
  const { key } = await ctx.params;
  try {
    const bytes = await readStoredFile(key.join('/'));
    return new Response(new Uint8Array(bytes), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' },
    });
  } catch {
    // Missing file and invalid key look the same from outside.
    return new Response('Not found', { status: 404 });
  }
}
