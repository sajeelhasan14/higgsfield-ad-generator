// Small facts that must survive a restart: whether Pause everything is on, and when the worker last ran.
import { query } from '@/lib/db';

async function read(key: string): Promise<string | null> {
  const [row] = await query<{ value: string }>(`SELECT value FROM app_state WHERE key = $1`, [key]);
  return row?.value ?? null;
}

async function write(key: string, value: string): Promise<void> {
  await query(`INSERT INTO app_state (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [key, value]);
}

export async function isPaused(): Promise<boolean> {
  return (await read('paused')) === '1';
}

export async function setPaused(paused: boolean): Promise<void> {
  await write('paused', paused ? '1' : '0');
}

export async function markWorkerSeen(): Promise<void> {
  await write('worker_seen', new Date().toISOString());
}

/** The worker notes itself every minute, so 5 minutes of silence means it has stopped. */
export async function workerStatus(): Promise<{ seen: Date | null; alive: boolean }> {
  const value = await read('worker_seen');
  const seen = value ? new Date(value) : null;
  return { seen, alive: seen !== null && Date.now() - seen.getTime() < 5 * 60 * 1000 };
}
