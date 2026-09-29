import type { APIRoute } from 'astro';
import { config } from '../../lib/config';
import { passwordMatches, startSession } from '../../lib/auth';

export const prerender = false;

export const GET: APIRoute = ({ redirect }) => redirect('/admin', 303);

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // Every attempt takes the same fixed time, right or wrong. This slows down
  // guessing without counting anything about who is guessing.
  const minimumWait = new Promise<void>((resolve) => setTimeout(resolve, config.loginDelayMs));

  const form = await request.formData();
  const password = form.get('password');
  const matched = typeof password === 'string' && passwordMatches(password);
  if (matched) startSession(cookies);

  await minimumWait;
  // Failed attempts are not counted or logged: counting would need to key on the visitor.
  return redirect(matched ? '/admin' : '/admin?login=failed', 303);
};
