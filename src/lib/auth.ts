/**
 * Moderator sign-in. One password from the environment, compared in constant
 * time. Sessions live in memory only: restarting the app signs everyone out,
 * and nothing about a session is ever written to disk.
 *
 * A session ends after 30 minutes without activity (see config.adminIdleSeconds).
 * Every request that finds a valid session pushes its deadline forward.
 * Nothing about attempts, successes or failures is counted or logged.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { config } from './config';

export const SESSION_COOKIE = 'tt_admin';
const COOKIE_PATH = '/admin';

/** token -> deadline (ms since epoch). A session is valid until its deadline passes. */
const sessions = new Map<string, number>();

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

function deadlineFrom(now: number): number {
  return now + config.adminIdleSeconds * 1000;
}

function sweep(now: number): void {
  for (const [token, deadline] of sessions) {
    if (deadline <= now) sessions.delete(token);
  }
}

export function startSession(cookies: AstroCookies): void {
  const now = Date.now();
  sweep(now);
  const token = randomBytes(32).toString('hex');
  sessions.set(token, deadlineFrom(now));
  // No maxAge or expires: a session cookie, gone when the browser closes.
  // The 30-minute inactivity limit is enforced here on the server.
  cookies.set(SESSION_COOKIE, token, {
    path: COOKIE_PATH,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });
}

export function endSession(cookies: AstroCookies): void {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) sessions.delete(token);
  cookies.delete(SESSION_COOKIE, { path: COOKIE_PATH });
}

/** True when the cookie names a live session. Extends the session's deadline. */
export function isSignedIn(cookies: AstroCookies): boolean {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const deadline = sessions.get(token);
  if (deadline === undefined) return false;
  const now = Date.now();
  if (deadline <= now) {
    sessions.delete(token);
    return false;
  }
  sessions.set(token, deadlineFrom(now));
  return true;
}
