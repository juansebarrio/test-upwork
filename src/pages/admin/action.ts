import type { APIRoute } from 'astro';
import { config } from '../../lib/config';
import { endSession, isSignedIn } from '../../lib/auth';
import { getStore } from '../../lib/store';

export const prerender = false;

export const GET: APIRoute = ({ redirect }) => redirect('/admin', 303);

const TABS = new Set(['waiting', 'approved', 'rejected', 'messages']);
const ID = /^[A-Za-z0-9_-]{16}$/;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!isSignedIn(cookies)) return redirect('/admin', 303);

  const form = await request.formData();
  const action = form.get('action');
  const id = form.get('id');
  const tab = String(form.get('tab') ?? 'waiting');
  const back = TABS.has(tab) && tab !== 'waiting' ? `/admin?tab=${tab}` : '/admin';

  if (action === 'logout') {
    endSession(cookies);
    return redirect('/admin', 303);
  }
  if (typeof id === 'string' && ID.test(id)) {
    const store = await getStore();
    switch (action) {
      case 'approve': store.setStatus(id, 'approved'); break;
      case 'reject': store.setStatus(id, 'rejected'); break;
      case 'unpublish': store.setStatus(id, 'pending'); break;
      case 'restore': store.setStatus(id, 'pending'); break;
      case 'delete': store.deleteSubmission(id); break;
      case 'save': {
        const raw = form.get('text');
        const text = typeof raw === 'string' ? raw.replace(/\r\n?/g, '\n').trim() : '';
        // Saving replaces the text in place; nothing of the previous text is kept.
        if (text.length > 0 && text.length <= config.maxLength) store.updateText(id, text);
        break;
      }
      case 'replied': store.markReplied(id); break;
      case 'delete-message': store.deleteMessage(id); break;
    }
  }
  return redirect(back, 303);
};
