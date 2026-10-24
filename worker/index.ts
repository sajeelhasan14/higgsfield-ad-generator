// The background worker: a separate process from the website that runs its tasks every 30 seconds.
// Start it with: npm run worker
import { getPool } from '@/lib/db';
import { PUBLISH_DRY_RUN } from '@/lib/config';
import { publishDuePosts } from './tasks/publish-due-posts';

const INTERVAL_MS = 30_000;

// Each task runs once per tick. Ad generation (Higgsfield) will be added to this list.
const tasks: { name: string; run: () => Promise<void> }[] = [{ name: 'publish due posts', run: publishDuePosts }];

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
  console.log(`Worker started${PUBLISH_DRY_RUN ? ' (dry run: nothing is really posted)' : ''}`);
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
