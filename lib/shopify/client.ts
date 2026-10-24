// The only file that talks to Shopify over HTTP: getting an access token and sending GraphQL queries.

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-10';

function storeDomain(): string {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  if (!domain) throw new Error('SHOPIFY_STORE_DOMAIN is not set (see .env.example)');
  return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// Tokens from the client-credentials grant last about 24 hours. We keep one in memory and
// fetch a new one shortly before it expires, instead of asking Shopify on every request.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  // A store that still has an old-style custom app can use its fixed token (shpat_…) instead.
  const fixed = process.env.SHOPIFY_ADMIN_TOKEN?.trim();
  if (fixed) return fixed;

  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET (or SHOPIFY_ADMIN_TOKEN) in .env.local');
  }

  const res = await fetch(`https://${storeDomain()}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) throw new Error(`Shopify login failed (${res.status}): ${await res.text()}`);

  const body = (await res.json()) as { access_token: string; expires_in?: number };
  const lifetimeSec = body.expires_in ?? 3600;
  // Renew one minute early so a token never expires in the middle of a sync.
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (lifetimeSec - 60) * 1000 };
  return cachedToken.value;
}

/** Sends one GraphQL query to the Shopify Admin API and returns its `data`. Throws on any error. */
export async function shopifyGraphql<T>(queryText: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://${storeDomain()}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': await accessToken() },
    body: JSON.stringify({ query: queryText, variables }),
  });
  if (!res.ok) throw new Error(`Shopify request failed (${res.status}): ${await res.text()}`);

  // GraphQL reports problems (bad query, missing permission, rate limit) inside a 200 response.
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(`Shopify error: ${body.errors.map((e) => e.message).join('; ')}`);
  if (!body.data) throw new Error('Shopify returned no data');
  return body.data;
}
