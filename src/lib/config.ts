/**
 * Runtime configuration, read from environment variables once at startup.
 * Values are read with process.env (not import.meta.env) so they can be
 * changed on the server without rebuilding.
 */
const env = process.env;

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  return value.trim().toLowerCase() === 'true';
}

/**
 * Preview mode for a temporary click-through (e.g. on Vercel). Nothing is stored:
 * the database module is never loaded, writes are no-ops, sample rows come from
 * the copy file, and a banner says so on every page. Off by default, except in a
 * build made for Vercel (see astro.config.mjs), where it is on unless DEMO_MODE is set.
 */
const demoMode = bool(env.DEMO_MODE, process.env.TEA_TALKS_VERCEL_BUILD === 'true');

export const config = {
  demoMode,
  /**
   * DEMO_MODE only: the preview's throwaway password. In normal mode the
   * passphrase lives as a scrypt hash in the database (set through the one-time
   * setup link) and this value is ignored entirely.
   */
  adminPassword: demoMode ? (env.ADMIN_PASSWORD ?? '') : '',
  /** Show approved stories at /stories. Off by default; on by default in demo mode, where it shows samples. */
  publicArchive: bool(env.PUBLIC_ARCHIVE, demoMode),
  /** SQLite file. Relative paths resolve from the working directory. */
  dbPath: env.DB_PATH ?? './data/tea-talks.sqlite',
  /** Where the quick-exit button goes. A weather site is ordinary and unremarkable. */
  quickExitUrl: env.QUICK_EXIT_URL ?? 'https://www.weather.com/',
  /** Optional address shown on the contact page. Empty means the block is not rendered. */
  contactEmail: (env.CONTACT_EMAIL ?? '').trim(),
  /** Languages offered. One entry means no language switcher is rendered. */
  languages: ['en'] as const,
  /** Longest story or message we accept, in characters. */
  maxLength: 8000,
  /** Longest reply address we accept, in characters. */
  maxReplyLength: 200,
  /** A moderator is logged out after this long without activity, in seconds. */
  adminIdleSeconds: 30 * 60,
  /** Every login attempt takes at least this long, whatever the result, in milliseconds. */
  loginDelayMs: 500,
  /** Shortest passphrase accepted, in characters. */
  minPassphrase: 16,
  /** A setup link stops working after this long, in seconds. */
  setupTokenSeconds: 24 * 60 * 60,
};

if (config.demoMode) {
  console.error('[tea-talks] DEMO_MODE is on: nothing written to this instance is stored.');
  if (!config.adminPassword) {
    console.error('[tea-talks] ADMIN_PASSWORD is not set; the preview panel will not accept logins.');
  }
}
