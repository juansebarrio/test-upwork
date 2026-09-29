/**
 * The security headers, in one place, shared by:
 *  - src/middleware.ts  (server-rendered pages)
 *  - server.mjs         (static files: script, stylesheet, fonts, favicon)
 * so that every response the app sends carries them. deploy/Caddyfile sets
 * the same values again at the edge as a second layer.
 */
export const CSP = [
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

/** On every response, pages and static files alike. */
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': CSP,
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
});

/** Pages hold personal text (the form, the moderation panel). Never cache them. */
export const PAGE_HEADERS = Object.freeze({
  ...SECURITY_HEADERS,
  'Cache-Control': 'no-store',
});
