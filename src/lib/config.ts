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

export const config = {
  /** Moderator password. Empty means the admin panel refuses every login. */
  adminPassword: env.ADMIN_PASSWORD ?? '',
  /** Show approved stories at /stories. Off by default. */
  publicArchive: bool(env.PUBLIC_ARCHIVE, false),
  /** SQLite file. Relative paths resolve from the working directory. */
  dbPath: env.DB_PATH ?? './data/tea-talks.sqlite',
  /** Where the quick-exit button goes. A weather site is ordinary and unremarkable. */
  quickExitUrl: env.QUICK_EXIT_URL ?? 'https://www.weather.com/',
  /** Longest story we accept, in characters. */
  maxLength: 8000,
  /** A moderator is logged out after this long without activity, in seconds. */
  adminIdleSeconds: 30 * 60,
  /** Every login attempt takes at least this long, whatever the result, in milliseconds. */
  loginDelayMs: 500,
};

if (!config.adminPassword) {
  // Startup-only notice. Contains no request data.
  console.error('[tea-talks] ADMIN_PASSWORD is not set; the moderation panel will not accept logins.');
}
