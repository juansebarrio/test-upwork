/**
 * Runs on every server-rendered response.
 *  - Rejects cross-site form posts (CSRF).
 *  - Adds the security headers.
 *  - Catches errors so nothing about the request reaches a log.
 *
 * There is deliberately no request logging anywhere in this app.
 */
import { defineMiddleware } from 'astro:middleware';
import { copy } from './copy';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "object-src 'none'",
].join('; ');

const HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  // Pages hold personal text (the form, the moderation panel). Never cache them.
  'Cache-Control': 'no-store',
};

function withHeaders(res: Response): Response {
  let out = res;
  try {
    for (const [k, v] of Object.entries(HEADERS)) out.headers.set(k, v);
  } catch {
    // Some Response objects have immutable headers; rebuild it.
    out = new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
    for (const [k, v] of Object.entries(HEADERS)) out.headers.set(k, v);
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function page(title: string, heading: string, body: string): string {
  return `<!doctype html><html lang="${copy.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="/error.css"></head><body><main class="wrap"><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(body)}</p><p><a href="/">${escapeHtml(copy.notFound.backHome)}</a></p></main></body></html>`;
}

const errorPage = page(copy.error.title, copy.error.heading, copy.error.body);
const crossSitePage = page(copy.crossSite.title, copy.crossSite.heading, copy.crossSite.body);


const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cross-site check for form posts.
 * Sec-Fetch-Site is sent by every current browser and cannot be set by a script,
 * so it is the primary signal: only same-origin (or a direct user action, "none") passes.
 * Older browsers without it fall back to Origin against Host. Under our
 * Referrer-Policy: no-referrer, browsers send "Origin: null" on plain form
 * navigations, so a null or missing Origin cannot be checked and is let through;
 * the admin forms are still protected by the SameSite=Strict cookie, and the
 * public form by the honeypot.
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

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    if (isCrossSite(context.request)) {
      return withHeaders(new Response(crossSitePage, { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
    }
    return withHeaders(await next());
  } catch (err) {
    // Message and stack only. No URL, no headers, no body, no address.
    const e = err as Error;
    console.error('[tea-talks] error:', e?.stack ?? e?.message ?? String(err));
    return withHeaders(new Response(errorPage, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  }
});
