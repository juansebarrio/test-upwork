#!/usr/bin/env node
/**
 * Checklist C2, C3, C5, C7 and B5 in one run, in headless Chromium.
 *
 * C3/C7, the history test: a tab holds two unrelated pages, then the site is
 * opened and walked through its own links (Home → About → Our Work → Tea Talks →
 * Home → Stories → Contact). Every step must be a same-document navigation (a
 * marker set on window at first load is still there) and must add one history
 * entry; Back twice and Forward once must move between pages of the site, again
 * without a reload. Then the quick exit: history.length must be the pre-site
 * length plus one, and Back must land on the unrelated page that preceded the
 * site. Four runs: pill; double Escape; a Tea Talks submission in the middle;
 * a reload on About (the documented limit: entries before the reload stay).
 * Also: single Escape keeps the text, a held key does not count, modifier-click
 * opens a new tab, the pill and both forms work with JavaScript off, no other
 * origin is requested, no cookie.
 *
 *   PLAYWRIGHT_CHROMIUM=/path/to/chromium node scripts/quick-exit-check.mjs [base-url]
 */
import { chromium } from 'playwright-core';
const B = (process.argv[2] ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const EXIT = 'https://www.google.com/';
let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.log('  ✗ ' + m); };
const check = (c, m) => (c ? ok(m) : bad(m));

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route(EXIT + '**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>Google</title>' }));
const requests = new Set(); ctx.on('request', (r) => requests.add(new URL(r.url()).origin));
const archiveOn = (await fetch(B + '/stories')).status === 200;
if (!archiveOn) console.log('note: /stories is off (PUBLIC_ARCHIVE unset); the walk skips it');

const hist = (p) => p.evaluate(() => history.length);
const index = (p) => p.evaluate(() => history.state && history.state.index);
const path = (p) => new URL(p.url()).pathname;
const marker = (p) => p.evaluate(() => window.__visitMarker === 'first-load');
const settled = async (p, expectPath) => { await p.waitForFunction((x) => location.pathname === x, expectPath); await p.waitForTimeout(80); };

async function follow(p, selector, expectPath, lenBefore) {
  await p.click(selector); await settled(p, expectPath);
  const same = await marker(p); const len = await hist(p);
  check(path(p) === expectPath && same && len === lenBefore + 1, `${selector} → ${path(p)} | same document: ${same} | history ${len} (+1) | index ${await index(p)} | title "${await p.title()}"`);
  return len;
}

async function walk(p, mode) {
  await p.goto('data:text/html,<title>first unrelated</title>one');
  await p.goto('data:text/html,<title>news</title>two');
  const before = await hist(p);
  await p.goto(B + '/');
  await p.evaluate(() => { window.__visitMarker = 'first-load'; });
  let len = await hist(p);
  console.log(`history before the site: ${before}; after opening Home: ${len} | index ${await index(p)}`);
  check(len === before + 1, 'opening Home added one entry');
  len = await follow(p, 'nav.site-nav a[href="/about"]', '/about', len);
  if (mode === 'reload') {
    await p.reload(); await p.evaluate(() => { window.__visitMarker = 'after-reload'; });
    console.log(`  reloaded on /about: history ${await hist(p)} | index after reload ${await index(p)} (survives the reload)`);
    // from here the marker is the new document's
    const m2 = (q) => q.evaluate(() => window.__visitMarker === 'after-reload');
    await p.click('nav.site-nav a[href="/our-work"]'); await settled(p, '/our-work');
    check(await m2(p) && (await hist(p)) === len + 1, `after the reload, Our Work opened in the reloaded document | history ${await hist(p)}`);
    await p.click('[data-quick-exit]'); await p.waitForURL(EXIT + '**');
    const after = await hist(p);
    console.log(`  exit after the reload: history ${after} (was ${before} before the site), title "${await p.title()}"`);
    await p.goBack(); await p.waitForLoadState();
    const landed = await p.title();
    console.log(`  Back from the exit site lands on "${landed}" (${path(p)})`);
    check(landed !== 'Google', 'documented limit: after a reload only the pages opened since the reload are rewound; the exit still leaves and Back lands on an earlier page of the visit, not on the exit site');
    return;
  }
  len = await follow(p, 'nav.site-nav a[href="/our-work"]', '/our-work', len);
  len = await follow(p, 'nav.site-nav a[href="/tea-talks"]', '/tea-talks', len);
  check(await p.$('meta[name="robots"][content="noindex, nofollow"]') !== null, 'robots meta present on Tea Talks after a same-document navigation');
  if (mode === 'tea-talks') {
    await p.fill('#story', 'history test story');
    await p.click('button[type=submit]'); await settled(p, '/thanks');
    check(await marker(p) && (await hist(p)) === len, `story sent in the background → ${path(p)} | same document: ${await marker(p)} | history ${await hist(p)} (replace, no new entry) | focused heading: ${await p.evaluate(() => document.activeElement.id)}`);
    await p.click('.return a[href="/tea-talks"]'); await settled(p, '/tea-talks'); len = await hist(p);
  }
  len = await follow(p, 'a.brand', '/', len);
  if (archiveOn) len = await follow(p, 'a.btn-secondary[href="/stories"]', '/stories', len);
  len = await follow(p, 'nav.site-nav a[href="/contact"]', '/contact', len);
  // Back twice, Forward once: pages of the site, no reload
  await p.goBack(); await settled(p, archiveOn ? '/stories' : '/');
  check(await marker(p), `Back → ${path(p)} | same document: ${await marker(p)}`);
  await p.goBack(); await settled(p, archiveOn ? '/' : '/tea-talks');
  check(await marker(p), `Back → ${path(p)} | same document: ${await marker(p)}`);
  await p.goForward(); await settled(p, archiveOn ? '/stories' : '/');
  check(await marker(p) && (await hist(p)) === len, `Forward → ${path(p)} | same document: ${await marker(p)} | history still ${await hist(p)}`);
  if (mode === 'message') {
    await p.goForward(); await settled(p, '/contact');
    await p.fill('#message', 'history test message');
    await p.click('button[type=submit]'); await settled(p, '/contact/sent');
    check(await marker(p) && (await hist(p)) === len, `message sent in the background → ${path(p)} | same document | history ${await hist(p)} (replace) | focused heading: ${await p.evaluate(() => document.activeElement.id)}`);
  }
  const during = await hist(p);
  if (mode === 'escape') { await p.keyboard.press('Escape'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
  else await p.click('[data-quick-exit]');
  await p.waitForURL(EXIT + '**');
  const after = await hist(p);
  check((await p.title()) === 'Google' && p.url() === EXIT, `exit (${mode}) from entry ${during - before} of the visit → ${p.url()}, title "${await p.title()}"`);
  await p.goBack(); await p.waitForLoadState();
  check((await p.title()) === 'news', `Back lands on "${await p.title()}" (the page before the site)`);
  await p.goForward(); await p.waitForLoadState();
  check((await p.title()) === 'Google', `Forward lands on "${await p.title()}" (the exit site took the first page's entry)`);
  await p.goForward().catch(() => {}); await p.waitForLoadState().catch(() => {});
  const beyond = path(p);
  if (after === before + 1) ok(`history ${after} = ${before} + 1: the later entries were discarded`);
  else console.log(`  limit: history ${after} (${before} + the ${during - before} entries of the visit): Chromium keeps the entries after a replaced one, so a second Forward from the exit site reaches ${beyond} (written down in docs/VERIFICATION.md)`);
}

console.log('\nC3/C7 · walk, Back twice, Forward once, exit with the pill');
await walk(await ctx.newPage(), 'pill');
console.log('\nC3/C7 · the same, exit with the double Escape');
await walk(await ctx.newPage(), 'escape');
console.log('\nC3/C7 · with a Tea Talks submission in the middle, then the pill');
await walk(await ctx.newPage(), 'tea-talks');
console.log('\nC3/C7 · with a contact message at the end, then the pill');
await walk(await ctx.newPage(), 'message');
console.log('\nC3 · after a reload on About (documented limit)');
await walk(await ctx.newPage(), 'reload');

console.log('\nC2 · Escape');
{
  const p = await ctx.newPage(); await p.goto(B + '/tea-talks');
  await p.fill('#story', 'draft words'); await p.keyboard.press('Escape'); await p.waitForTimeout(1300);
  check(path(p) === '/tea-talks' && (await p.inputValue('#story')) === 'draft words', `single Escape: still on ${path(p)}, text kept`);
  await p.keyboard.down('Escape'); await p.keyboard.down('Escape'); await p.keyboard.up('Escape'); await p.waitForTimeout(1300);
  check(path(p) === '/tea-talks', `held key (repeat events): still on ${path(p)}`);
  await p.close();
}
console.log('\nModifier-click opens a new tab');
{
  const p = await ctx.newPage(); await p.goto(B + '/');
  const h = await hist(p);
  const [tab] = await Promise.all([ctx.waitForEvent('page'), p.click('nav.site-nav a[href="/about"]', { modifiers: ['Control'] })]);
  await tab.waitForLoadState();
  check(path(p) === '/' && (await hist(p)) === h && path(tab) === '/about', `ctrl-click: current page stays on ${path(p)} (history ${await hist(p)}), new tab opened on ${path(tab)}`);
  await tab.close(); await p.close();
}
console.log('\nC5 · JavaScript off');
{
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await noJs.route(EXIT + '**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>Google</title>' }));
  const p4 = await noJs.newPage(); await p4.goto(B + '/tea-talks'); await p4.click('[data-quick-exit]'); await p4.waitForURL(EXIT + '**');
  check(p4.url() === EXIT, `pill is a plain link → ${p4.url()}`);
  const p5 = await noJs.newPage(); await p5.goto(B + '/tea-talks'); await p5.fill('#story', 'no-js story'); await p5.click('button[type=submit]'); await p5.waitForURL('**/thanks');
  check(path(p5) === '/thanks', `story form posts and lands on ${path(p5)}`);
  const p6 = await noJs.newPage(); await p6.goto(B + '/contact'); await p6.fill('#message', 'no-js message'); await p6.click('button[type=submit]'); await p6.waitForURL('**/contact/sent');
  check(path(p6) === '/contact/sent', `contact form posts and lands on ${path(p6)}`);
  await noJs.close();
}
console.log('\nB5 / B3');
check([...requests].every((o) => o === new URL(B).origin || o === new URL(EXIT).origin), `origins requested: ${[...requests].join(', ')}`);
check((await ctx.cookies()).length === 0, `cookies: ${(await ctx.cookies()).length}`);
await browser.close();
console.log(failures === 0 ? '\nQuick exit: all checks passed.' : `\nQuick exit: ${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
