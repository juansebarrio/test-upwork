/**
 * DEMO_MODE backend. Samples come from the copy file. Every call builds its
 * samples afresh, and every write is a no-op, so nothing can persist anywhere:
 * not in a file, not in memory between requests, not on Vercel.
 */
import { copy } from '../content/copy';
import type { Store } from './store';
import type { Message, Status, Submission } from './types';

// Fixed, obviously sample days. Ids are 16 characters like real ones.
const APPROVED_DAYS = ['2026-08-14', '2026-07-02', '2026-05-21'];
const PENDING_DAYS = ['2026-09-29', '2026-09-28'];

function rows(texts: readonly string[], status: Status, prefix: string, days: string[]): Submission[] {
  return texts.map((text, i) => ({
    id: `${prefix}${String(i + 1).padStart(2, '0')}`.padEnd(16, '_').slice(0, 16),
    text,
    status,
    day: days[i] ?? days[0],
    lang: 'en',
  }));
}
const approved = () => rows(copy.demo.stories, 'approved', 'demo_approved_', APPROVED_DAYS);
const pending = () => rows(copy.demo.pending, 'pending', 'demo_pending__', PENDING_DAYS);
const rejected = () => rows(copy.demo.rejected, 'rejected', 'demo_rejected_', ['2026-09-20']);
const all = () => [...pending(), ...approved(), ...rejected()];
const byStatus = (status: Status) => all().filter((s) => s.status === status);

function messages(): Message[] {
  return copy.demo.messages.map((m, i) => ({
    id: `demo_message__${String(i + 1).padStart(2, '0')}`,
    text: m.text,
    reply_to: m.replyTo,
    day: ['2026-09-27', '2026-09-25'][i] ?? '2026-09-25',
  }));
}

export const demoStore: Store = {
  insertSubmission() { /* preview: nothing is stored */ },
  setStatus() { /* preview: nothing changes */ },
  updateText() { /* preview: nothing changes */ },
  deleteSubmission() { /* preview: nothing changes */ },
  getSubmission(id) { return all().find((s) => s.id === id); },
  listByStatus: byStatus,
  countByStatus(status) { return byStatus(status).length; },
  countApproved() { return approved().length; },
  listApprovedPage(_lang, limit, offset) { return approved().slice(offset, offset + limit); },
  insertMessage() { /* preview: nothing is stored */ },
  listMessages: messages,
  countMessages() { return messages().length; },
  markReplied() { /* preview: nothing changes */ },
  deleteMessage() { /* preview: nothing changes */ },
  getSetting() { return undefined; },
  setSetting() { /* preview: nothing is stored */ },
  deleteSetting() { /* preview: nothing changes */ },
  today() { return new Date().toISOString().slice(0, 10); },
};
