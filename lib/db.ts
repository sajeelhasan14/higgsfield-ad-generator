import { Pool, type PoolClient } from 'pg';

// Next.js reloads this file on every save in development. Keeping the pool on globalThis
// means we reuse one pool instead of opening a new set of connections each time.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

/** A database on this machine needs no encryption; a remote one (e.g. the VPS from your laptop) does. */
export function sslFor(connectionString: string): { rejectUnauthorized: false } | undefined {
  const host = new URL(connectionString).hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  return local ? undefined : { rejectUnauthorized: false };
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set (see .env.example)');

  const pool = new Pool({ connectionString, max: 5, ssl: sslFor(connectionString) });
  // A dropped idle connection emits 'error'; without a handler it would crash the app.
  pool.on('error', (err) => console.error('pg pool error:', err.message));
  return pool;
}

export function getPool(): Pool {
  globalForDb.pgPool ??= createPool();
  return globalForDb.pgPool;
}

/** Runs one SQL statement and returns its rows. Always pass values as params ($1, $2…), never inside the SQL text. */
export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

/**
 * Runs several statements as one unit: either all of them are saved, or (if any throws) none are.
 * Every statement must use the `client` passed in, not query(), or it runs outside the transaction.
 */
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
