import type { APIRoute } from 'astro';
import { passwordMatches, startSession } from '../../lib/auth';

export const prerender = false;

export const GET: APIRoute = ({ redirect }) => redirect('/admin', 303);

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const password = form.get('password');
  if (typeof password === 'string' && passwordMatches(password)) {
    startSession(cookies);
    return redirect('/admin', 303);
  }
  // Failed attempts are not counted or logged: counting would need to key on the visitor.
  return redirect('/admin?login=failed', 303);
};
