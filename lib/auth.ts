// Dashboard login: one shared password (ADMIN_PASSWORD) and a signed cookie that says "logged in until <time>".
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const SESSION_COOKIE = 'session';
const SESSION_DAYS = 7;

function secret(): string {
  const value = process.env.SESSION_SECRET?.trim();
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must be at least 32 random characters (see .env.example)');
  return value;
}

function sign(text: string): string {
  return createHmac('sha256', secret()).update(text).digest('base64url');
}

/** Compares in constant time, so how long the answer takes doesn't reveal how much of a guess was right. */
function sameText(a: string, b: string): boolean {
  const hash = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

/**
 * The signature in a public image link (/public-media/<signature>/<key>). Instagram downloads post images
 * without logging in, so each shared image gets a link only our server can make; other files stay private.
 */
export function mediaSignature(key: string): string {
  return sign(`public-media:${key}`).slice(0, 32);
}

export function isValidMediaSignature(key: string, signature: string): boolean {
  try {
    return sameText(signature, mediaSignature(key));
  } catch {
    return false; // SESSION_SECRET missing
  }
}

export function checkPassword(attempt: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD is not set (see .env.example)');
  return sameText(attempt, password);
}

/** The cookie's value: "<expiry in ms>.<signature>". Only the server knows SESSION_SECRET, so only it can make one. */
function makeToken(expiresAt: number): string {
  return `${expiresAt}.${sign(String(expiresAt))}`;
}

/** true if we made this cookie value and it hasn't expired. Never throws: a bad cookie just means "not logged in". */
export function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expires, signature = ''] = token.split('.');
  try {
    return sameText(signature, sign(expires)) && Number(expires) > Date.now();
  } catch {
    return false; // SESSION_SECRET missing: nobody counts as logged in
  }
}

export async function startSession(): Promise<void> {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  (await cookies()).set(SESSION_COOKIE, makeToken(expiresAt), {
    httpOnly: true, // page scripts can't read it
    secure: process.env.NODE_ENV === 'production', // HTTPS only on the VPS; local dev is plain http
    sameSite: 'lax', // not sent along with form posts from other sites
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isLoggedIn(): Promise<boolean> {
  return isValidToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** First line of every server action: the proxy guards pages, but actions can be called directly. */
export async function requireLogin(): Promise<void> {
  if (!(await isLoggedIn())) redirect('/login');
}
