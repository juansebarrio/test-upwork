#!/usr/bin/env node
/**
 * Full-page screenshots of every route at 390 and 1280 wide, for the visual pass.
 *
 *   node scripts/screenshots.mjs [base-url] [out-dir] [--admin=<passphrase>]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { PUBLIC_PAGES, ERROR_PAGES } from './routes.mjs';

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const out = args.filter((a) => !a.startsWith('--'))[1] ?? './screenshots';
const admin = (args.find((a) => a.startsWith('--admin=')) ?? '').slice(8);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
const name = (p) => (p === '/' ? 'home' : p.replace(/^\//, '').replace(/[/?=&]+/g, '-'));
for (const width of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
  for (const route of [...PUBLIC_PAGES, ...ERROR_PAGES]) {
    const page = await ctx.newPage();
    await page.goto(base + route.path, { waitUntil: 'load' });
    await page.screenshot({ path: `${out}/${name(route.path)}-${width}.png`, fullPage: true });
    await page.close();
  }
  const page = await ctx.newPage();
  await page.goto(base + '/admin');
  await page.screenshot({ path: `${out}/admin-login-${width}.png`, fullPage: true });
  if (admin) {
    await page.fill('#password', admin);
    await page.click('button[type=submit]');
    await page.waitForURL((u) => u.pathname === '/admin' && !u.searchParams.has('login'));
    for (const tab of ['waiting', 'approved', 'rejected', 'messages']) {
      await page.goto(base + (tab === 'waiting' ? '/admin' : `/admin?tab=${tab}`));
      await page.screenshot({ path: `${out}/admin-${tab}-${width}.png`, fullPage: true });
    }
  }
  await page.close();
  await ctx.close();
}
await browser.close();
console.log(`screenshots in ${out}`);
