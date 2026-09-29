#!/usr/bin/env node
/**
 * Automated part of the privacy checklist. Run it against a local server or
 * the live site:
 *
 *   node scripts/verify.mjs                       # http://127.0.0.1:4321
 *   node scripts/verify.mjs https://tea.example.org
 *
 * It checks headers, the absence of cookies, and that no page or stylesheet
 * refers to another origin (other than the quick-exit link itself).
 */
const base = (process.argv[2] ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const origin = new URL(base).origin;

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => { failures++; console.log(`  ✗ ${msg}`); };
const check = (cond, msg) => (cond ? ok(msg) : bad(msg));

const REQUIRED_HEADERS = {
  'content-security-policy': (v) => v.includes("default-src 'self'") && !v.includes('unsafe-inline') && !v.includes('http'),
  'referrer-policy': (v) => v === 'no-referrer',
  'strict-transport-security': (v) => /max-age=\d+/.test(v),
  'x-content-type-options': (v) => v === 'nosniff',
  'cache-control': (v) => v.includes('no-store'),
};

async function checkAsset(path) {
  console.log(`\n${path} (static file)`);
  const res = await fetch(base + path, { redirect: 'manual' });
  check(res.status === 200, `status ${res.status}`);
  for (const [name, test] of Object.entries(REQUIRED_HEADERS)) {
    if (name === 'cache-control') continue; // static files may be cached; pages may not
    const v = res.headers.get(name);
    check(v !== null && test(v), `${name}: ${v ?? 'MISSING'}`);
  }
  check(res.headers.get('set-cookie') === null, 'no Set-Cookie header');
}

async function checkPage(path, { expectStatus = 200, allowCookie = false } = {}) {
  console.log(`\n${path}`);
  const res = await fetch(base + path, { redirect: 'manual' });
  check(res.status === expectStatus, `status ${res.status} (expected ${expectStatus})`);
  for (const [name, test] of Object.entries(REQUIRED_HEADERS)) {
    const v = res.headers.get(name);
    check(v !== null && test(v), `${name}: ${v ?? 'MISSING'}`);
  }
  const setCookie = res.headers.get('set-cookie');
  if (!allowCookie) check(setCookie === null, setCookie === null ? 'no Set-Cookie header' : `Set-Cookie present: ${setCookie}`);

  const html = await res.text();
  const quickExit = (html.match(/data-quick-exit[^>]*/) || [])[0] ?? '';
  const external = [...html.matchAll(/https?:\/\/[^"'\s<)]+/g)].map((m) => m[0]).filter((u) => !u.startsWith(origin));
  const exitUrl = (html.match(/href="(https?:\/\/[^"]+)"[^>]*data-quick-exit/) || html.match(/data-quick-exit[^>]*href="(https?:\/\/[^"]+)"/) || [])[1];
  const unexpected = external.filter((u) => !(exitUrl && u.startsWith(exitUrl.replace(/\/$/, ''))));
  check(unexpected.length === 0, unexpected.length ? `external references: ${[...new Set(unexpected)].join(', ')}` : `no external references in HTML${exitUrl ? ` (quick exit link → ${exitUrl} is the only one)` : ''}`);
  check(!/<script(?![^>]*\ssrc=)[^>]*>/i.test(html), 'no inline <script>');
  check(!/<style[\s>]/i.test(html), 'no inline <style>');
  check(!/\sstyle="/i.test(html), 'no style="" attributes');
  void quickExit;

  const sheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of sheets) {
    if (!assetsSeen.has(href)) { assetsSeen.add(href); await checkAsset(href); }
    const css = await (await fetch(base + href)).text();
    const cssExternal = [...css.matchAll(/url\(\s*['"]?(https?:)?\/\/[^)]+\)/g)].map((m) => m[0]);
    check(cssExternal.length === 0, cssExternal.length ? `${href} references other origins: ${cssExternal.join(', ')}` : `${href} loads only local assets`);
    check(/format\(["']?woff2["']?\)/.test(css) && /url\(["']?\/fonts\//.test(css), `${href} fonts are self-hosted`);
  }
}

const assetsSeen = new Set();
console.log(`Checking ${base}`);
await checkPage('/');
for (const asset of ['/quick-exit.js', '/favicon.svg', '/error.css', '/fonts/albert-sans-latin-wght-normal.woff2']) await checkAsset(asset);
await checkPage('/thanks');
await checkPage('/admin');
await checkPage('/does-not-exist', { expectStatus: 404 });
const stories = await fetch(base + '/stories', { redirect: 'manual' });
console.log(`\n/stories responds ${stories.status} (${stories.status === 404 ? 'archive is off' : 'archive is on'})`);
if (stories.status === 200) await checkPage('/stories');

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
