/**
 * The one door to stored stories. Pages call getStore() and never import the
 * database module directly.
 *
 * - Normal mode: the SQLite backend in ./db (better-sqlite3), opened the first
 *   time a page needs it, exactly as before.
 * - DEMO_MODE=true: the in-memory samples in ./demo. The database module is never
 *   imported, so better-sqlite3 is never loaded and no file is ever opened or
 *   written. This is what makes the read-only Vercel preview possible.
 */
import { config } from './config';
import type { Submission } from './types';

export interface Store {
  insertSubmission(text: string): void;
  approveSubmission(id: string): void;
  unpublishSubmission(id: string): void;
  deleteSubmission(id: string): void;
  getSubmission(id: string): Submission | undefined;
  listPending(): Submission[];
  listApproved(): Submission[];
  countApproved(): number;
  listApprovedPage(limit: number, offset: number): Submission[];
  today(): string;
}

let cached: Promise<Store> | undefined;

export function getStore(): Promise<Store> {
  if (!cached) {
    cached = config.demoMode
      ? import('./demo').then((m) => m.demoStore)
      : import('./db').then((m) => m.dbStore);
  }
  return cached;
}

// Outside demo mode, open the database as soon as this module loads (the first
// request that needs stories, as before), and stop the process with a message
// if that fails, so a broken DB_PATH is noticed at once.
if (!config.demoMode) {
  getStore().catch((err: Error) => {
    console.error('[tea-talks] could not open the database:', err?.message ?? String(err));
    process.exit(1);
  });
}
