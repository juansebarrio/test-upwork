# Temporary preview on Vercel (DEMO_MODE)

For showing the client the pages. Not for real use. The real site runs on the
collective's own server, per `deploy/DEPLOY.md`. Delete the Vercel projects after go-live.

## What DEMO_MODE=true does

- All seven pages render as on the real site, plus the Tea Talks page, its confirmation and the stories page.
- The story form and the contact form work, but submitting stores nothing. They redirect to their confirmation pages as usual. No database is opened, no file is written.
- The public stories page shows three generic sample stories from `src/content/copy.ts`.
- The moderation panel accepts `ADMIN_PASSWORD` (the preview's throwaway password; the real site has no such variable) and shows sample rows in all four tabs: two waiting, three approved, one rejected, two messages. Approve, Reject, Edit, Delete, Unpublish, Restore and Replied do nothing that lasts: the samples are rebuilt from the copy file on every request. The setup link and passphrase change are not available in the preview.
- A calm banner under the header on every page says: "Preview. Nothing written here is saved. The final site will live on the collective's own server."
- The `better-sqlite3` module is never imported. Pages reach data only through `src/lib/store.ts`, which in demo mode loads `src/lib/demo.ts` and never `src/lib/db.ts`.

With `DEMO_MODE` unset or `false`, nothing changes from the normal behaviour on the VPS build. A build made with `npm run build:vercel` defaults to demo mode when the variable is unset, because a Vercel deployment has no writable disk and must never run the SQLite path.

`vercel.json` in the repo sets the framework and the build command, so a project imported from the repository needs no manual build settings.

## Can anything persist in demo mode?

No. These are the only places the app can write, and what each does in demo mode:

| Write path | Normal mode | Demo mode |
|------------|-------------|-----------|
| Story submission (`/submit`) | `INSERT` into SQLite | no-op; the text is discarded after validation |
| Contact message (`/contact`) | `INSERT` into SQLite | no-op |
| Panel actions (`/admin/action`) | `UPDATE` / `DELETE` in SQLite | no-op |
| Passphrase setup and change | hash in the `settings` table | not available |
| Admin session | random token in a server-side map | nothing server-side; the cookie itself carries a signed deadline |
| Files on disk | the SQLite file at `DB_PATH` | none; the SQLite module is never loaded |
| Logs | one startup line, errors without request data | the same (Vercel adds its own platform request logs, see below) |

The one thing that leaves the app is the admin cookie: `Path=/admin; HttpOnly; Secure; SameSite=Strict`, no expiry, holding a deadline and an HMAC computed from `ADMIN_PASSWORD`. It contains nothing about the visitor.

Two things Vercel does on its own, outside the app: it keeps platform request logs (paths, status codes, IP addresses) for its dashboard, and it may inject its preview toolbar for logged-in team members. The Content-Security-Policy blocks the toolbar's script. Because of the platform logs, share the preview link only with the client, never with the community.

## Set up the Vercel project

1. Import the repository in Vercel. Framework preset: **Astro**.
2. **Build Command**: `npm run build:vercel` (also set by `vercel.json`). Leave Output Directory as detected.
3. **Environment variables** (Production, Preview and Development):

   | Name | Value |
   |------|-------|
   | `DEMO_MODE` | `true` (already the default in a Vercel build) |
   | `ADMIN_PASSWORD` | any preview password, e.g. from `openssl rand -base64 18`; not the real passphrase |
   | `QUICK_EXIT_URL` | `https://www.weather.com/` or the site chosen for the region |
   | `PUBLIC_ARCHIVE` | `true` (already the default in demo mode; set `false` to hide the sample stories page) |

   `DB_PATH`, `HOST`, `PORT` and `CONTACT_EMAIL` are not needed.
4. In the project settings, keep **Web Analytics**, **Speed Insights** and the **Vercel Toolbar** off. They would try to load scripts the CSP blocks, and they are the kind of thing this site must never have.
5. Deploy. Then check it like the real site:

   ```bash
   node scripts/verify.mjs https://<your-preview>.vercel.app
   ```

## Taking it down

Delete the Vercel project (and the earlier test project) when the client has seen it and the real site is live. Nothing needs exporting, because nothing was stored.
