# Checklist results · M2 (local build, 3 November 2026)

Every row of `docs/CHECKLIST.md` marked M2, with the result on the built site and the
evidence. "Pass" means the check ran on the local build in normal mode (SQLite) and, where
it applies, in demo mode. Rows that can only pass on the real server or need the
collective's input are marked **pending server** or **pending collective**, never skipped.

How the evidence was produced: `npm run build`, then `PUBLIC_ARCHIVE=true DB_PATH=./data/t.sqlite npm start`,
`node scripts/setup-link.mjs`, 45 approved sample stories plus one waiting story and one message seeded
through the forms, then the scripts and the commands below. Demo mode: `DEMO_MODE=true ADMIN_PASSWORD=preview-pass npm start`.

## A · What is stored

| # | Result | Evidence |
|---|---|---|
| A1 | Pass | `PRAGMA table_info(submissions)` → `id, text, status, day, lang`, nothing else (`scripts/inspect-db.mjs`). `status` has a CHECK on pending/approved/rejected, `day` a CHECK on length 10. |
| A2 | Pass | `grep -rn "remoteAddress\|x-forwarded" src/` → one line, `src/middleware.ts` reading `x-forwarded-host` for the CSRF comparison only; nothing writes it. inspect-db after a full flow (story, edit, approve, reject, restore, message, replied, delete) shows only the five and four columns. |
| A3 | Pass | Rejected a story; `GET /stories`, `?page=2`, `?page=3`, `?all=1` never contain it; DB shows `status = rejected`. `listApprovedPage` selects `status = 'approved'` only. |
| A4 | Pass | `PRAGMA secure_delete` = 1 and `journal_mode` = delete set at open; story with phrase `beta-222` deleted in the panel; `strings data/t.sqlite \| grep -c beta-222` → 0; `ls data/*-wal` → none. |
| A5 | Pass | `grep -rn "DELETE FROM submissions" src scripts` → only `src/lib/db.ts`, called from `src/pages/admin/action.ts`. The only timer (`tea-talks-sweep`) runs `scripts/sweep.mjs`, which touches `messages.reply_to` only. |
| A6 | Pass | `PRAGMA table_info(messages)` → `id, text, reply_to, day`. |
| A7 | Pass | Message with reply `reply-address-delta-444`; pressed Replied; inspect-db → `reply_to: null`; `strings data/t.sqlite \| grep -c delta-444` → 0; the text stayed. |
| A8 | Pass (script) · pending server (timer) | Row dated 2026-09-01 inserted; `node scripts/sweep.mjs` → "1 reply address(es) erased", field NULL, a row dated 2026-11-01 untouched. `deploy/tea-talks-sweep.timer` (daily) is written; `systemctl start tea-talks-sweep.service` runs on the server. |
| A9 | Pass | After every flow above the server output is exactly `[tea-talks] listening on http://127.0.0.1:4321`. `journalctl` itself: pending server. |
| A10 | Pass (config) · pending server | `deploy/Caddyfile`: `log { output discard }`, `header_up -X-Forwarded-For`, `-X-Real-IP`, `-Forwarded`. The app never reads `X-Forwarded-For`; sending it changes nothing in the log. Confirming on the live server is pending. |
| A11 | Pending server | `deploy/DEPLOY.md` step 3: `ufw logging off`, and "do not install fail2ban". To confirm with `ufw status verbose` and `dpkg -l` on the server. |

## B · Headers, cookies, external requests

| # | Result | Evidence |
|---|---|---|
| B1 | Pass, with one deliberate difference | `node scripts/verify.mjs` → all checks passed on 20 routes (pages, panel, 403, 404, static files, robots.txt). CSP on every response: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'`, no `unsafe-inline`. **`connect-src` is `'self'`, not `'none'`**: the story form posts in the background so the confirmation can replace the page and keep one history entry (C3). Same-origin only; every other origin is still blocked. |
| B2 | Pass | verify.mjs checks `referrer-policy: no-referrer`, HSTS, `nosniff`, `x-frame-options: DENY`, `permissions-policy`, and `cache-control: no-store` on every page. `deploy/Caddyfile` repeats the full set at the edge. |
| B3 | Pass | verify.mjs: no `Set-Cookie` on any of the 15 public routes; Chromium context after visiting every page: `cookies: 0`. |
| B4 | Pass | `curl -i` on login → `Set-Cookie: tt_admin=…; Path=/admin; HttpOnly; Secure; SameSite=Strict`, no `Expires`, no `Max-Age`. |
| B5 | Pass | Chromium network log over every page: origins requested = the site only. verify.mjs: no other origin in HTML or CSS; fonts `url('/fonts/…woff2')`. |
| B6 | Pass | verify.mjs walks the full route list (`scripts/routes.mjs`), panel and error pages included. |

## C · Quick exit

| # | Result | Evidence |
|---|---|---|
| C1 | Pass | verify.mjs asserts `data-quick-exit` and the site header on every route, including `/admin`, `/nothing-here` (404) and the 403 page (`scripts/verify.mjs`, "quick-exit control present"). The 500 page uses the same `barePage()` shell as the 403. |
| C2 | Pass | `scripts/quick-exit-check.mjs`: single Escape → still on `/tea-talks`, text kept; key held down (repeat events) → still on `/tea-talks`; two Escapes within a second → the exit site. |
| C3 | Pass | Same script: `history.length` is the same number from arrival through submit, confirmation and exit (3 in the run: blank tab, the page before the site, the site), i.e. one entry for the whole visit; title "Google"; Back lands on the page before the site ("news"). Fields cleared in `clearText()`. |
| C4 | Pass (script) · W2 real media | `public/quick-exit.js` pauses every `<audio>` and `<video>` before leaving; verify.mjs fails any media element without `preload="none"` and `disablepictureinpicture` or with `autoplay`. No media is rendered in M2. |
| C5 | Pass | Same script with JavaScript off: the pill navigates to the exit site; the story form posts and lands on `/thanks`. |
| C6 | Pass | The collective chose Google's homepage. Default `https://www.google.com/` (with the www, so no redirect on the way out) in `src/lib/config.ts`, `.env.example`, `deploy/DEPLOY.md` and the Vercel preview; the exit uses `location.replace` under `Referrer-Policy: no-referrer` and `rel="noreferrer"`, so the destination receives no referrer. |

## D · Moderation panel

| # | Result | Evidence |
|---|---|---|
| D1 | Pass (four tabs, as agreed) | Clicked through: Approve → `approved`; Reject → `rejected`; Restore → `pending`; Unpublish → `pending`; Delete → row gone. Counts shown on every tab. |
| D2 | Pass | A3. |
| D3 | Pass | Story with phrase `alpha-111` edited to `epsilon-555`, approved; `strings` finds `epsilon-555` and not `alpha-111`. |
| D4 | Pass | `node scripts/setup-link.mjs` printed one link; opening it twice: 200 then, after saving, 404. `settings` holds `scrypt$32768$8$1$<salt>$<hash>`, never plaintext. Changed from the panel (`/admin/passphrase`), logged in again with the new one. Wrong current passphrase refused. |
| D5 | Pass | `curl` timing: wrong 0.504 s, right 0.503 s. Comparison through `timingSafeEqual`; no counter, no log line. |
| D6 | Pass | Sliding 30-minute window proven in the previous milestone with a 3-second test build; code unchanged (`isSignedIn` extends the deadline). Logout clears the cookie (`tt_admin=deleted`). Log out visible at the end of the tab row. |
| D7 | Pass (draft) | `docs/MODERATION-GUIDE.md` rewritten: four tabs, every action, edit before approve and the original being gone, the removal-request procedure, Messages and Replied, the habits, the promises. M3 final. |

## E · Public stories page

| # | Result | Evidence |
|---|---|---|
| E1 | Pass | `PUBLIC_ARCHIVE` unset → `/stories` 404 with the same page as `/nothing-here`; `true` → 200. |
| E2 | Pass | 45 approved: `/stories` 20, `?page=2` 20, `?page=3` 5; page 1 shows "Older stories" only, page 3 "Newer stories" only; links are plain anchors (work with JS off, confirmed in the no-JS context). |
| E3 | Pass | Page source shows `<div class="story-when">September 2026</div>`; `monthYear()` never prints a day. |
| E4 | Pass (mark) · L (local page) | Every story has `lang` (`en` in M2) and `<li lang="en">`; the English page shows `Showing stories in English. Show all.` linking to `?all=1`. |
| E5 | Pass | A3. |

## F · Search engines

| # | Result | Evidence |
|---|---|---|
| F1 | Pass | verify.mjs asserts no `X-Robots-Tag` and no robots meta on `/`, `/about`, `/our-work`, `/safety-and-privacy`, `/contact`, `/contact/sent`, `/mental-health`. `/robots.txt` is allow-all. |
| F2 | Pass | `/tea-talks`, `/thanks`, `/stories`, `/stories?page=2`, `/stories?all=1` carry `X-Robots-Tag: noindex, nofollow` and `<meta name="robots" content="noindex, nofollow">`. Also kept on `/admin/*` and on every error response (an existing privacy property, see "Differences" below). |
| F3 | Pass | `/robots.txt` → `User-agent: *` / `Disallow:`; verify.mjs asserts none of the paths is listed. |
| F6 | Pass | "When someone asks for a story to be taken down" in `docs/MODERATION-GUIDE.md`. |

## G · Contact

| # | Result | Evidence |
|---|---|---|
| G1 | Pass | A6; a sent message stored as `{ text, reply_to, day }` only. |
| G2 | Pass | verify.mjs on `/contact` and `/contact/sent`; honeypot `x9f3a` filled → 303 to `/contact/sent` and `messages` count unchanged. |
| G3 | Pass | `/contact/sent` renders the two content lines only; the message is never in the page or its source. |
| G4 | Pending collective | `CONTACT_EMAIL` unset: the block is not rendered (page source has no `mailto:`). It renders only when the variable is set. |

## H · Pages and copy

| # | Result | Evidence |
|---|---|---|
| H1 | Pass | 36 screenshots per mode (every route at 390 and 1280) in the delivery; header, pill and footer come from one `src/lib/shell.ts` so they are identical by construction. The language switcher slot renders only with more than one language. |
| H2 | Pass | `node --experimental-strip-types scripts/copy-check.mjs` → "Copy matches src/content/ on every page" in normal and demo mode: every string of `src/content/` for a page is on it verbatim, and every visible text node comes from `src/content/`. |
| H3 | Pass | verify.mjs: `site.css` contains only `#f4ecdf #fcf8f1 #3a2a20 #a9502b #8f5a0c`; one `@font-face` family, two woff2 files; the held line is rendered on Home only (`.held` used in `src/pages/index.astro` alone); shapes are pseudo-elements, at most two per screen (see the design notes below). |
| H4 | Pass | Screenshots `home-1280.png` (paper band after the welcome, variant B) and `home-390.png` (card after the vignettes, before the welcome, variant C); one DOM block, CSS `order`. |
| H5 | Pass | Both headings and paragraphs on `/safety-and-privacy`; copy-check asserts them. |
| H6 | Pass | `grep -rni "ethiopia\|addis\|horn of africa" src/ \| grep -v content/` → empty; the same grep over `public scripts deploy server.mjs security-headers.mjs README.md docs/*` → empty (the only hit outside `src/content/` is the K8 row of the checklist itself). |
| H7 | Pass | `find public src -name "*.png" -o -name "*.jpg" -o -name "*.svg"` → empty; the two inline SVGs (Lucide log-out, arrow-right) live in `src/lib/shell.ts`. The favicon file was removed. |
| H8 | Pending collective | `/thanks` shows the current two lines from `copy.thanks` (one place to swap) and never the text sent (checked after a submit). |

## I · Accessibility

| # | Result | Evidence |
|---|---|---|
| I1 | Pass | `node scripts/a11y.mjs` (axe-core, WCAG 2.1 AA + best practice) → no violations on 16 routes at 390 and 1280, normal and demo mode. Contrast: amber `#8F5A0C` on cream 4.9:1, on paper 5.5:1; ink on cream 12:1; paper on terracotta 5.7:1; the helper tone (ink at 70%) 6.8:1 on cream. |
| I2 | Pass | `:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px }` on everything; tabbed through in Chromium. |
| I3 | Pass | Every action is a form button or a link; moderation and submission done with the keyboard in the browser pass. |
| I4 | Pass | axe: landmarks (header, nav, main, footer), labels on every field, one `h1` per page, `lang="en"` on `<html>`. |
| I5 | Pass | `/thanks` and `/contact/sent`: the heading has `tabindex="-1"` and receives focus on load (`quick-exit-check.mjs` reports `focused heading: confirmation`); the section is `aria-live="polite"`. |
| I6 | Pending collective (round 2) | VoiceOver and TalkBack passes need the devices. |
| I7 | Pass | Pill 44 px, buttons 56/60 px, panel buttons 44 px, nav and footer links `min-height: 44px`, door rows 56 px. |
| I8 | Pass | `@media (prefers-reduced-motion: reduce) { transition: none }`; transitions are on colour (and the focus border colour) only, 200 ms. |

## K · Server and hosting

All pending server, by definition. What M2 delivers for them: `deploy/DEPLOY.md` rewritten for 1984 Hosting (K1–K9, K11, K12 steps), `deploy/Caddyfile` (K4), `deploy/tea-talks.service` with `ProtectSystem=strict`, `NoNewPrivileges`, empty `CapabilityBoundingSet`, bound to `127.0.0.1:4321` (K5), the ufw and sshd steps (K6, K7), the setup-link procedure (K12), the Vercel deletion step (K10). The collective's key file `deploy/collective.pub` is in the repository (fingerprint `SHA256:ZjrsBaDvO5lZRItROMURKN7vN+aOFwzD8E11O027WE8`); the guide checks the fingerprint before and after copying it into `authorized_keys`.

## O · Process

| # | Result | Evidence |
|---|---|---|
| O1 | Pass | This file. |
| O3 | Pending collective | The honeypot name is autofill-proof by construction (`x9f3a`, `autocomplete=off`, password-manager ignore attributes); the phone test is in `docs/VERIFICATION.md` §7. |
| O4 | Pending collective (round 2) | The screens to open: Home, Tea Talks, the confirmation, Stories, Contact, and the panel. |

## Differences from the prompt, kept on purpose

- **`connect-src 'self'` instead of `'none'`** (B1): needed for the background submit that keeps one history entry on the Tea Talks pages. Still same-origin only.
- **`/admin/*` and error responses stay `noindex`**: the prompt says only the Tea Talks routes carry it. Keeping the panel and the 403/404/500 pages out of search is an existing privacy property, so it stays; `scripts/verify.mjs` asserts this exact set and the six content pages plus `/contact/sent` and `/robots.txt` are indexable.
- **Four tabs** (D1 says three): Messages added as the prompt asks.

## Design notes

- The paper disc inside the Home band is drawn in cream, because a paper disc on a paper band is invisible. Elsewhere discs are paper on cream, as specified.
- Shapes are positioned from the viewport edge so they sit in the margins or are cut by the edge, never behind body text; on phones they shrink to 60% and move to the edge.

## Could not make pass here

Nothing in the M2 rows fails on the local build. The rows above marked pending need the real server (A8 timer, A9 journal, A10, A11, K-section), or the collective's input (G4 email decision, H8 confirmation lines, I6 and O4 device passes, O3 phone autofill test).
