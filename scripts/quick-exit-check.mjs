#!/usr/bin/env node
/**
 * Checklist C2, C3, C5 and B5 in one run, in headless Chromium.
 *
 * C3, the history test: a tab holds two unrelated pages, then the site is opened
 * and walked through its own links (Home → About → Our Work → Tea Talks → Home →
 * Stories → Contact, a message is sent → Home); after the quick exit,
 * history.length must be exactly what it was before the site plus one (the single
 * entry the whole visit occupied, replaced by the exit), and Back must land on the
 * unrelated page that preceded the site. Run three times: pill, double Escape,
 * and a walk that ends in a Tea Talks submission. Any extra entry fails the run.
 * Also: single Escape keeps the text, a held key does not count, modifier-click
 * still opens a new tab, the pill and the forms work with JavaScript off, no
 * other origin is requested, no cookie.
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
const path = (p) => new URL(p.url()).pathname;
async function follow(p, selector, expectPath) {
  await Promise.all([p.waitForNavigation(), p.click(selector)]);
  check(path(p) === expectPath, `${selector} → ${path(p)} | history ${await hist(p)}`);
}

async function walk(p, ending) {
  await p.goto('data:text/html,<title>first unrelated</title>one');
  await p.goto('data:text/html,<title>news</title>two');
  const before = await hist(p);
  await p.goto(B + '/');
  console.log(`history before the site: ${before}; after opening Home: ${await hist(p)}`);
  await follow(p, 'nav.site-nav a[href="/about"]', '/about');
  await follow(p, 'nav.site-nav a[href="/our-work"]', '/our-work');
  await follow(p, 'nav.site-nav a[href="/tea-talks"]', '/tea-talks');
  await follow(p, 'a.brand', '/');
  if (archiveOn) {
    await follow(p, 'a.btn-secondary[href="/stories"]', '/stories');
    await follow(p, 'nav.site-nav a[href="/contact"]', '/contact');
  } else {
    await follow(p, 'nav.site-nav a[href="/contact"]', '/contact');
  }
  await p.fill('#message', 'history test message'); await p.fill('#reply', 'none');
  await Promise.all([p.waitForNavigation(), p.click('button[type=submit]')]);
  check(path(p) === '/contact/sent', `message sent → ${path(p)} | history ${await hist(p)} | focused heading: ${await p.evaluate(() => document.activeElement.id)}`);
  await follow(p, '.return a[href="/"]', '/');
  if (ending === 'tea-talks') {
    await follow(p, 'nav.site-nav a[href="/tea-talks"]', '/tea-talks');
    await p.fill('#story', 'history test story');
    await Promise.all([p.waitForNavigation(), p.click('button[type=submit]')]);
    check(path(p) === '/thanks', `story sent → ${path(p)} | history ${await hist(p)} | focused heading: ${await p.evaluate(() => document.activeElement.id)}`);
  }
  const duringVisit = await hist(p);
  if (ending === 'escape') { await p.keyboard.press('Escape'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
  else await p.click('[data-quick-exit]');
  await p.waitForURL(EXIT + '**');
  const after = await hist(p);
  check(duringVisit === before + 1, `the whole visit occupied one entry: history ${duringVisit} = ${before} + 1`);
  check(after === before + 1, `after the exit (${ending}): history ${after} = ${before} + 1, title "${await p.title()}"`);
  await p.goBack();
  check((await p.title()) === 'news', `Back lands on "${await p.title()}" (the page before the site)`);
}

console.log('\nC3 · walk ending with the pill');
await walk(await ctx.newPage(), 'pill');
console.log('\nC3 · walk ending with the double Escape');
await walk(await ctx.newPage(), 'escape');
console.log('\nC3 · walk ending with a Tea Talks submission, then the pill');
await walk(await ctx.newPage(), 'tea-talks');

console.log('\nC2 · Escape');
{
  const p = await ctx.newPage(); await p.goto(B + '/tea-talks');
  await p.fill('#story', 'draft words'); await p.keyboard.press('Escape'); await p.waitForTimeout(1300);
  check(path(p) === '/tea-talks' && (await p.inputValue('#story')) === 'draft words', `single Escape: still on ${path(p)}, text kept`);
  await p.keyboard.down('Escape'); await p.keyboard.down('Escape'); await p.keyboard.up('Escape'); await p.waitForTimeout(1300);
  check(path(p) === '/tea-talks', `held key (repeat events): still on ${path(p)}`);
  await p.close();
}
console.log('\nModifier-click opens a new tab and is not intercepted');
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
