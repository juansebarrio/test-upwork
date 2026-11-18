/**
 * Pages kept out of search engines: the writing page, its confirmation, the contact confirmation, the
 * public stories and every page of them. The moderation panel stays out too
 * (an existing privacy property), and so does every error response.
 * Nothing is listed in robots.txt on purpose.
 */
export function wantsNoindex(pathname: string, status: number): boolean {
  if (status >= 400) return true;
  return pathname === '/tea-talks' || pathname === '/thanks' || pathname === '/stories' || pathname === '/contact/sent' || pathname === '/admin' || pathname.startsWith('/admin/');
}
