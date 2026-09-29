/**
 * Receives the story. Stores text + status + day, nothing more.
 * Every outcome is a redirect, so the browser never shows a page that
 * contains what was submitted.
 */
import type { APIRoute } from 'astro';
import { config } from '../lib/config';
import { insertSubmission } from '../lib/db';

export const prerender = false;

export const GET: APIRoute = ({ redirect }) => redirect('/', 303);

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();

  // Honeypot filled in: almost certainly a bot. Pretend it worked, store nothing.
  // The field name matches the one in index.astro and nothing an autofill heuristic knows.
  const honeypot = form.get('x9f3a');
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return redirect('/thanks', 303);
  }

  const raw = form.get('story');
  const text = typeof raw === 'string' ? raw.replace(/\r\n?/g, '\n').trim() : '';

  if (text.length === 0) return redirect('/?e=empty', 303);
  if (text.length > config.maxLength) return redirect('/?e=long', 303);

  insertSubmission(text);
  return redirect('/thanks', 303);
};
