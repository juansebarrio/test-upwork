# Shai Collective website

The public site of Shai Collective, with Tea Talks, an anonymous story page.
People write something, a moderator reads it, and it is published, set aside or
deleted. The system is built so that nobody, including the collective, can tell who
wrote what, or who wrote to them through the contact page.

**Guiding principle: data we never collect cannot be leaked, hacked, subpoenaed or demanded.**

## Routes

| Route | What it is | Indexable |
|---|---|---|
| `/` | Home | yes |
| `/about`, `/our-work`, `/safety-and-privacy`, `/contact`, `/mental-health` | the content pages | yes |
| `/tea-talks` | the anonymous writing page | no |
| `/thanks` | its confirmation | no |
| `/contact/sent` | the contact confirmation | no |
| `/stories`, `/stories?page=N`, `/stories?all=1` | public stories, behind `PUBLIC_ARCHIVE` (404 when off) | no |
| `/admin`, `/admin/setup`, `/admin/passphrase` | the moderation panel | no |
| `/robots.txt` | allow-all; the Tea Talks paths are deliberately not listed | n/a |
| anything else | 404 page with the full header and quick exit | no |

"No" means both `<meta name="robots" content="noindex, nofollow">` and the `X-Robots-Tag` header.

## What is stored

Three tables in one SQLite file, and nothing about any visitor:

- `submissions`: a random 16-character `id`, `text`, `status` (`pending`, `approved`, `rejected`), `day` (`YYYY-MM-DD` UTC, no time), `lang` (the page language at submission, `en`).
- `messages` (contact form): `id`, `text`, `reply_to` (whatever the sender typed as a way to reply, or NULL), `day`. "Replied" sets `reply_to` to NULL at once; `scripts/sweep.mjs`, run daily by a systemd timer, does the same for anything older than 30 days.
- `settings`: the passphrase hash (scrypt, per-site salt) and, for at most 24 hours, the hash of a one-time setup token.

Not stored, anywhere, ever: IP addresses, user agents, headers, timestamps, cookies for visitors, request logs. See `src/lib/db.ts`.

## Layout

```
src/
  content/copy.ts        Shared words: navigation, Tea Talks page, stories, panel labels, demo samples.
  content/pages.ts       The collective's words for the six content pages, verbatim. Nothing outside src/content/ holds copy.
  middleware.ts          Security headers and X-Robots-Tag on every response, CSRF check, error catch.
  lib/config.ts          Environment variables (PUBLIC_ARCHIVE, DB_PATH, QUICK_EXIT_URL, CONTACT_EMAIL, DEMO_MODE).
  lib/store.ts           The one door to data: loads db.ts (SQLite) or demo.ts (samples) by DEMO_MODE.
  lib/db.ts              SQLite: three tables, idempotent migrations, hard delete.
  lib/demo.ts            Sample rows for the preview; every write is a no-op.
  lib/auth.ts            scrypt passphrase, one-time setup token, constant-time compare, in-memory sessions.
  lib/shell.ts           Header, footer and quick-exit markup, shared by the layout and the error pages.
  lib/robots.ts          Which routes carry noindex.
  layouts/Base.astro     Page shell.
  pages/                 index, about, our-work, safety-and-privacy, contact/, mental-health, tea-talks, submit, thanks,
                         stories, 404, robots.txt, admin/ (index, login, action, setup, passphrase).
public/
  site.css               Design tokens from the approved visual pass, type scale, shapes (CSS only), layout.
  quick-exit.js          Leave-quickly button, double Escape, media pause, history-free navigation on the Tea Talks pages.
  fonts/                 Albert Sans variable, self-hosted woff2 (SIL Open Font License). The only font.
server.mjs               Production entry: serves static files with the security headers, hands the rest to Astro.
security-headers.mjs     The one list of headers, used by server.mjs, the middleware and the Vercel build.
deploy/                  Caddyfile, systemd units (app, sweep service and timer), Dockerfile, DEPLOY.md, VERCEL-PREVIEW.md.
docs/                    CHECKLIST.md (definition of done), CHECKLIST-RESULTS-M2.md, MODERATION-GUIDE.md,
                         WHAT-WE-DO-NOT-COLLECT.md, VERIFICATION.md.
scripts/                 verify.mjs, a11y.mjs, copy-check.mjs, screenshots.mjs, inspect-db.mjs, setup-link.mjs, sweep.mjs.
```

## Run it locally

```bash
npm install
npm run build
PUBLIC_ARCHIVE=true DB_PATH=./data/tea-talks.sqlite npm start      # http://127.0.0.1:4321
```

Then, to be able to sign in to `/admin`:

```bash
DB_PATH=./data/tea-talks.sqlite node scripts/setup-link.mjs          # prints a one-time link; open it, choose a passphrase
```

Checks, against the running server:

```bash
npm run verify                                     # headers, cookies, origins, noindex, static files, robots.txt
npm run copy-check                                 # rendered text against src/content/
PLAYWRIGHT_CHROMIUM=/path/to/chromium npm run a11y # axe-core at 390 and 1280 (or npx playwright install chromium)
node scripts/inspect-db.mjs ./data/tea-talks.sqlite
```

For the preview that stores nothing: `DEMO_MODE=true ADMIN_PASSWORD=anything npm start`.

## Configuration

| Variable | Meaning | Default |
|----------|---------|---------|
| `PUBLIC_ARCHIVE` | `true` shows approved stories at `/stories`; `false` makes that URL a 404. | `false` (`true` in demo mode) |
| `DB_PATH` | SQLite file location. | `./data/tea-talks.sqlite` |
| `QUICK_EXIT_URL` | Where "Leave quickly" goes. | `https://www.google.com/` |
| `CONTACT_EMAIL` | Optional address shown under the contact form. Unset means the block is not rendered. | unset |
| `DEMO_MODE` | `true` makes a preview that stores nothing (see `deploy/VERCEL-PREVIEW.md`). | `false` (`true` in a Vercel build) |
| `ADMIN_PASSWORD` | **Demo mode only.** The real site has no such variable; the passphrase is set through the setup link. | unset |
| `HOST`, `PORT` | Bind address. Keep on localhost behind Caddy. | `127.0.0.1`, `4321` |
| `DEPLOY_TARGET` | Build-time only. `vercel` selects the Vercel adapter. | node |

Changing any of these is a restart, not a rebuild.

## Privacy design, in short

- **Headers on every response**, static files and error pages included: `Content-Security-Policy` with `'self'` only (no `'unsafe-inline'`; `connect-src 'self'` because the story form is sent in the background to the same origin, no other origin is reachable), `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Cache-Control: no-store` on pages. Caddy repeats the set at the edge.
- **No logging**: one line at startup, errors without request data. Caddy's access log is `discard`; Caddy strips `X-Forwarded-For`, `X-Real-IP` and `Forwarded`. The firewall logs nothing; there is no fail2ban.
- **Cookies**: none on public pages. The admin cookie is `Path=/admin; HttpOnly; Secure; SameSite=Strict` with no expiry; the session lives in memory and ends after 30 minutes without activity.
- **Passphrase**: chosen by the collective through a one-time link, stored as a scrypt hash, changeable in the panel. Login compares in constant time, takes a fixed 500 ms whatever the result, and counts and logs nothing.
- **CSRF**: `Sec-Fetch-Site` is the primary signal; `Origin` against `Host` is the fallback.
- **Spam**: a honeypot field with a meaningless name on both forms. No rate limiting, because rate limiting needs to know who is asking.
- **Deletion**: `DELETE FROM`, with `secure_delete=ON`, `journal_mode=DELETE`, `auto_vacuum=FULL`. Editing a story replaces its text; no copy of the original is kept.
- **Quick exit**: one tap, or Escape twice within a second; pauses media, clears fields, `location.replace` to the exit site. On the Tea Talks pages every internal link also uses `replace`, so a visit is one history entry.
- **No images, no third parties**: the shapes are CSS, the two icons are inline SVG, the font is self-hosted.
- **Copy**: every word the collective wrote lives in `src/content/` and `scripts/copy-check.mjs` fails if a page shows anything else.

## Documents

- `docs/CHECKLIST.md`: every promise, by milestone. `docs/CHECKLIST-RESULTS-M2.md`: the results for this milestone.
- `docs/VERIFICATION.md`: what to run and what to see.
- `docs/MODERATION-GUIDE.md`: for the person reading stories and messages.
- `docs/WHAT-WE-DO-NOT-COLLECT.md`: the one-page note for the community.
- `deploy/DEPLOY.md`: a fresh Ubuntu 24.04 server at 1984 Hosting, start to finish.
- `deploy/VERCEL-PREVIEW.md`: the temporary preview that stores nothing.
