// Runs db/schema.sql against DATABASE_URL. Usage: npm run migrate
import { readFileSync } from 'node:fs';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set (see .env.example)');

// Same rule as lib/db.ts: no SSL for a database on this machine, SSL for a remote one.
const host = new URL(connectionString).hostname;
const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
const client = new pg.Client({ connectionString, ssl: local ? undefined : { rejectUnauthorized: false } });
await client.connect();
try {
  // With no params, pg sends the text as one simple query, so a file with many statements works.
  await client.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  console.log('Schema applied.');
} finally {
  await client.end();
}
