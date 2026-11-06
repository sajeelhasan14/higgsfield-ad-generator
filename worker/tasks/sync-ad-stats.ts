import { syncAdStats } from '@/lib/analytics/sync';

const CHECK_EVERY_MS = 60 * 60 * 1000;
let nextCheck = 0;

/** Once an hour: spend and clicks per paid ad per day. Meta's numbers change slowly, so more often gains nothing. */
export async function syncAdStatsHourly(): Promise<void> {
  if (Date.now() < nextCheck) return;
  nextCheck = Date.now() + CHECK_EVERY_MS;
  await syncAdStats();
}
