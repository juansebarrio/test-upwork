import type { APIRoute } from 'astro';

/** Allow everything. The Tea Talks paths are kept out of search by headers and meta tags, never by listing them here. */
export const GET: APIRoute = () =>
  new Response('User-agent: *\nDisallow:\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
