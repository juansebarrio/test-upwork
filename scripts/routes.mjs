/**
 * The site's routes, shared by verify.mjs, a11y.mjs, copy-check.mjs and screenshots.mjs.
 * `noindex` says which routes must carry the robots meta tag and X-Robots-Tag header.
 */
export const PUBLIC_PAGES = [
  { path: '/', noindex: false, content: 'home' },
  { path: '/about', noindex: false, content: 'about' },
  { path: '/our-work', noindex: false, content: 'ourWork' },
  { path: '/safety-and-privacy', noindex: false, content: 'safety' },
  { path: '/contact', noindex: false, content: 'contact' },
  { path: '/contact/sent', noindex: false, content: 'contactSent' },
  { path: '/mental-health', noindex: false, content: 'mentalHealth' },
  { path: '/tea-talks', noindex: true, content: 'teaTalks' },
  { path: '/thanks', noindex: true, content: 'thanks' },
  { path: '/stories', noindex: true, content: 'stories', flag: true },
  { path: '/stories?page=2', noindex: true, content: 'stories', flag: true },
  { path: '/stories?all=1', noindex: true, content: 'stories', flag: true },
];
/** The moderation panel stays out of search engines (an existing privacy property). */
export const PANEL_PAGES = [
  { path: '/admin', noindex: true, content: 'admin' },
  { path: '/admin/setup', noindex: true, status: 404 },
  { path: '/admin/passphrase', noindex: true, status: 303 },
];
export const ERROR_PAGES = [
  { path: '/nothing-here', noindex: true, status: 404 },
];
export const STATIC_FILES = ['/site.css', '/quick-exit.js', '/robots.txt', '/fonts/albert-sans-latin-wght-normal.woff2', '/fonts/albert-sans-latin-ext-wght-normal.woff2'];
