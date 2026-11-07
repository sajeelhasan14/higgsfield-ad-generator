import { runAutopilot } from '@/lib/autopilot/act';
import { markWorkerSeen } from '@/lib/autopilot/state';

const RUN_EVERY_MS = 60 * 60 * 1000;
const SEEN_EVERY_MS = 60 * 1000;
let nextRun = 0;
let nextSeen = 0;

/**
 * Every minute: notes that the worker is alive, for the Autopilot page. Every hour: runs the autopilot.
 */
export async function autopilotTick(): Promise<void> {
  if (Date.now() >= nextSeen) {
    nextSeen = Date.now() + SEEN_EVERY_MS;
    await markWorkerSeen();
  }
  if (Date.now() < nextRun) return;
  nextRun = Date.now() + RUN_EVERY_MS;
  await runAutopilot();
}
