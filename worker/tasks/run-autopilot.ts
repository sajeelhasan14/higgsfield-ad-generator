import { runAutopilot } from '@/lib/autopilot/act';
import { markWorkerSeen } from '@/lib/autopilot/state';
import { HEALTHCHECK_PING_URL } from '@/lib/config';

const RUN_EVERY_MS = 60 * 60 * 1000;
const SEEN_EVERY_MS = 60 * 1000;
let nextRun = 0;
let nextSeen = 0;

/**
 * Every minute: notes that the worker is alive, for the Autopilot page.
 * Every hour: pings the outside monitor, which raises the alarm if the pings stop, then runs the autopilot.
 */
export async function autopilotTick(): Promise<void> {
  if (Date.now() >= nextSeen) {
    nextSeen = Date.now() + SEEN_EVERY_MS;
    await markWorkerSeen();
  }
  if (Date.now() < nextRun) return;
  nextRun = Date.now() + RUN_EVERY_MS;
  if (HEALTHCHECK_PING_URL) await fetch(HEALTHCHECK_PING_URL).catch((err) => console.error('Health ping failed:', err.message));
  await runAutopilot();
}
