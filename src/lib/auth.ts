/**
 * Moderator sign-in.
 *
 * Normal mode: the passphrase is chosen by the collective through a one-time
 * setup link and stored in the `settings` table as a scrypt hash with its own
 * random salt. Nothing is ever stored in plain text. Sessions live in memory
 * only: restarting the app signs everyone out, and nothing about a session is
 * ever written to disk.
 *
 * DEMO_MODE: the preview's ADMIN_PASSWORD is used instead, and the session is a
 * signed cookie because a preview host shares no memory between instances.
 *
 * A session ends after 30 minutes without activity (config.adminIdleSeconds).
 * Every request that finds a valid session pushes its deadline forward.
 * Nothing about attempts, successes or failures is counted or logged.
 */
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { config } from './config';
import type { Store } from './store';

export const SESSION_COOKIE = 'tt_admin';
const COOKIE_PATH = '/admin';

/** settings keys. The setup token value is `<sha256 hex>.<expiry ms>`. */
export const PASSPHRASE_KEY = 'passphrase';
export const SETUP_TOKEN_KEY = 'setup_token';

const SCRYPT = { N: 1 << 15, r: 8, p: 1, keylen: 64, maxmem: 128 * 1024 * 1024 };

/** token -> deadline (ms since epoch). A session is valid until its deadline passes. */
const sessions = new Map<string, number>();

function sha256(input: string): Buffer {
  return createHash('sha256').update(input, 'utf8').digest();
}

function equal(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `scrypt$N$r$p$<salt hex>$<hash hex>`, with a fresh 16-byte salt every time. */
export function hashPassphrase(passphrase: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(passphrase.normalize('NFC'), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: SCRYPT.maxmem });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyHash(stored: string, candidate: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]), r = Number(parts[2]), p = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'hex');
  const expected = Buffer.from(parts[5], 'hex');
  if (!(N > 0 && r > 0 && p > 0) || salt.length === 0 || expected.length === 0) return false;
  const actual = scryptSync(candidate.normalize('NFC'), salt, expected.length, { N, r, p, maxmem: SCRYPT.maxmem });
  return equal(actual, expected);
}

export function hasPassphrase(store: Store): boolean {
  if (config.demoMode) return config.adminPassword !== '';
  return store.getSetting(PASSPHRASE_KEY) !== undefined;
}

/** Constant-time comparison. The fixed login delay covers the rest of the timing. */
export function passphraseMatches(store: Store, candidate: string): boolean {
  if (config.demoMode) {
    if (!config.adminPassword) return false;
    return equal(sha256(candidate), sha256(config.adminPassword));
  }
  const stored = store.getSetting(PASSPHRASE_KEY);
  if (!stored) return false;
  return verifyHash(stored, candidate);
}

export function setPassphrase(store: Store, passphrase: string): void {
  store.setSetting(PASSPHRASE_KEY, hashPassphrase(passphrase));
}

/** True when the token matches the stored hash and has not expired. */
export function setupTokenValid(store: Store, token: string): boolean {
  if (config.demoMode) return false;
  const stored = store.getSetting(SETUP_TOKEN_KEY);
  if (!stored || !token) return false;
  const dot = stored.indexOf('.');
  if (dot <= 0) return false;
  const hash = Buffer.from(stored.slice(0, dot), 'hex');
  const expires = Number(stored.slice(dot + 1));
  if (!Number.isFinite(expires) || expires <= Date.now()) return false;
  return equal(sha256(token), hash);
}

/** The link works once: after the passphrase is set, the token is gone. */
export function consumeSetupToken(store: Store): void {
  store.deleteSetting(SETUP_TOKEN_KEY);
}

function deadlineFrom(now: number): number {
  return now + config.adminIdleSeconds * 1000;
}

function sweep(now: number): void {
  for (const [token, deadline] of sessions) {
    if (deadline <= now) sessions.delete(token);
  }
}

function setCookie(cookies: AstroCookies, value: string): void {
  // No maxAge or expires: a session cookie, gone when the browser closes.
  // The 30-minute inactivity limit is enforced on the server.
  cookies.set(SESSION_COOKIE, value, {
    path: COOKIE_PATH,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });
}

/*
 * DEMO_MODE only: a preview host (Vercel) runs many short-lived instances that
 * share no memory, so the session map above would forget a login at once.
 * Instead the cookie carries its own deadline, signed with a key derived from
 * the preview password. Nothing is stored server-side; the cookie is the session.
 */
function demoKey(): Buffer {
  return sha256('tea-talks-demo-session:' + config.adminPassword);
}
function demoSign(deadline: number): string {
  return createHmac('sha256', demoKey()).update(String(deadline)).digest('hex');
}
function demoToken(deadline: number): string {
  return `${deadline}.${demoSign(deadline)}`;
}
function demoDeadline(token: string): number | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const deadline = Number.parseInt(token.slice(0, dot), 10);
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(deadline) || sig.length !== 64) return null;
  return equal(Buffer.from(sig, 'utf8'), Buffer.from(demoSign(deadline), 'utf8')) ? deadline : null;
}

export function startSession(cookies: AstroCookies): void {
  const now = Date.now();
  if (config.demoMode) {
    setCookie(cookies, demoToken(deadlineFrom(now)));
    return;
  }
  sweep(now);
  const token = randomBytes(32).toString('hex');
  sessions.set(token, deadlineFrom(now));
  setCookie(cookies, token);
}

export function endSession(cookies: AstroCookies): void {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) sessions.delete(token);
  cookies.delete(SESSION_COOKIE, { path: COOKIE_PATH, httpOnly: true, secure: true, sameSite: 'strict' });
}

/** True when the cookie names a live session. Extends the session's deadline. */
export function isSignedIn(cookies: AstroCookies): boolean {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  if (config.demoMode) {
    if (!config.adminPassword) return false;
    const deadline = demoDeadline(token);
    const now = Date.now();
    if (deadline === null || deadline <= now) return false;
    setCookie(cookies, demoToken(deadlineFrom(now))); // slide the deadline
    return true;
  }
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
