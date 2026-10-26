// The background worker: a separate process from the website that runs its tasks every 10 seconds.
// Start it with: npm run worker
import { getPool } from '@/lib/db';
import { GENERATION_DRY_RUN, PUBLISH_DRY_RUN } from '@/lib/config';
import { generateAds } from './tasks/generate-ads';
import { publishDuePosts } from './tasks/publish-due-posts';
import { syncProductsDaily } from './tasks/sync-products';

const INTERVAL_MS = 10_000;

// Each task runs once per tick, in this order: posting first, because it is time-critical.
const tasks: { name: string; run: () => Promise<void> }[] = [
  { name: 'publish due posts', run: publishDuePosts },
  { name: 'generate ads', run: generateAds },
  { name: 'daily Shopify sync', run: syncProductsDaily },
];

let stopping = false;
let currentTick: Promise<void> = Promise.resolve();

async function tick() {
  for (const task of tasks) {
    try {
      await task.run();
    } catch (err) {
      // One failing task (e.g. database briefly down) must not stop the worker; it tries again next tick.
      console.error(`Task "${task.name}" failed:`, err);
    }
  }
}

async function main() {
  console.log('Worker started');
  if (PUBLISH_DRY_RUN) console.log('  publishing: dry run, nothing is really posted');
  if (GENERATION_DRY_RUN) console.log('  generation: dry run, real Shopify photos instead of Higgsfield');
  while (!stopping) {
    currentTick = tick();
    await currentTick;
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}

// Ctrl+C (SIGINT) or the server stopping the service (SIGTERM): let the current post finish, then exit.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    if (stopping) return;
    stopping = true;
    console.log('Stopping after the current task…');
    await currentTick;
    await getPool().end();
    process.exit(0);
  });
}

main();
