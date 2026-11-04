/**
 * The whole database. Three tables and nothing about any visitor:
 *  - submissions: a story's text, its status, the day it arrived, the language
 *    of the page it was written on. The id is random, so it reveals no order.
 *  - messages: a contact message's text, an optional way to reply (erased on
 *    "Replied" or after 30 days by scripts/sweep.mjs), the day.
 *  - settings: the passphrase hash and the one-time setup token hash.
 * Migrations run at startup and are idempotent.
 */
import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config';
import type { Store } from './store';
import type { Message, Status, Submission } from './types';

export type { Message, Status, Submission } from './types';

mkdirSync(dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);

// auto_vacuum must be set before any table exists to take effect.
db.pragma('auto_vacuum = FULL');
// Plain rollback journal (no write-ahead log file lingering next to the db).
db.pragma('journal_mode = DELETE');
// Overwrite deleted content with zeros instead of leaving it in free pages.
db.pragma('secure_delete = ON');
db.pragma('foreign_keys = ON');

const SUBMISSIONS_SQL = `
  CREATE TABLE IF NOT EXISTS submissions (
    id     TEXT PRIMARY KEY,
    text   TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    day    TEXT NOT NULL CHECK (length(day) = 10),
    lang   TEXT NOT NULL DEFAULT 'en'
  ) WITHOUT ROWID;`;

function migrate(): void {
  const existing = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'submissions'").get() as { sql: string } | undefined;
  if (!existing) {
    db.exec(SUBMISSIONS_SQL);
  } else if (!existing.sql.includes("'rejected'") || !/\blang\b/.test(existing.sql)) {
    // An older table (two statuses, no lang): rebuild it in place, keeping every row.
    db.transaction(() => {
      db.exec(SUBMISSIONS_SQL.replace('submissions', 'submissions_new'));
      db.exec("INSERT INTO submissions_new (id, text, status, day, lang) SELECT id, text, status, day, 'en' FROM submissions");
      db.exec('DROP TABLE submissions');
      db.exec('ALTER TABLE submissions_new RENAME TO submissions');
    })();
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id       TEXT PRIMARY KEY,
      text     TEXT NOT NULL,
      reply_to TEXT,
      day      TEXT NOT NULL CHECK (length(day) = 10)
    ) WITHOUT ROWID;
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    ) WITHOUT ROWID;
  `);
}
migrate();

const COLS = 'id, text, status, day, lang';
const stmts = {
  insert: db.prepare<[string, string, string, string]>(`INSERT INTO submissions (id, text, status, day, lang) VALUES (?, ?, 'pending', ?, ?)`),
  setStatus: db.prepare<[string, string]>('UPDATE submissions SET status = ? WHERE id = ?'),
  updateText: db.prepare<[string, string]>('UPDATE submissions SET text = ? WHERE id = ?'),
  remove: db.prepare<[string]>('DELETE FROM submissions WHERE id = ?'),
  byId: db.prepare<[string]>(`SELECT ${COLS} FROM submissions WHERE id = ?`),
  // Newest day first. Within a day the order is by random id, i.e. no order at all. That is intentional.
  byStatus: db.prepare<[string]>(`SELECT ${COLS} FROM submissions WHERE status = ? ORDER BY day DESC, id`),
  countByStatus: db.prepare<[string]>('SELECT count(*) AS n FROM submissions WHERE status = ?'),
  countApprovedLang: db.prepare<[string]>("SELECT count(*) AS n FROM submissions WHERE status = 'approved' AND lang = ?"),
  countApprovedAll: db.prepare("SELECT count(*) AS n FROM submissions WHERE status = 'approved'"),
  pageLang: db.prepare<[string, number, number]>(`SELECT ${COLS} FROM submissions WHERE status = 'approved' AND lang = ? ORDER BY day DESC, id LIMIT ? OFFSET ?`),
  pageAll: db.prepare<[number, number]>(`SELECT ${COLS} FROM submissions WHERE status = 'approved' ORDER BY day DESC, id LIMIT ? OFFSET ?`),

  insertMessage: db.prepare<[string, string, string | null, string]>('INSERT INTO messages (id, text, reply_to, day) VALUES (?, ?, ?, ?)'),
  messages: db.prepare('SELECT id, text, reply_to, day FROM messages ORDER BY day DESC, id'),
  countMessages: db.prepare('SELECT count(*) AS n FROM messages'),
  replied: db.prepare<[string]>('UPDATE messages SET reply_to = NULL WHERE id = ?'),
  removeMessage: db.prepare<[string]>('DELETE FROM messages WHERE id = ?'),

  getSetting: db.prepare<[string]>('SELECT value FROM settings WHERE key = ?'),
  setSetting: db.prepare<[string, string]>('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
  deleteSetting: db.prepare<[string]>('DELETE FROM settings WHERE key = ?'),
};

/** Today's date at day granularity, UTC. The only time-related value we ever store. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newId(): string {
  return randomBytes(12).toString('base64url');
}

/** What pages use, through src/lib/store.ts. */
export const dbStore: Store = {
  insertSubmission(text, lang) { stmts.insert.run(newId(), text, today(), lang); },
  setStatus(id, status) { stmts.setStatus.run(status, id); },
  updateText(id, text) { stmts.updateText.run(text, id); },
  deleteSubmission(id) { stmts.remove.run(id); },
  getSubmission(id) { return stmts.byId.get(id) as Submission | undefined; },
  listByStatus(status) { return stmts.byStatus.all(status) as Submission[]; },
  countByStatus(status) { return (stmts.countByStatus.get(status) as { n: number }).n; },
  countApproved(lang) {
    return ((lang ? stmts.countApprovedLang.get(lang) : stmts.countApprovedAll.get()) as { n: number }).n;
  },
  listApprovedPage(lang, limit, offset) {
    return (lang ? stmts.pageLang.all(lang, limit, offset) : stmts.pageAll.all(limit, offset)) as Submission[];
  },
  insertMessage(text, replyTo) { stmts.insertMessage.run(newId(), text, replyTo, today()); },
  listMessages() { return stmts.messages.all() as Message[]; },
  countMessages() { return (stmts.countMessages.get() as { n: number }).n; },
  markReplied(id) { stmts.replied.run(id); },
  deleteMessage(id) { stmts.removeMessage.run(id); },
  getSetting(key) { return (stmts.getSetting.get(key) as { value: string } | undefined)?.value; },
  setSetting(key, value) { stmts.setSetting.run(key, value); },
  deleteSetting(key) { stmts.deleteSetting.run(key); },
  today,
};
