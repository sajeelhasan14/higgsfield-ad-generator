// Where generated files (slide JPEGs, AI pictures) are kept. For now: a local folder, shown in the
// dashboard through /media/…. When the VPS-disk vs Supabase decision is made, only this file changes;
// callers only ever see storage keys like "ads/12/a1-slide-1.jpg".
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.env.STORAGE_DIR || 'storage');

/** Turns a key into a path inside ROOT, refusing anything that would escape it (e.g. "../.env.local"). */
function resolveKey(key: string): string {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error(`Invalid storage key: ${key}`);
  return full;
}

export async function saveFile(key: string, bytes: Buffer): Promise<string> {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  return key;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

/** Deletes every file under a folder key, e.g. all of one ad's slides. */
export async function deleteFolder(prefix: string): Promise<void> {
  await rm(resolveKey(prefix), { recursive: true, force: true });
}

/** The address the dashboard uses to show a stored file. */
export function mediaUrl(key: string): string {
  return `/media/${key.split('/').map(encodeURIComponent).join('/')}`;
}
