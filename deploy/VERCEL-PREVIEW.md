# Temporary preview on Vercel (DEMO_MODE)

For showing the client the pages. Not for real use. The real site runs on the
collective's own server with SQLite, per `deploy/DEPLOY.md`.

## What DEMO_MODE=true does

- The story form works, but submitting stores nothing. It redirects to the
  confirmation page as usual. No database is opened, no file is written.
- The public stories page shows three generic sample stories from `src/copy.ts`.
- The moderation panel accepts `ADMIN_PASSWORD` and shows two sample waiting
  stories. Approve, Delete and Unpublish do nothing that lasts: the samples are
  rebuilt from the copy file on every request.
- A calm banner under the header on every page says that nothing is saved.
- The `better-sqlite3` module is never imported. Pages reach stories only through
  `src/lib/store.ts`, which in demo mode loads `src/lib/demo.ts` and never `src/lib/db.ts`.

With `DEMO_MODE` unset or `false`, nothing changes from the normal behaviour on the VPS build. A build made with `npm run build:vercel` defaults to demo mode when the variable is unset, because a Vercel deployment has no writable disk and must never run the SQLite path; setting `DEMO_MODE=false` there is not supported.

`vercel.json` in the repo sets the framework and the build command, so a project imported from the repository needs no manual build settings.

## Can anything persist in demo mode?

No. These are the only places the app can write, and what each does in demo mode:

| Write path | Normal mode | Demo mode |
|------------|-------------|-----------|
| Story submission (`/submit`) | `INSERT` into SQLite | no-op; the text is discarded after validation |
| Approve / Delete / Unpublish (`/admin/action`) | `UPDATE` / `DELETE` in SQLite | no-op |
| Admin session | random token in a server-side map | nothing server-side; the cookie itself carries a signed deadline |
| Files on disk | the SQLite file at `DB_PATH` | none; the SQLite module is never loaded |
| Logs | one startup line, errors without request data | the same (Vercel adds its own platform request logs, see below) |

The one thing that leaves the app is the admin cookie: `Path=/admin; HttpOnly; Secure; SameSite=Strict`, no expiry, holding a deadline and an HMAC computed from `ADMIN_PASSWORD`. It contains nothing about the visitor.

Two things Vercel does on its own, outside the app: it keeps platform request logs (paths, status codes, IP addresses) for its dashboard, and it may inject its preview toolbar for logged-in team members. The Content-Security-Policy blocks the toolbar's script. Because of the platform logs, share the preview link only with the client, never with the community.

## Set up the Vercel project

1. Import the repository in Vercel. Framework preset: **Astro**.
2. **Build Command**: `npm run build:vercel`. (It selects the Vercel adapter and then adds the security headers to every route.) Leave Output Directory as detected.
3. **Environment variables** (Production, Preview and Development):

   | Name | Value |
   |------|-------|
   | `DEMO_MODE` | `true` |
   | `ADMIN_PASSWORD` | any preview password, e.g. from `openssl rand -base64 18`; not the real one |
   | `QUICK_EXIT_URL` | `https://www.weather.com/` or the site chosen for the region |
   | `PUBLIC_ARCHIVE` | `true` so the sample stories page is visible |

   `DB_PATH`, `HOST` and `PORT` are not needed. `DEPLOY_TARGET` is set by the build command; if you prefer `npm run build` as the command, add `DEPLOY_TARGET=vercel` as a variable instead.
4. In the project settings, keep **Web Analytics**, **Speed Insights** and the **Vercel Toolbar** off. They would try to load scripts the CSP blocks, and they are the kind of thing this site must never have.
5. Deploy. Then check it like the real site:

   ```bash
   node scripts/verify.mjs https://<your-preview>.vercel.app
   ```

   The script checks the headers on pages and static files, confirms no cookies on public pages, and that nothing references another origin.

## Taking it down

Delete the Vercel project when the client has seen it. Nothing needs exporting, because nothing was stored.
