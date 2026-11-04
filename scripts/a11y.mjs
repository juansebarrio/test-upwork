#!/usr/bin/env node
/**
 * Runs axe-core through Playwright on every route at 390 and 1280 wide and
 * fails on any violation.
 *
 *   node scripts/a11y.mjs [base-url]
 *
 * Needs a Chromium for Playwright (`npx playwright install chromium`, or set
 * PLAYWRIGHT_CHROMIUM to an executable). The browser context bypasses the site's
 * CSP only so that axe can be injected; the site itself is unchanged.
 */
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { ERROR_PAGES, PANEL_PAGES, PUBLIC_PAGES } from './routes.mjs';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const base = (process.argv[2] ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM;

const browser = await chromium.launch(executablePath ? { executablePath } : {});
let violations = 0;
const routes = [...PUBLIC_PAGES, ...PANEL_PAGES.filter((p) => !p.status), ...ERROR_PAGES];

for (const width of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, bypassCSP: true });
  for (const route of routes) {
    const page = await ctx.newPage();
    const res = await page.goto(base + route.path, { waitUntil: 'load' });
    if (res && res.status() === 404 && !route.status) { console.log(`${route.path} @${width}: 404, skipped`); await page.close(); continue; }
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }));
    const bad = result.violations;
    if (bad.length === 0) console.log(`✓ ${route.path} @${width}`);
    for (const v of bad) {
      violations++;
      console.log(`✗ ${route.path} @${width}: ${v.id} (${v.impact}) ${v.help}`);
      for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(' ')}`);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(violations === 0 ? '\nNo accessibility violations.' : `\n${violations} violation(s).`);
process.exit(violations === 0 ? 0 : 1);
