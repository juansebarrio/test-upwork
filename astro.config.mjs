// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

// DEPLOY_TARGET=vercel at build time selects the Vercel adapter (temporary previews).
// Anything else builds for the VPS: the Node adapter behind server.mjs.
const target = process.env.DEPLOY_TARGET === 'vercel' ? 'vercel' : 'node';

export default defineConfig({
  output: 'server',
  // Node, middleware mode: server.mjs owns the HTTP server, so static files get the
  // same security headers as pages (the adapter's standalone server sends none).
  // Vercel: scripts/vercel-headers.mjs adds the same headers to every route after the build.
  adapter: target === 'vercel' ? vercel() : node({ mode: 'middleware' }),
  // A Vercel build is a preview by definition (read-only filesystem, no SQLite),
  // so it marks itself: src/lib/config.ts then defaults DEMO_MODE to true unless
  // the variable is set explicitly. The Node build carries no such mark.
  vite: { define: { 'process.env.TEA_TALKS_VERCEL_BUILD': JSON.stringify(target === 'vercel' ? 'true' : '') } },
  // Cross-site form POSTs (CSRF) are rejected in src/middleware.ts by comparing the
  // Origin header with the Host header. Astro's own checkOrigin would need the site's
  // hostname baked in at build time (security.allowedDomains), which is easy to get
  // wrong on a server, so it stays off and the middleware does the job instead.
  security: { checkOrigin: false },
  // Never inline CSS into <style> tags: our Content-Security-Policy has no 'unsafe-inline'.
  build: { inlineStylesheets: 'never' },
  // Astro sessions are never used by this app. Point the driver at memory so the
  // adapter does not set up on-disk session storage. No page ever touches Astro.session,
  // so no session cookie is ever sent.
  session: { driver: 'memory' },
  devToolbar: { enabled: false },
  compressHTML: true,
});
