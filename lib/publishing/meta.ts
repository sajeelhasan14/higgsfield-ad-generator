// The only file that talks to Meta's Graph API: posts one image with a caption to the Instagram account
// and to the Facebook Page. Both need a Page access token and a public https link to a JPEG.
import { META_GRAPH_VERSION, metaSettings, type MetaSettings } from '@/lib/config';

interface GraphErrorBody {
  error?: { message: string; code: number; error_subcode?: number };
}

/** One Graph API call. GET and DELETE send the fields in the address, POST in the body. Never puts the token in an error. */
export async function graph<T>(path: string, params: Record<string, string>, method: 'GET' | 'POST' | 'DELETE' = 'GET'): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${path}`);
  let res: Response;
  if (method === 'POST') {
    res = await fetch(url, { method: 'POST', body: new URLSearchParams(params) });
  } else {
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    res = await fetch(url, { method });
  }
  const body = (await res.json().catch(() => ({}))) as T & GraphErrorBody;
  if (!res.ok || body.error) {
    const e = body.error;
    throw new Error(`Meta: ${e?.message ?? `HTTP ${res.status}`}${e ? ` (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ''})` : ''}`);
  }
  return body;
}

// Fetched once from the Page and reused; a System User token can read its Pages' tokens.
let cachedPageToken: string | null = null;

export async function pageAccessToken(settings: MetaSettings = metaSettings()): Promise<string> {
  if (settings.pageAccessToken) return settings.pageAccessToken;
  if (cachedPageToken) return cachedPageToken;
  const page = await graph<{ access_token?: string }>(settings.pageId, { fields: 'access_token', access_token: settings.accessToken });
  if (!page.access_token) throw new Error('Meta did not return a Page access token: the token needs access to this Page (pages_show_list, pages_manage_posts)');
  cachedPageToken = page.access_token;
  return cachedPageToken;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Instagram posts in two steps: Meta first downloads the image into a "container", then the container is
 * published. Images are usually ready within seconds; if not, the post is retried later by the worker.
 */
export async function postToInstagram(imageUrl: string, caption: string): Promise<string> {
  const settings = metaSettings();
  const token = await pageAccessToken(settings);

  const container = await graph<{ id: string }>(`${settings.igUserId}/media`, { image_url: imageUrl, caption, access_token: token }, 'POST');
  await waitUntilReady(container.id, token);

  const published = await graph<{ id: string }>(`${settings.igUserId}/media_publish`, { creation_id: container.id, access_token: token }, 'POST');
  return published.id;
}

/**
 * An Instagram carousel (2–10 images): each image becomes a carousel item, then one carousel container holds
 * them in order with the caption, and that container is published. It counts as one post in Instagram's limit.
 */
export async function postCarouselToInstagram(imageUrls: string[], caption: string): Promise<string> {
  const settings = metaSettings();
  const token = await pageAccessToken(settings);

  const children: string[] = [];
  for (const imageUrl of imageUrls) {
    const item = await graph<{ id: string }>(`${settings.igUserId}/media`, { image_url: imageUrl, is_carousel_item: 'true', access_token: token }, 'POST');
    await waitUntilReady(item.id, token);
    children.push(item.id);
  }

  const carousel = await graph<{ id: string }>(
    `${settings.igUserId}/media`,
    { media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token },
    'POST',
  );
  await waitUntilReady(carousel.id, token);

  const published = await graph<{ id: string }>(`${settings.igUserId}/media_publish`, { creation_id: carousel.id, access_token: token }, 'POST');
  return published.id;
}

/** Waits (up to a minute) until Instagram has downloaded and processed a container; if not, the post is retried later. */
async function waitUntilReady(containerId: string, token: string): Promise<void> {
  for (let check = 0; ; check++) {
    const { status_code } = await graph<{ status_code: string }>(containerId, { fields: 'status_code', access_token: token });
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram could not process the image (${status_code})`);
    if (check >= 12) throw new Error('Instagram is still processing the image; it will be tried again');
    await sleep(5000);
  }
}

/** A Facebook Page photo post: the image with the caption as its text, published straight away. */
export async function postToFacebook(imageUrl: string, caption: string): Promise<string> {
  const settings = metaSettings();
  const token = await pageAccessToken(settings);
  const photo = await graph<{ id: string; post_id?: string }>(
    `${settings.pageId}/photos`,
    { url: imageUrl, message: caption, published: 'true', access_token: token },
    'POST',
  );
  return photo.post_id ?? photo.id;
}
