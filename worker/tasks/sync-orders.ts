import { syncOrders } from '@/lib/analytics/sync';

const CHECK_EVERY_MS = 15 * 60 * 1000;
let nextCheck = 0;

/** Every 15 minutes: new orders, refunds and late visit details reach the Analytics page. */
export async function syncOrdersRegularly(): Promise<void> {
  if (Date.now() < nextCheck) return;
  nextCheck = Date.now() + CHECK_EVERY_MS;
  await syncOrders();
}
