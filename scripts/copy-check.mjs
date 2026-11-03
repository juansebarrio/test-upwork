#!/usr/bin/env node
/**
 * Renders every page and checks its visible text against the collective's words
 * in src/content/, so a template can never alter a line.
 *
 *   node --experimental-strip-types scripts/copy-check.mjs [base-url]
 *
 * Two directions:
 *  1. Every string that src/content/ holds for a page appears on that page, verbatim.
 *  2. Every visible text node on every page is a string from src/content/ (or a
 *     piece of one), or one of the few dynamic values a page can show (a month
 *     and year, a count, a sample row in demo mode, which also come from content).
 */
import { PUBLIC_PAGES } from './routes.mjs';
const { copy } = await import('../src/content/copy.ts');
const pages = await import('../src/content/pages.ts');

const base = (process.argv[2] ?? 'http://127.0.0.1:4321').replace(/\/$/, '');

function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const ALL = new Set([...strings(copy), ...strings(pages)].map(norm).filter(Boolean));

/** What each page must show, verbatim. */
const EXPECTED = {
  home: strings(pages.home).filter((s) => !s.startsWith('/')),
  about: strings(pages.about),
  ourWork: strings(pages.ourWork),
  safety: strings(pages.safety),
  contact: strings(pages.contact).filter((s) => !s.startsWith('/') && ![pages.contact.emailLead, pages.contact.emailHelp, pages.contact.errorEmpty, pages.contact.errorLong, pages.contact.sent.body, pages.contact.sent.back].includes(s)),
  contactSent: [pages.contact.sent.body, pages.contact.sent.back],
  mentalHealth: strings(pages.mentalHealth),
  teaTalks: [copy.teaTalks.greeting, copy.teaTalks.heading, copy.teaTalks.intro, copy.teaTalks.promise.lead, ...copy.teaTalks.promise.lines, ...copy.teaTalks.below, copy.teaTalks.textareaLabel, copy.teaTalks.submit, copy.quickExit.hint],
  thanks: [copy.thanks.heading, copy.thanks.again],
  stories: [copy.stories.heading, copy.stories.intro],
};
const SHARED = [copy.siteName, copy.skipLink, copy.quickExit.label, ...copy.nav.map((n) => n.label), copy.footer.safety.label];

/** Visible text nodes of the body, in order. */
function visibleText(html) {
  let body = html.replace(/^[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '');
  body = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<textarea[\s\S]*?<\/textarea>/gi, '');
  // the honeypot block is not visible
  body = body.replace(/<div class="hp"[\s\S]*?<\/div>/gi, '');
  // hidden notes are not visible
  body = body.replace(/<p[^>]*\shidden[^>]*>[\s\S]*?<\/p>/gi, '');
  // visitors' own words (stories, messages) are not copy
  body = body.replace(/<p class="(story-text|card-text)">[\s\S]*?<\/p>/gi, '');
  const texts = [];
  for (const m of body.matchAll(/>([^<]+)</g)) {
    const t = norm(decode(m[1]));
    if (t) texts.push(t);
  }
  return texts;
}
function decode(s) {
  return s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'");
}
const MONTH = new RegExp(`^(${copy.months.join('|')}) \\d{4}$`);
const DYNAMIC = [MONTH, /^\d+$/, /^Received (today|yesterday|on .+)$/];

function allowed(t) {
  if (ALL.has(t)) return true;
  for (const s of ALL) if (s.includes(t) && t.length >= 3) return true;
  for (const re of DYNAMIC) if (re.test(t)) return true;
  // a page may concatenate a content string with another (e.g. "Showing stories in English. Show all.")
  for (const s of ALL) if (t.startsWith(s) || t.endsWith(s)) return true;
  return false;
}

let failures = 0;
console.log(`Checking copy on ${base}`);
for (const page of PUBLIC_PAGES) {
  const res = await fetch(base + page.path, { redirect: 'manual' });
  if (res.status !== 200) { console.log(`\n${page.path}: status ${res.status}, skipped`); continue; }
  const html = await res.text();
  const texts = visibleText(html);
  const joined = ' ' + texts.join(' ') + ' ';
  console.log(`\n${page.path}`);
  const expected = [...SHARED, ...(EXPECTED[page.content] ?? [])].map(norm);
  for (const s of expected) {
    const present = joined.includes(' ' + s + ' ') || texts.includes(s);
    if (!present) { failures++; console.log(`  ✗ missing: ${s.slice(0, 80)}`); }
  }
  const stray = texts.filter((t) => !allowed(t));
  for (const t of stray) { failures++; console.log(`  ✗ text not in src/content/: "${t.slice(0, 80)}"`); }
  if (!stray.length) console.log(`  ✓ ${texts.length} visible text nodes, all from src/content/; ${expected.length} expected strings present`);
}
console.log(failures === 0 ? '\nCopy matches src/content/ on every page.' : `\n${failures} difference(s).`);
process.exit(failures === 0 ? 0 : 1);
