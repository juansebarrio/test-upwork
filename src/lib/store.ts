/**
 * The one door to stored data. Pages call getStore() and never import the
 * database module directly.
 *
 * - Normal mode: the SQLite backend in ./db (better-sqlite3), opened the first
 *   time a page needs it.
 * - DEMO_MODE=true: the in-memory samples in ./demo. The database module is never
 *   imported, so better-sqlite3 is never loaded and no file is ever opened or
 *   written. This is what makes the read-only Vercel preview possible.
 */
import { config } from './config';
import type { Message, Status, Submission } from './types';

export interface Store {
  // Stories
  insertSubmission(text: string, lang: string): void;
  setStatus(id: string, status: Status): void;
  /** Replaces the text in place. No copy of the old text is kept anywhere. */
  updateText(id: string, text: string): void;
  deleteSubmission(id: string): void;
  getSubmission(id: string): Submission | undefined;
  listByStatus(status: Status): Submission[];
  countByStatus(status: Status): number;
  /** Approved stories, newest day first; lang null = every language. */
  countApproved(lang: string | null): number;
  listApprovedPage(lang: string | null, limit: number, offset: number): Submission[];
  // Contact messages
  insertMessage(text: string, replyTo: string | null): void;
  listMessages(): Message[];
  countMessages(): number;
  /** Erases the reply address at once; the text stays. */
  markReplied(id: string): void;
  deleteMessage(id: string): void;
  // Settings (passphrase hash, setup token). Never anything about visitors.
  getSetting(key: string): string | undefined;
  setSetting(key: string, value: string): void;
  deleteSetting(key: string): void;
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

// Outside demo mode, open the database as soon as this module loads, and stop
// the process with a message if that fails, so a broken DB_PATH is noticed at once.
if (!config.demoMode) {
  getStore().catch((err: Error) => {
    console.error('[tea-talks] could not open the database:', err?.message ?? String(err));
    process.exit(1);
  });
}
