/**
 * DEMO_MODE backend. Sample stories come from the copy file. Every call builds
 * its samples afresh, and every write is a no-op, so nothing can persist
 * anywhere: not in a file, not in memory between requests, not on Vercel.
 */
import { copy } from '../copy';
import type { Store } from './store';
import type { Submission } from './types';

// Fixed, obviously sample days. Ids are 16 characters like real ones.
const APPROVED_DAYS = ['2026-08-14', '2026-07-02', '2026-05-21'];
const PENDING_DAYS = ['2026-09-29', '2026-09-28'];

function approved(): Submission[] {
  return copy.demo.stories.map((text, i) => ({
    id: `demo_approved_${String(i + 1).padStart(2, '0')}`,
    text,
    status: 'approved',
    day: APPROVED_DAYS[i] ?? APPROVED_DAYS[0],
  }));
}

function pending(): Submission[] {
  return copy.demo.pending.map((text, i) => ({
    id: `demo_pending__${String(i + 1).padStart(2, '0')}`,
    text,
    status: 'pending',
    day: PENDING_DAYS[i] ?? PENDING_DAYS[0],
  }));
}

export const demoStore: Store = {
  insertSubmission() { /* preview: nothing is stored */ },
  approveSubmission() { /* preview: nothing changes */ },
  unpublishSubmission() { /* preview: nothing changes */ },
  deleteSubmission() { /* preview: nothing changes */ },
  getSubmission(id) {
    return [...pending(), ...approved()].find((s) => s.id === id);
  },
  listPending: pending,
  listApproved: approved,
  countApproved() { return approved().length; },
  listApprovedPage(limit, offset) { return approved().slice(offset, offset + limit); },
  today() { return new Date().toISOString().slice(0, 10); },
};
