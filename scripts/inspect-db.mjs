#!/usr/bin/env node
/**
 * Shows exactly what the database holds, so anyone can check the promise:
 * one table, and each row has only text, status and a day.
 *
 *   DB_PATH=/var/lib/tea-talks/tea-talks.sqlite node scripts/inspect-db.mjs
 *   node scripts/inspect-db.mjs /path/to/file.sqlite
 */
import Database from 'better-sqlite3';
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname } from 'node:path';

const path = process.argv[2] ?? process.env.DB_PATH ?? './data/tea-talks.sqlite';
if (!existsSync(path)) {
  console.error(`No database at ${path}. Set DB_PATH or pass the path as an argument.`);
  process.exit(1);
}

const db = new Database(path, { readonly: true });

console.log(`Database: ${path}\n`);

console.log('Tables:');
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table'").all();
for (const t of tables) console.log(`  ${t.name}\n${t.sql.split('\n').map((l) => '      ' + l).join('\n')}`);

console.log('\nColumns of "submissions":');
for (const c of db.prepare('PRAGMA table_info(submissions)').all()) console.log(`  ${c.name} (${c.type})`);

console.log('\nSettings stored in the file:');
console.log(`  journal_mode = ${db.pragma('journal_mode', { simple: true })}   (expected: delete)`);
console.log(`  auto_vacuum  = ${db.pragma('auto_vacuum', { simple: true })}   (expected: 1 = full)`);
console.log('  secure_delete is a per-connection setting; the app turns it on every time it opens the file.');

const sidecars = readdirSync(dirname(path)).filter((f) => f.startsWith(basename(path)) && f !== basename(path));
console.log(`\nSidecar files next to the database (journal/wal): ${sidecars.length ? sidecars.join(', ') : 'none'}`);

const rows = db.prepare('SELECT * FROM submissions ORDER BY day DESC').all();
console.log(`\nRows: ${rows.length}`);
for (const r of rows) {
  const keys = Object.keys(r).join(', ');
  const preview = r.text.length > 60 ? r.text.slice(0, 60).replace(/\s+/g, ' ') + '…' : r.text.replace(/\s+/g, ' ');
  console.log(`  [${keys}] status=${r.status} day=${r.day} text="${preview}"`);
}
console.log('\nEach row above should list exactly: id, text, status, day. Nothing else exists to list.');
