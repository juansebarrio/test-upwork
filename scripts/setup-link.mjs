#!/usr/bin/env node
/**
 * Prints a one-time link for the collective to choose the moderator passphrase.
 *
 *   DB_PATH=/var/lib/tea-talks/tea-talks.sqlite SITE_URL=https://example.org node scripts/setup-link.mjs
 *
 * The link is /admin/setup?token=... ; only the SHA-256 of the token is stored
 * (in the settings table, with a 24-hour expiry). Opening the link once and
 * saving a passphrase deletes the token. Running this again replaces any
 * earlier, unused link. Send the link by a one-time-link service or Proton to
 * Proton, never through a chat that keeps history.
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

const dbPath = process.env.DB_PATH ?? './data/tea-talks.sqlite';
const site = (process.env.SITE_URL ?? 'http://127.0.0.1:4321').replace(/\/$/, '');
const HOURS = 24;

mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = DELETE');
db.pragma('secure_delete = ON');
db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID');

const token = randomBytes(32).toString('base64url');
const hash = createHash('sha256').update(token, 'utf8').digest('hex');
const expires = Date.now() + HOURS * 60 * 60 * 1000;
db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('setup_token', `${hash}.${expires}`);
db.close();

console.log(`${site}/admin/setup?token=${token}`);
console.log(`(works once, for ${HOURS} hours; the token itself is not stored)`);
