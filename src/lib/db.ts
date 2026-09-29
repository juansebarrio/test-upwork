/**
 * The whole database. One table, three pieces of information per story:
 * the text, a status, and the day it arrived. The id exists only so the
 * moderation panel can point at a row; it is random, so it reveals nothing
 * about order or time.
 */
import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config';

export type Status = 'pending' | 'approved';

export interface Submission {
  id: string;
  text: string;
  status: Status;
  /** YYYY-MM-DD, UTC. */
  day: string;
}

mkdirSync(dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);

// auto_vacuum must be set before any table exists to take effect.
db.pragma('auto_vacuum = FULL');
// Plain rollback journal (no write-ahead log file lingering next to the db).
db.pragma('journal_mode = DELETE');
// Overwrite deleted content with zeros instead of leaving it in free pages.
db.pragma('secure_delete = ON');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id     TEXT PRIMARY KEY,
    text   TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved')),
    day    TEXT NOT NULL CHECK (length(day) = 10)
  ) WITHOUT ROWID;
`);

const stmts = {
  insert: db.prepare<[string, string, string]>(
    "INSERT INTO submissions (id, text, status, day) VALUES (?, ?, 'pending', ?)",
  ),
  approve: db.prepare<[string]>("UPDATE submissions SET status = 'approved' WHERE id = ?"),
  unpublish: db.prepare<[string]>("UPDATE submissions SET status = 'pending' WHERE id = ?"),
  countApproved: db.prepare("SELECT count(*) AS n FROM submissions WHERE status = 'approved'"),
  approvedPage: db.prepare<[number, number]>("SELECT id, text, status, day FROM submissions WHERE status = 'approved' ORDER BY day DESC, id LIMIT ? OFFSET ?"),
  remove: db.prepare<[string]>('DELETE FROM submissions WHERE id = ?'),
  byId: db.prepare<[string]>('SELECT id, text, status, day FROM submissions WHERE id = ?'),
  // Within a day the order is by random id, i.e. no order at all. That is intentional.
  pending: db.prepare("SELECT id, text, status, day FROM submissions WHERE status = 'pending' ORDER BY day ASC, id"),
  approvedAll: db.prepare("SELECT id, text, status, day FROM submissions WHERE status = 'approved' ORDER BY day DESC, id"),
  approvedNewest: db.prepare("SELECT id, text, status, day FROM submissions WHERE status = 'approved' ORDER BY day DESC, id"),
};

/** Today's date at day granularity, UTC. The only time-related value we ever store. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newId(): string {
  return randomBytes(12).toString('base64url');
}

export function insertSubmission(text: string): void {
  stmts.insert.run(newId(), text, today());
}

export function approveSubmission(id: string): void {
  stmts.approve.run(id);
}

/** Back to the waiting list. The story stays in the database. */
export function unpublishSubmission(id: string): void {
  stmts.unpublish.run(id);
}

export function countApproved(): number {
  return (stmts.countApproved.get() as { n: number }).n;
}

/** One page of the public archive, newest day first. */
export function listApprovedPage(limit: number, offset: number): Submission[] {
  return stmts.approvedPage.all(limit, offset) as Submission[];
}

/** Hard delete. The row is gone and its pages are zeroed (secure_delete). */
export function deleteSubmission(id: string): void {
  stmts.remove.run(id);
}

export function getSubmission(id: string): Submission | undefined {
  return stmts.byId.get(id) as Submission | undefined;
}

export function listPending(): Submission[] {
  return stmts.pending.all() as Submission[];
}

export function listApproved(): Submission[] {
  return stmts.approvedAll.all() as Submission[];
}

export function listApprovedNewestFirst(): Submission[] {
  return stmts.approvedNewest.all() as Submission[];
}
