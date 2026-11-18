#!/usr/bin/env node
/**
 * Erases the optional reply address of every contact message older than 30 days.
 * Run daily by deploy/tea-talks-sweep.timer. Prints only the number of rows touched.
 *
 *   DB_PATH=/var/lib/tea-talks/tea-talks.sqlite node scripts/sweep.mjs
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbPath = process.env.DB_PATH ?? './data/tea-talks.sqlite';
const DAYS = 30;

mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = DELETE');
db.pragma('secure_delete = ON');
db.exec('CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, text TEXT NOT NULL, reply_to TEXT, day TEXT NOT NULL CHECK (length(day) = 10)) WITHOUT ROWID');
const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const result = db.prepare('UPDATE messages SET reply_to = NULL WHERE reply_to IS NOT NULL AND day < ?').run(cutoff);
db.close();
console.log(`[tea-talks] sweep: ${result.changes} reply address(es) erased`);
