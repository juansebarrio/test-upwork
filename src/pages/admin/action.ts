import type { APIRoute } from 'astro';
import { endSession, isSignedIn } from '../../lib/auth';
import { getStore } from '../../lib/store';

export const prerender = false;

export const GET: APIRoute = ({ redirect }) => redirect('/admin', 303);

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!isSignedIn(cookies)) return redirect('/admin', 303);

  const form = await request.formData();
  const action = form.get('action');
  const id = form.get('id');
  const back = form.get('tab') === 'approved' ? '/admin?tab=approved' : '/admin';

  if (action === 'logout') {
    endSession(cookies);
    return redirect('/admin', 303);
  }
  if (typeof id === 'string' && /^[A-Za-z0-9_-]{16}$/.test(id)) {
    const store = await getStore();
    if (action === 'approve') store.approveSubmission(id);
    else if (action === 'unpublish') store.unpublishSubmission(id);
    else if (action === 'delete') store.deleteSubmission(id);
  }
  return redirect(back, 303);
};
