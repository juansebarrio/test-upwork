/**
 * Moderator sign-in. One password from the environment, compared in constant
 * time. Sessions live in memory only: restarting the app signs everyone out,
 * and nothing about a session is ever written to disk.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { config } from './config';

export const SESSION_COOKIE = 'tt_admin';
const COOKIE_PATH = '/admin';

const sessions = new Map<string, number>(); // token -> expiry (ms since epoch)

function sha256(input: string): Buffer {
  return createHash('sha256').update(input, 'utf8').digest();
}

/**
 * Hashing both sides first means the comparison always runs over 32 bytes,
 * so neither the length nor the content of the real password leaks through timing.
 */
export function passwordMatches(candidate: string): boolean {
  if (!config.adminPassword) return false;
  return timingSafeEqual(sha256(candidate), sha256(config.adminPassword));
}

function sweep(now: number): void {
  for (const [token, expiry] of sessions) {
    if (expiry <= now) sessions.delete(token);
  }
}

export function startSession(cookies: AstroCookies): void {
  const now = Date.now();
  sweep(now);
  const token = randomBytes(32).toString('hex');
  sessions.set(token, now + config.adminSessionSeconds * 1000);
  cookies.set(SESSION_COOKIE, token, {
    path: COOKIE_PATH,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: config.adminSessionSeconds,
  });
}

export function endSession(cookies: AstroCookies): void {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) sessions.delete(token);
  cookies.delete(SESSION_COOKIE, { path: COOKIE_PATH });
}

export function isSignedIn(cookies: AstroCookies): boolean {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const expiry = sessions.get(token);
  if (expiry === undefined) return false;
  if (expiry <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}
