/**
 * Receives the story. Stores text + status + day + the page language, nothing more.
 * Every outcome is a redirect, so the browser never shows a page that
 * contains what was submitted.
 */
import type { APIRoute } from 'astro';
import { copy } from '../content/copy';
import { config } from '../lib/config';
import { getStore } from '../lib/store';

export const prerender = false;

export const GET: APIRoute = ({ redirect }) => redirect('/tea-talks', 303);

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();

  // Honeypot filled in: almost certainly a bot. Pretend it worked, store nothing.
  const honeypot = form.get('x9f3a');
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return redirect('/thanks', 303);
  }

  const raw = form.get('story');
  const text = typeof raw === 'string' ? raw.replace(/\r\n?/g, '\n').trim() : '';

  if (text.length === 0) return redirect('/tea-talks?e=empty', 303);
  if (text.length > config.maxLength) return redirect('/tea-talks?e=long', 303);

  (await getStore()).insertSubmission(text, copy.lang);
  return redirect('/thanks', 303);
};
