// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Only reachable from the same machine; Caddy sits in front.
  server: { host: '127.0.0.1', port: 4321 },
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
