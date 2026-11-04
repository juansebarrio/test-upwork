/**
 * Runs on every server-rendered response.
 *  - Rejects cross-site form posts (CSRF).
 *  - Adds the security headers, and X-Robots-Tag on the Tea Talks routes.
 *  - Catches errors so nothing about the request reaches a log.
 *
 * There is deliberately no request logging anywhere in this app.
 */
import { defineMiddleware } from 'astro:middleware';
import { copy } from './content/copy';
import { PAGE_HEADERS } from '../security-headers.mjs';
import { barePage } from './lib/shell';
import { wantsNoindex } from './lib/robots';

const HEADERS: Record<string, string> = { ...PAGE_HEADERS };

function withHeaders(res: Response, pathname: string): Response {
  let out = res;
  try {
    out.headers.set('X-Content-Type-Options', 'nosniff');
  } catch {
    // Some Response objects have immutable headers; rebuild it.
    out = new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
  }
  for (const [k, v] of Object.entries(HEADERS)) out.headers.set(k, v);
  if (wantsNoindex(pathname, out.status)) out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  else out.headers.delete('X-Robots-Tag');
  return out;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cross-site check for form posts.
 * Sec-Fetch-Site is sent by every current browser and cannot be set by a script,
 * so it is the primary signal: only same-origin (or a direct user action, "none") passes.
 * Older browsers without it fall back to Origin against Host. Under our
 * Referrer-Policy: no-referrer, browsers send "Origin: null" on plain form
 * navigations, so a null or missing Origin cannot be checked and is let through;
 * the admin forms are still protected by the SameSite=Strict cookie, and the
 * public forms by the honeypot.
 */
function isCrossSite(request: Request): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite !== 'same-origin' && fetchSite !== 'none';
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

const html = { 'Content-Type': 'text/html; charset=utf-8' };

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  try {
    if (isCrossSite(context.request)) {
      return withHeaders(new Response(barePage(copy.crossSite.heading, copy.crossSite.body, copy.notFound.back), { status: 403, headers: html }), pathname);
    }
    return withHeaders(await next(), pathname);
  } catch (err) {
    // Message and stack only. No URL, no headers, no body, no address.
    const e = err as Error;
    console.error('[tea-talks] error:', e?.stack ?? e?.message ?? String(err));
    return withHeaders(new Response(barePage(copy.error.heading, copy.error.body, copy.notFound.back), { status: 500, headers: html }), pathname);
  }
});
