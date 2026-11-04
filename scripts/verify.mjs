#!/usr/bin/env node
/**
 * Automated part of the privacy checklist. Run it against a local server or
 * the live site:
 *
 *   node scripts/verify.mjs                       # http://127.0.0.1:4321
 *   node scripts/verify.mjs https://example.org
 *
 * It walks every route (public pages, panel, error pages, static files,
 * robots.txt) and checks headers, the absence of cookies, that nothing refers
 * to another origin, that no inline script or style exists, and that the
 * noindex header and meta tag appear on exactly the routes that must carry them.
 */
import { ERROR_PAGES, PANEL_PAGES, PUBLIC_PAGES, STATIC_FILES } from './routes.mjs';

const base = (process.argv[2] ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const origin = new URL(base).origin;

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => { failures++; console.log(`  ✗ ${msg}`); };
const check = (cond, msg) => (cond ? ok(msg) : bad(msg));

const REQUIRED = {
  'content-security-policy': (v) => v.includes("default-src 'self'") && v.includes("frame-ancestors 'none'") && !v.includes('unsafe-inline') && !v.includes('http'),
  'referrer-policy': (v) => v === 'no-referrer',
  'strict-transport-security': (v) => /max-age=\d+/.test(v),
  'x-content-type-options': (v) => v === 'nosniff',
  'x-frame-options': (v) => v.toUpperCase() === 'DENY',
  'permissions-policy': (v) => v.length > 0,
};

function headersOk(res) {
  for (const [name, test] of Object.entries(REQUIRED)) {
    const v = res.headers.get(name);
    check(v !== null && test(v), `${name}: ${v ?? 'MISSING'}`);
  }
}

function robotsOk(res, html, expectNoindex) {
  const header = res.headers.get('x-robots-tag');
  const meta = html !== null && /<meta name="robots" content="noindex, nofollow"/.test(html);
  if (expectNoindex) {
    check(header !== null && /noindex/.test(header) && /nofollow/.test(header), `X-Robots-Tag: ${header ?? 'MISSING'} (required here)`);
    if (html !== null) check(meta, 'robots meta tag present (required here)');
  } else {
    check(header === null, header === null ? 'no X-Robots-Tag (indexable)' : `X-Robots-Tag present but this page must be indexable: ${header}`);
    if (html !== null) check(!meta, meta ? 'robots meta tag present but this page must be indexable' : 'no robots meta tag (indexable)');
  }
}

async function checkPage({ path, noindex, status = 200 }, { allowCookie = false } = {}) {
  console.log(`\n${path}`);
  const res = await fetch(base + path, { redirect: 'manual' });
  check(res.status === status, `status ${res.status} (expected ${status})`);
  headersOk(res);
  const cc = res.headers.get('cache-control');
  check(cc !== null && cc.includes('no-store'), `cache-control: ${cc ?? 'MISSING'}`);
  const setCookie = res.headers.get('set-cookie');
  if (!allowCookie) check(setCookie === null, setCookie === null ? 'no Set-Cookie header' : `Set-Cookie present: ${setCookie}`);
  const html = res.status === 303 ? null : await res.text();
  robotsOk(res, html, noindex);
  if (html === null) return;
  const external = [...html.matchAll(/https?:\/\/[^"'\s<)]+/g)].map((m) => m[0]).filter((u) => !u.startsWith(origin));
  const exitUrl = (html.match(/href="(https?:\/\/[^"]+)"[^>]*data-quick-exit/) || [])[1];
  const unexpected = external.filter((u) => !(exitUrl && u.startsWith(exitUrl.replace(/\/$/, ''))));
  check(unexpected.length === 0, unexpected.length ? `external references: ${[...new Set(unexpected)].join(', ')}` : `no external references in HTML${exitUrl ? ` (quick exit link → ${exitUrl} is the only one)` : ''}`);
  check(!/<script(?![^>]*\ssrc=)[^>]*>/i.test(html), 'no inline <script>');
  check(!/<style[\s>]/i.test(html), 'no inline <style>');
  check(!/\sstyle="/i.test(html), 'no style="" attributes');
  check(/data-quick-exit/.test(html), 'quick-exit control present');
  check(/<nav class="site-nav"/.test(html) && /<footer class="site-footer"/.test(html), 'site header navigation and footer present');
  check(/<html lang="/.test(html), 'lang attribute on <html>');
  check(/<a class="skip-link"/.test(html), 'skip link present');
  check(!/<(img|picture|iframe|object|embed)[\s>]/i.test(html), 'no images, frames or embeds');
  for (const m of html.matchAll(/<(audio|video)[^>]*>/gi)) {
    const tag = m[0];
    check(/preload="none"/.test(tag) && !/autoplay/.test(tag) && /disablepictureinpicture/.test(tag), `media element safe: ${tag.slice(0, 80)}`);
  }
}

async function checkStatic(path) {
  console.log(`\n${path} (static file)`);
  const res = await fetch(base + path, { redirect: 'manual' });
  check(res.status === 200, `status ${res.status}`);
  headersOk(res);
  check(res.headers.get('set-cookie') === null, 'no Set-Cookie header');
  const header = res.headers.get('x-robots-tag');
  check(header === null, header === null ? 'no X-Robots-Tag' : `unexpected X-Robots-Tag: ${header}`);
  if (path.endsWith('.css')) {
    const css = await res.text();
    const ext = [...css.matchAll(/url\(\s*['"]?(https?:)?\/\/[^)]+\)/g)].map((m) => m[0]);
    check(ext.length === 0, ext.length ? `stylesheet references other origins: ${ext.join(', ')}` : 'stylesheet loads only local assets');
    check(/format\(["']?woff2["']?\)/.test(css) && /url\(["']?\/fonts\//.test(css), 'fonts are self-hosted woff2');
    const colours = [...new Set([...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0].toLowerCase()))];
    const allowed = new Set(['#f4ecdf', '#fcf8f1', '#3a2a20', '#a9502b', '#8f5a0c']);
    const stray = colours.filter((c) => !allowed.has(c));
    check(stray.length === 0, stray.length ? `colours outside the palette: ${stray.join(', ')}` : `only the five palette colours (${colours.length})`);
  }
  if (path.endsWith('robots.txt')) {
    const txt = await res.text();
    check(/User-agent: \*/.test(txt) && /^Disallow:\s*$/m.test(txt), 'robots.txt allows everything');
    check(!/tea-talks|stories|thanks|admin/.test(txt), 'robots.txt lists none of the Tea Talks paths');
  }
}

console.log(`Checking ${base}`);
const archiveOn = (await fetch(base + '/stories', { redirect: 'manual' })).status === 200;
console.log(`/stories responds ${archiveOn ? '200 (archive is on)' : '404 (archive is off)'}`);
for (const page of PUBLIC_PAGES) {
  if (page.flag && !archiveOn) { await checkPage({ ...page, status: 404 }); continue; }
  await checkPage(page);
}
for (const page of PANEL_PAGES) await checkPage(page);
for (const page of ERROR_PAGES) await checkPage(page);
console.log('\n/submit cross-site (403 page)');
{
  const res = await fetch(base + '/submit', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'story=x', redirect: 'manual' });
  check(res.status === 403, `status ${res.status}`);
  headersOk(res);
  const html = await res.text();
  robotsOk(res, html, true);
  check(/data-quick-exit/.test(html) && /<nav class="site-nav"/.test(html), 'quick exit and site header on the 403 page');
}
for (const file of STATIC_FILES) await checkStatic(file);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
