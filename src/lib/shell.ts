/**
 * The page shell as HTML strings: skip link, header (brand, navigation, the
 * language switcher slot, the quick-exit pill), footer, demo banner.
 * Used by the Astro layout and by the middleware's bare 403/500 pages, so every
 * screen, error pages included, carries the identical header and footer.
 */
import { copy } from '../content/copy';
import { config } from './config';

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Lucide "log-out", the one icon on the quick exit. */
export const LOGOUT_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>';
/** Lucide "arrow-right", the only other icon, used on door rows. */
export const ARROW_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

export interface ShellOptions {
  /** Tea Talks pages: internal links navigate with location.replace (one history entry per visit). */
  replaceLinks?: boolean;
  /** Which nav item is the current page, by href. */
  current?: string;
}

export function quickExitHtml(): string {
  return `<a class="quick-exit" href="${escapeHtml(config.quickExitUrl)}" data-quick-exit aria-label="${escapeHtml(copy.quickExit.ariaLabel)}" rel="noreferrer noopener">${LOGOUT_ICON}<span>${escapeHtml(copy.quickExit.label)}</span></a>`;
}

export function headerHtml(opts: ShellOptions = {}): string {
  const rep = opts.replaceLinks ? ' data-replace' : '';
  const nav = copy.nav
    .map((n) => `<a href="${n.href}"${rep}${opts.current === n.href ? ' aria-current="page"' : ''}>${escapeHtml(n.label)}</a>`)
    .join('');
  // The language switcher slot renders only when more than one language is offered.
  const langs = config.languages.length > 1
    ? `<nav class="lang" aria-label="Language">${config.languages.map((l) => `<a href="/${l === 'en' ? '' : l + '/'}" lang="${l}">${l.toUpperCase()}</a>`).join('')}</nav>`
    : '';
  return [
    `<a class="skip-link" href="#main">${escapeHtml(copy.skipLink)}</a>`,
    `<header class="site-header">`,
    `<div class="site-header-row">`,
    `<a class="brand" href="/"${rep}>${escapeHtml(copy.siteName)}</a>`,
    `<div class="site-header-end">${langs}${quickExitHtml()}</div>`,
    `</div>`,
    `<nav class="site-nav" aria-label="Site">${nav}</nav>`,
    `</header>`,
    config.demoMode ? `<p class="demo-banner" role="note">${escapeHtml(copy.demo.banner)}</p>` : '',
  ].join('');
}

export function footerHtml(opts: ShellOptions = {}): string {
  const rep = opts.replaceLinks ? ' data-replace' : '';
  const links = [...copy.nav, copy.footer.safety]
    .map((n) => `<a href="${n.href}"${rep}>${escapeHtml(n.label)}</a>`)
    .join('');
  return `<footer class="site-footer"><span class="brand">${escapeHtml(copy.siteName)}</span><nav aria-label="Footer">${links}</nav></footer>`;
}

/** A whole bare page (403, 500), with the same shell as every other screen. */
export function barePage(heading: string, body: string, backLabel: string): string {
  return [
    `<!doctype html><html lang="${copy.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="description" content="${escapeHtml(copy.siteDescription)}"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex, nofollow">`,
    `<title>${escapeHtml(copy.siteName)}</title><link rel="stylesheet" href="/site.css"></head><body>`,
    headerHtml(),
    `<main id="main" class="page" tabindex="-1"><section class="centered"><h1>${escapeHtml(heading)}</h1><p class="body">${escapeHtml(body)}</p><p class="return"><a class="link" href="/">${escapeHtml(backLabel)}</a></p></section></main>`,
    footerHtml(),
    `<script src="/quick-exit.js" defer></script></body></html>`,
  ].join('');
}
