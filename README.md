# Tea Talks

An anonymous story page for Shai Collective. People write something, a moderator reads it, and it is either shared or deleted. The system is built so that nobody, including us, can tell who wrote what.

**Guiding principle: data we never collect cannot be leaked, hacked, subpoenaed or demanded.**

## What is stored

Per story: the text, a status (`pending` or `approved`), and the day it arrived (`YYYY-MM-DD`, no time). Plus a random id so the moderation panel can point at a row. That is the whole schema; see `src/lib/db.ts`.

Not stored, anywhere, ever: IP addresses, user agents, headers, timestamps, cookies for visitors, request logs.

## Layout

```
src/
  copy.ts                All user-facing text. Edit this file to change wording.
  middleware.ts          Security headers on every response, CSRF check, error catch.
  lib/config.ts          Environment variables (ADMIN_PASSWORD, PUBLIC_ARCHIVE, ...).
  lib/db.ts              SQLite: one table, three fields, hard delete.
  lib/auth.ts            Constant-time password check, in-memory admin sessions.
  layouts/Base.astro     Page shell: wordmark header, quick exit, main column.
  components/QuickExit.astro  The one shared quick-exit control (Lucide log-out icon).
  lib/format.ts          Month-and-year and "received today" labels from a stored day.
  pages/index.astro      The story form.        pages/submit.ts     Receives it.
  pages/thanks.astro     Confirmation.          pages/stories.astro Archive (flag).
  pages/admin/           Moderation panel, login and actions.
  styles/global.css      Design tokens from the handoff, typography, layout. Fonts are in public/fonts.
server.mjs               Production entry: serves static files with the security headers, hands the rest to Astro.
security-headers.mjs     The one list of headers, used by server.mjs and src/middleware.ts.
public/
  quick-exit.js          Leave-quickly button, double Escape, history-free navigation.
  fonts/                 Albert Sans variable, self-hosted woff2 (SIL Open Font License).
deploy/                  Caddyfile, systemd unit, Dockerfile, step-by-step DEPLOY.md.
docs/                    Moderation guide, community document, verification checklist.
scripts/                 inspect-db.mjs (what the database holds), verify.mjs (headers, cookies, origins).
```

## Run it locally

```bash
npm install
cp .env.example .env    # then set ADMIN_PASSWORD and DB_PATH=./data/tea-talks.sqlite
npm run build
set -a; source .env; set +a
npm start               # http://127.0.0.1:4321
```

`npm run dev` works too, but the dev server is chattier than production; verify against `npm start`.

Then, in another terminal: `node scripts/verify.mjs` and `node scripts/inspect-db.mjs`.

## Configuration

| Variable | Meaning | Default |
|----------|---------|---------|
| `ADMIN_PASSWORD` | Moderator password. Required; empty disables login. | (none) |
| `PUBLIC_ARCHIVE` | `true` shows approved stories at `/stories`; `false` makes that URL a 404. | `false` in code (`true` in demo mode); `.env.example` ships `true` |
| `DB_PATH` | SQLite file location. | `./data/tea-talks.sqlite` |
| `QUICK_EXIT_URL` | Where "Leave quickly" goes. | `https://www.weather.com/` |
| `DEMO_MODE` | `true` makes a preview that stores nothing (see below). | `false` |
| `DEPLOY_TARGET` | Build-time only. `vercel` selects the Vercel adapter; anything else the Node adapter. | node |
| `HOST`, `PORT` | Bind address. Keep on localhost behind Caddy. | `127.0.0.1`, `4321` |

Changing any of these is a restart, not a rebuild.

## Design

The look follows the collective's handoff: Albert Sans as the one typeface, cream ground, terracotta for the single action, amber only for the quick exit and focus rings, no images or illustrations, no shadows, transitions limited to colour. The submission textarea fills the phone viewport so the button is reachable without scrolling. The public archive shows month and year only; the moderation panel shows "today", "yesterday" or the date, never a time, because no time is stored. Lists are newest day first. One handoff detail is left out on purpose: cards do not fade out after Approve or Delete, because the panel works without JavaScript and each action is a plain form post followed by a reload.

## Privacy design, in short

- **Headers on every response**: `Content-Security-Policy: default-src 'self'` (and only `'self'` for scripts, styles, fonts, images, connections, form targets), `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, `frame-ancestors 'none'`.
- **No inline scripts or styles**, so the CSP has no `'unsafe-inline'` anywhere. Astro is configured with `inlineStylesheets: 'never'`.
- **No logging**: the app prints one line at startup and error messages without request data. Caddy's access log is set to `discard`; Caddy is told not to forward `X-Forwarded-For` at all. One known edge: if the Astro adapter itself fails to build a request object (malformed headers), it logs "Could not render" with the URL path; the path never contains story text.
- **Headers on static files too**: `server.mjs` serves the stylesheet, script, fonts and favicon itself with the same headers, because the adapter's built-in static server sends none. The Caddyfile sets them a second time at the edge.
- **Cookies**: none on public pages. The admin cookie is `Path=/admin; HttpOnly; Secure; SameSite=Strict` with no expiry (it dies with the browser), holds a random token, and the session table lives in memory only. Sessions end after 30 minutes without activity. Every login attempt takes a fixed 500 ms whatever the outcome, so timing says nothing, and nothing about attempts is counted or stored.
- **CSRF**: form posts are refused when `Sec-Fetch-Site` says anything but same-origin; browsers without that header are checked by `Origin` against `Host`. Under `no-referrer`, browsers send `Origin: null` on form navigations, so `Sec-Fetch-Site` has to be the primary signal. Admin forms are additionally protected by the `SameSite=Strict` cookie.
- **Spam**: a honeypot field with a meaningless name so browser autofill never fills it. No rate limiting, because rate limiting needs to know who is asking.
- **Deletion**: `DELETE FROM`, with `secure_delete=ON` so freed pages are zeroed, `journal_mode=DELETE` so no write-ahead log lingers, and `auto_vacuum=FULL`.
- **Random ids** (`WITHOUT ROWID` table) so nothing, not even the row order on disk, reveals when a story arrived within its day.
- **Quick exit**: one tap on the button, or Escape twice within a second (one press alone does nothing, so a stray key never erases a story). `location.replace` for the exit, for internal links and for the form (submitted in the background, then replaced), so a visit is one history entry and leaving overwrites it.

## Temporary preview (DEMO_MODE)

`DEMO_MODE=true` turns the app into a click-through that stores nothing: no database module is loaded, writes are no-ops, sample stories come from the copy file, and a banner on every page says so. `npm run build:vercel` builds the same repo for Vercel. Details, the exact environment variables, and the list of write paths that become no-ops are in `deploy/VERCEL-PREVIEW.md`. With the variable unset, nothing changes.

## Documents

- `docs/VERIFICATION.md`: the checklist to run after deploying.
- `docs/MODERATION-GUIDE.md`: for the person reading stories.
- `docs/WHAT-WE-DO-NOT-COLLECT.md`: the one-page note for the community.
- `deploy/DEPLOY.md`: fresh Hetzner Ubuntu server, start to finish.
