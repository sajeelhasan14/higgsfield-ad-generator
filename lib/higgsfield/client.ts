// The only file that talks to Higgsfield. Generation is asynchronous: submit a request, then ask for
// its status until it finishes. Failed or blocked requests are not charged (Higgsfield refunds them).
import { randomUUID } from 'node:crypto';

const BASE_URL = 'https://api.higgsfield.ai';

/** "Key ID:SECRET", as shown in the Higgsfield console. */
function authHeader(): string {
  const key = process.env.HIGGSFIELD_API_KEY?.trim();
  if (!key || !key.includes(':')) throw new Error('HIGGSFIELD_API_KEY must be set as KEY_ID:KEY_SECRET (see .env.example)');
  return `Key ${key}`;
}

export type RequestStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'nsfw' | 'canceled';

interface StatusResponse {
  status: RequestStatus;
  request_id: string;
  images?: { url: string }[];
  error?: string;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) throw new Error(`Higgsfield ${init.method ?? 'GET'} ${path} failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as T;
}

/**
 * Starts a generation and returns its request ID. The idempotency key makes a resend after a network
 * error count as the same request, so it is never paid for twice. Pass the same key to retry safely.
 */
export async function submit(model: string, input: Record<string, unknown>, idempotencyKey = randomUUID()): Promise<string> {
  const body = await call<{ request_id: string }>(`/${model}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  });
  return body.request_id;
}

export async function getStatus(requestId: string): Promise<StatusResponse> {
  return call<StatusResponse>(`/requests/${encodeURIComponent(requestId)}/status`);
}

/** Checks the status every few seconds until the request finishes; returns the image URLs or throws. */
export async function waitForImages(requestId: string, { timeoutMs = 5 * 60_000, intervalMs = 3_000 } = {}): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await getStatus(requestId);
    if (res.status === 'completed') return (res.images ?? []).map((i) => i.url);
    if (res.status === 'failed' || res.status === 'nsfw' || res.status === 'canceled') {
      throw new Error(`Higgsfield request ${requestId} ended as '${res.status}'${res.error ? `: ${res.error}` : ''}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Higgsfield request ${requestId} did not finish within ${Math.round(timeoutMs / 1000)}s`);
}
