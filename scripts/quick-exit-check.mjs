#!/usr/bin/env node
/**
 * Checklist C2, C3, C5 and B5 in one run, in headless Chromium:
 * single Escape keeps the text, a held key does not count, double Escape and the
 * pill leave with location.replace and one history entry, Back lands before the
 * site, the pill works with JavaScript off, no other origin is requested, no cookie.
 *
 *   PLAYWRIGHT_CHROMIUM=/path/to/chromium node scripts/quick-exit-check.mjs [base-url]
 */
import { chromium } from 'playwright-core';
const B = (process.argv[2] ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route('https://www.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>Google</title>' }));
const requests = new Set(); ctx.on('request', (r) => requests.add(new URL(r.url()).origin));
const p = await ctx.newPage();
await p.goto('data:text/html,<title>news</title>before'); // the page before the site
await p.goto(B + '/tea-talks');
const h0 = await p.evaluate(() => history.length);
await p.fill('#story', 'draft words'); await p.keyboard.press('Escape'); await p.waitForTimeout(1300);
console.log('single Escape: url', new URL(p.url()).pathname, '| text kept', JSON.stringify(await p.inputValue('#story')));
await p.keyboard.down('Escape'); await p.keyboard.down('Escape'); await p.keyboard.up('Escape'); await p.waitForTimeout(1300);
console.log('held key (repeat events): url', new URL(p.url()).pathname);
await p.click('button[type=submit]'); await p.waitForURL('**/thanks');
console.log('after submit: path', new URL(p.url()).pathname, '| history', await p.evaluate(() => history.length), '(was', h0 + ')', '| focused heading:', await p.evaluate(() => document.activeElement && document.activeElement.id));
await p.keyboard.press('Escape'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); await p.waitForURL('https://www.google.com/**');
console.log('double Escape ->', p.url(), '| title', await p.title(), '| history', await p.evaluate(() => history.length));
await p.goBack(); console.log('Back lands on:', await p.title());
const p2 = await ctx.newPage(); await p2.goto(B + '/about'); const h2 = await p2.evaluate(() => history.length);
await p2.click('[data-quick-exit]'); await p2.waitForURL('https://www.google.com/**'); console.log('About page button exit: history', await p2.evaluate(() => history.length), '(was', h2 + ')');
const p3 = await ctx.newPage(); await p3.goto(B + '/contact'); await p3.fill('#message', 'hello'); await p3.fill('#reply', 'me');
await p3.evaluate(() => { const v = document.createElement('video'); v.setAttribute('preload', 'none'); v.setAttribute('disablepictureinpicture', ''); document.body.appendChild(v); });
await p3.click('[data-quick-exit]'); await p3.waitForURL('https://www.google.com/**'); console.log('contact exit done');
const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
await noJs.route('https://www.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>Google</title>' }));
const p4 = await noJs.newPage(); await p4.goto(B + '/tea-talks'); await p4.click('[data-quick-exit]'); await p4.waitForURL('https://www.google.com/**'); console.log('JS off: pill is a plain link ->', p4.url());
const p5 = await noJs.newPage(); await p5.goto(B + '/tea-talks'); await p5.fill('#story', 'no-js story'); await p5.click('button[type=submit]'); await p5.waitForURL('**/thanks'); console.log('JS off: form posts and lands on', new URL(p5.url()).pathname);
console.log('origins requested:', [...requests].join(', '));
console.log('cookies:', (await ctx.cookies()).length);
await browser.close();
