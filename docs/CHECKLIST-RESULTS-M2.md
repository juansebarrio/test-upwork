# Verification checklist · Milestone 2 results, first run

Branch `site-m2`, commit `95eee1f`, run on 2026-11-04.

**Summary: 51 pass · 1 fail · 3 pending (device) · 17 pending (server or collective) · 2 not run.**

How this run was made: the production build (`npm run build`) was started on this machine with a brand-new, empty database in a temporary folder, `DEMO_MODE` unset, `PUBLIC_ARCHIVE=true` and `QUICK_EXIT_URL=https://www.google.com/`. Every row below was checked against that running site, with the command or browser action its "How to verify" cell names. Browser actions used headless Chromium (Playwright) at 390 and 1280 pixels wide. Rows that also concern the preview build were run a second time with `npm run build:vercel` and `DEMO_MODE=true`; both results are given. Nothing was fixed during the run. "The local test address" below means the address of the test server on this machine.

Results are one of: **pass**, **fail**, **pending: device**, **pending: server**, **pending: collective**, **not run**. The Promise column is for the collective; the Evidence column is for the developer.

## A · What is stored

| # | Promise | Result | Evidence |
|---|---|---|---|
| A1 | The stories table holds only a random 16-character id, the text, the status, the day (no time) and the language. | pass | `node scripts/inspect-db.mjs` on the fresh database, then `PRAGMA table_info(submissions)` → `id TEXT, text TEXT, status TEXT, day TEXT, lang TEXT`. Status is constrained to pending / approved / rejected; day is constrained to 10 characters (YYYY-MM-DD). A stored row read back: `status: 'pending', day: '2026-11-04', lang: 'en'`, and the 16-character id. |
| A2 | No time of day, no IP address, no browser details, no request headers are ever written. | pass | `grep -rn "headers\|remoteAddress\|x-forwarded" src/` → 13 lines, all in `src/middleware.ts` (setting response headers; reading `Sec-Fetch-Site`, `Origin` and `Host` only to refuse cross-site posts) and `src/pages/robots.txt.ts` (a response header). Nothing in `src/lib/db.ts` or the store touches a request. inspect-db after the full flow (4 stories, 3 messages, every panel action): rows show only the five columns above. |
| A3 | Rejected stories are kept apart and never shown on the public page. | pass | Story containing `harbor-quill-2204` rejected from the panel; database row reads `status: 'rejected'`; `/stories`, `/stories?page=2`, `/stories?all=1` → `harbor-quill present: 0` on each, while the approved story (`copper-fern`) is present: 1. Repeated with 6 rejected rows among 48: `rejected seed on any page: 0`. |
| A4 | Deleting really erases: the bytes are overwritten, no journal copy survives. | pass | `journal_mode = delete`, `auto_vacuum = 1 (full)`; the app sets `secure_delete = ON` on every connection (`src/lib/db.ts`). Story with `lantern-ember-7731`: `strings … \| grep -c` → 1 before Delete, **0 after**; `rows with that id: 0`; files in the data folder: `tea-talks.sqlite` only (no `-wal`, no `-journal`). |
| A5 | Stories never expire on their own. | pass | `grep -rn "DELETE FROM submissions" src/ scripts/ deploy/` → one line, `src/lib/db.ts:74` (the statement the panel's Delete uses). The only timer (`deploy/tea-talks-sweep.timer`, `OnCalendar=daily`) runs `scripts/sweep.mjs`, which touches `messages.reply_to` only. |
| A6 | The contact table holds only an id, the text, an optional way to reply, and the day. | pass | `PRAGMA table_info(messages)` → `id TEXT, text TEXT, reply_to TEXT, day TEXT`. |
| A7 | Pressing "Replied" erases the reply address at once; the message text stays. | pass | Message sent with reply `reply-address-delta-444@example.net`; `strings \| grep -c delta-444` → 1. Pressed Replied → row reads `reply_to: null, text: "second message, please w…"`; `strings \| grep -c delta-444` → **0**. |
| A8 | A reply address not marked within 30 days is erased automatically. | not run | The cell names `systemctl start tea-talks-sweep.service`, which only exists on the real server. Equivalent run here: inserted one message dated 31 days ago and one dated today, both with a reply address; `node scripts/sweep.mjs` (the exact command the service runs) → `sweep: 1 reply address(es) erased`; the old row reads `reply_to: null`, the fresh one keeps its address; `strings \| grep -c sierra-313` → 0. To close on the server: `systemctl start tea-talks-sweep.service` on a 31-day-old test row, then inspect-db. |
| A9 | The application log holds one line at start and errors without request data. | not run | The cell names `journalctl -u tea-talks`, which only exists on the real server. Equivalent run here: the server's own output was captured for the whole run (stories, messages, honeypot posts, setup link, logins right and wrong, every panel action, a cross-site post refused with 403, a 404). Total output: `[tea-talks] listening on …` — one line, nothing else. To close on the server: `journalctl -u tea-talks` after the first hour of use. |
| A10 | The web server keeps no access log and strips the visitor's address before the app. | pending: server | `deploy/Caddyfile` carries `log { output discard }`, `admin off`, `-Server`, `header_up -X-Forwarded-For`, `-X-Real-IP`, `-Forwarded`. On the server: `curl -H "X-Forwarded-For: …"` against the real site and confirm the app output stays at its one line. |
| A11 | Firewall without logs; no fail2ban. | pending: server | The guide sets `ufw logging off` and says not to install fail2ban. On the server: `ufw status verbose` shows `Logging: off`; `dpkg -l \| grep fail2ban` is empty. |

## B · Headers, cookies, external requests

| # | Promise | Result | Evidence |
|---|---|---|---|
| B1 | A strict content security policy (`default-src 'self'; connect-src 'none'; frame-ancestors 'none'`, no inline code) on every response: pages, files, 404, 403, 500. | fail | `node scripts/verify.mjs` → `All checks passed` (370 checks over 25 routes and files); `curl -I` on `/`, `/stories`, `/admin`, `/nothing-here` and the font file all return `content-security-policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'`, no `unsafe-inline`. The policy is on every response, but **`connect-src` is `'self'`, not `'none'`** as the promise is written. See "Failures and what they mean". |
| B2 | No referrer, HSTS, nosniff, no framing, Permissions-Policy, no caching of pages. | pass | `curl -I /` → `referrer-policy: no-referrer`, `strict-transport-security: max-age=31536000; includeSubDomains`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`, `cache-control: no-store`. verify.mjs asserts the set on all 25 routes and files. `deploy/Caddyfile` lines 33–40 repeat the same eight headers at the edge. |
| B3 | Zero cookies on every public page. | pass | `curl -I` on 14 public routes (`/`, about, our-work, safety-and-privacy, contact, contact/sent, mental-health, tea-talks, thanks, stories ×3, robots.txt, a 404) → `set-cookie lines: 0` on every one. Chromium after visiting every page: `cookies in the browser: 0`; after the whole quick-exit flow: `cookies: 0`. |
| B4 | The panel cookie is limited to `/admin`, invisible to scripts, HTTPS-only, strict, and ends with the browser. | pass | `curl -i` on a correct login → `HTTP/1.1 303`, `set-cookie: tt_admin=…; Path=/admin; HttpOnly; Secure; SameSite=Strict`. No `Expires`, no `Max-Age`. |
| B5 | No request ever leaves the site: fonts self-hosted, no CDN, analytics, captcha or embeds. | pass | Chromium network log on all 14 routes (public pages, stories pages, 404, panel): `all origins observed across 14 pages:` the site's own origin only. verify.mjs: `no external references in HTML (quick exit link → https://www.google.com/ is the only one)` on every page; fonts served from `/fonts/…woff2` with the full header set. |
| B6 | B1–B5 hold on all seven pages and the panel. | pass | Production build: `node scripts/verify.mjs` → `All checks passed` over the full route list (7 pages, contact/sent, thanks, 3 stories pages, panel ×3, 403, 404, 5 static files, robots.txt). Preview build: `npm run build:vercel` → `added 8 security headers to every Vercel route` (the Vercel config carries the same 9 header names on a catch-all route); the Node build with `DEMO_MODE=true` → `All checks passed` on the same route list. The live preview, fetched the same day at this commit, returned the full header set on `/about` and `/contact/sent`. |

## C · Quick exit

| # | Promise | Result | Evidence |
|---|---|---|---|
| C1 | The "Leave quickly" pill is on every page, the panel and the error pages. | pass | `curl` + grep for `data-quick-exit`: 404 page → `pill=1 header=1`; cross-site POST refused with `status=403 pill=1`; panel sign-in screen `pill=1`; verify.mjs asserts `quick-exit control present` on all 25 routes; Chromium `pill=true` on all 14 routes at 390 and 1280. The 500 page could not be provoked on a healthy build; it is produced by the same function as the 403 page (`src/middleware.ts`), which was observed. 36 screenshots per width taken for the visual pass. |
| C2 | Escape twice within a second leaves; one Escape does nothing; a held key does not count. | pass | `scripts/quick-exit-check.mjs`: `single Escape: url /tea-talks \| text kept "draft words"`; `held key (repeat events): url /tea-talks`; `double Escape -> https://www.google.com/`. |
| C3 | On exit the fields are cleared, the tab title changes, the page is replaced (not added to history), and Back does not return. | pass | Same script: `history 3 (was 3)` from arrival through submit, confirmation and exit, i.e. the whole visit occupies one entry (the test tab held a blank page and a "news" page before the site, hence 3); `title Google`; `Back lands on: news`; from the About page `history 2 (was 2)`. The exit uses `location.replace`; a separate probe showed the destination receives no `Referer` and no `Origin` on all three exit paths. |
| C4 | The exit pauses every audio and video first; players cannot pop out. | pass | Chromium with a 5-second audio clip injected and playing on About (`paused: false, currentTime 0.23`); pill pressed → event recorded by the page before it left: `audio paused by the page script at 0.29 s, title now "Google"`; then `landed on https://www.google.com/`. No media element exists in M2; verify.mjs fails any `<audio>`/`<video>` without `preload="none"` and `disablepictureinpicture`, or with `autoplay`. Real media is W2. |
| C5 | Works with JavaScript off: the pill is a plain link. | pass | Same script, JavaScript disabled: `JS off: pill is a plain link -> https://www.google.com/`; `JS off: form posts and lands on /thanks`. |
| C6 | The exit destination is the site the collective chose. | pending: server | The collective chose Google's homepage; the default in the code, `.env.example` and the guide is `https://www.google.com/` (with the www, so no redirect on the way out). On the server: read `QUICK_EXIT_URL` in the env file and press the pill on the live site. |

## D · Moderation panel

| # | Promise | Result | Evidence |
|---|---|---|---|
| D1 | Tabs Waiting, Approved, Rejected (and Messages), each with a count; Approve, Reject, Delete, Unpublish, Restore. | pass | Panel with the cookie: `Waiting 1 \| Approved 41 \| Rejected 6 \| Messages 5`. Buttons and links per tab: waiting → Approve, Reject, Edit, Delete; approved → Unpublish, Delete; rejected → Restore, Delete; messages → Replied, Delete; Log out on every tab; Delete opens an inline `Yes, delete it`. Each action posted and the row read back: approve → `approved`; reject → `rejected`; unpublish → `pending`; restore → `pending`; delete → row gone (A4). A fourth tab, Messages, was added in this milestone for the contact form. |
| D2 | Rejected stories never reach the public page. | pass | A3. |
| D3 | Editing before approval replaces the text; nothing of the original remains. | pass | Story `original-phrase-vellum-5519` edited to `replaced-phrase-marigold-6630`, Save, then Approve: `strings \| grep -c marigold-6630` → 1; `strings \| grep -c vellum-5519` → **0**. |
| D4 | The passphrase is set by the collective through a one-time link, stored only as a hash, changeable in the panel; the link dies after use. | pass | `node scripts/setup-link.mjs` printed one link; `GET` it → 200; posted a passphrase → 303 to the panel; `GET` the same link again → **404**. Settings table: `passphrase = scrypt$32768$8$1$<salt>$<hash>` (178 characters, no plaintext). `/admin/passphrase` is the change form (current + new); a change from the panel followed by a fresh login was exercised in the previous run of this branch. |
| D5 | Login takes the same time whether right or wrong (about half a second); nothing counted, nothing logged. | pass | `curl -w %{time_total}`: wrong passphrase → `303 in 0.504 s`; right passphrase → `303 in 0.503 s`. Server output after both: still the one startup line (A9). No counter exists in the database (settings holds only `passphrase`). |
| D6 | The session ends after 30 minutes without activity, sliding; Log out is always visible. | pass | Test build with the window shortened to 5 seconds, on a second port: `t+0s panel shown: 1`, `t+3s panel shown: 1`, `t+6s (3 s after last activity) panel shown: 1` (the window slid), `t+13s (7 s idle) panel shown: 0; login form shown: 1`. Log out → `set-cookie: tt_admin=…; Path=/admin; Expires=Thu, 01 Jan 1970 …` and the old cookie no longer opens the panel. "Log out" button present on all four tabs. |
| D7 | The moderation guide describes the panel as it is. | pass | Read-through of `docs/MODERATION-GUIDE.md` against the panel: sections "The buttons", "Editing before approving", "When someone asks for a story to be taken down", "Things that keep everyone safer"; every button name on the panel (Approve, Reject, Delete, Unpublish, Restore, Edit, Replied, Log out) appears in the guide; "screenshot" and copying stories into chats are each addressed. Draft in M2, final in M3. |

## E · Public stories page

| # | Promise | Result | Evidence |
|---|---|---|---|
| E1 | The page exists only when switched on; off, it is a 404 identical to any missing page. | pass | Server started with `PUBLIC_ARCHIVE` unset: `/stories -> 404`, `/nothing-here -> 404`, `bodies identical: yes`. With `PUBLIC_ARCHIVE=true`: `/stories responds 200`. |
| E2 | 20 per page, newest first, Older / Newer links, no infinite scroll, works without JavaScript. | pass | 42 approved stories with days spread over five months: `/stories 20 stories, older-link: 1, newer-link: 0`; `?page=2 20 stories, older 1, newer 1`; `?page=3 2 stories, older 0, newer 1`. First story on page 1 is dated November 2026, the newest day in the database; page 3 ends in June 2026, the oldest. JavaScript off at 390: page 1 → 20, Older → `?page=2` 20, Older → `?page=3` 2, Newer → back to 20; the only script on the page is the quick-exit one. Note: a page number past the end (`?page=4`) shows the last page again rather than an error. |
| E3 | Month and year only, never a full date. | pass | Page source: `story-when` values on page 1 are `November 2026; October 2026; September 2026`; `grep -c` for a `YYYY-MM-DD` pattern in the page → 0. |
| E4 | Every story carries a language mark; the English page shows English stories with a visible "Show all". | pass | Page 1: `20 × lang="en"` on the story items; text `Showing stories in English.` with the link `Show all.` to `/stories?all=1` (200). The local-language page is L. |
| E5 | Pending and rejected never appear. | pass | A3; the Waiting story `vermilion-9393` was absent from `/stories` until approved, present after. |

## F · Search engines

| # | Promise | Result | Evidence |
|---|---|---|---|
| F1 | Home, About, Our Work, Safety and Privacy, Contact and Mental Health can be indexed. | pass | `curl -I` + page source on the six: `X-Robots-Tag: (none)`, `meta robots: (none)` on each. `/robots.txt` → `User-agent: *` / `Disallow:` (allow all). |
| F2 | Tea Talks, the stories pages and the confirmations are kept out of search engines. | pass | `/tea-talks`, `/thanks`, `/stories`, `/stories?page=2`, `/stories?all=1`, `/contact/sent` → `X-Robots-Tag: noindex, nofollow` and `<meta name="robots" content="noindex, nofollow">` on each. The panel and the 404 page carry the same. The podcast feed is W2. |
| F3 | Those paths are deliberately not listed in `robots.txt`. | pass | `/robots.txt` is two lines, `User-agent: *` and `Disallow:`; verify.mjs asserts none of `tea-talks`, `stories`, `thanks`, `admin` appears in it. |
| F6 | The guide explains how a removal request is handled. | pass | `docs/MODERATION-GUIDE.md`, section "When someone asks for a story to be taken down". |

## G · Contact

| # | Promise | Result | Evidence |
|---|---|---|---|
| G1 | Only the text, an optional reply field and the day are stored. | pass | A6; a sent message read back: `reply_to`, `day: '2026-11-04'` and the text, nothing else. |
| G2 | Same protections as the rest; the hidden spam field stores nothing; nothing about the sender is recorded. | pass | verify.mjs covers `/contact` and `/contact/sent` (headers, no cookie, no external reference). Honeypot filled: `POST /contact -> 303 /contact/sent` and the messages table did not grow (1 row before and after); the same on `/submit` (4 stories before and after). |
| G3 | The confirmation screen never shows the message. | pass | Sent `unique-contact-phrase-osprey-7272` → 303 to `/contact/sent`; `source contains osprey-7272: 0`; visible text: `Thank you. We will reply discreetly and protect your privacy as we protect our own.` |
| G4 | An email address appears only if the collective decides; never Gmail. | pending: collective | With `CONTACT_EMAIL` unset the page source has `mailto: count: 0`. Closes when the collective decides; then the env file and the page source are read. |

## H · Pages and copy

| # | Promise | Result | Evidence |
|---|---|---|---|
| H1 | Seven pages; header, language slot, pill and footer identical on every page. | pass | 36 screenshots at 390 and 36 at 1280 (every route, four panel tabs, sign-in) taken for the visual pass. Header and footer markup on all 14 routes, ignoring only the "current page" mark and the Tea Talks link attribute: `14 × one hash` (one single markup). `pill=true` and `switcher=false` (one language) on every route. |
| H2 | Every word on the site is the collective's text, verbatim. | pass | `scripts/copy-check.mjs` → `Copy matches src/content/ on every page` in the production build and again in the demo build (every visible text node is a string from `src/content/`, every expected string present). |
| H3 | The approved design: the five colours, Albert Sans 400/500/600, type scale, held line only on Home, at most two CSS shapes per screen. | pass | verify.mjs: `only the five palette colours (5)` in the stylesheet. Chromium: `fonts=Albert Sans` on every page; weights on visible text 400, 500, 600 (the only 700 is the screen-reader-only page heading, invisible). `held=1` on `/`, `held=0` everywhere else. Drawn shapes per page at 390 and 1280: Home 2, About 2, every other page 1 or 0. |
| H4 | Home: variant B on desktop, C on the phone. | pass | Screenshots `home-1280.png` (full-width paper band with the cream disc after the welcome text, held line with a ring, two doors) and `home-390.png` (vignettes, then the paper card, then the welcome text) looked at in the visual pass. |
| H5 | Safety and Privacy includes "What we cannot control" and "Two things that are public". | pass | Headings on the live page: `What this site keeps`, `What it never keeps`, `Leaving quickly`, `What we cannot control`, `Two things that are public`. |
| H6 | The code names no country, city or location; those words live only in the collective's content files. | pass | `grep -rni "ethiopia\|addis\|horn of africa" src/ \| grep -v content/` → empty (0 lines). |
| H7 | No image files; the only icons are two inline SVGs. | pass | `find public src -name "*.png" -o -name "*.jpg" -o -name "*.svg"` → nothing (0 files). Inline `<svg` in the source: 2, both in `src/lib/shell.ts` (log-out and arrow). |
| H8 | The Tea Talks confirmation carries the collective's lines and never the text sent. | pending: collective | The screen currently shows `Thank you for trusting us with this.` and `Write another`; after a submit the sent text is absent from the page (checked). Closes when the collective confirms or replaces the lines (one place in `src/content/copy.ts`). |

## I · Accessibility

| # | Promise | Result | Evidence |
|---|---|---|---|
| I1 | AA contrast on every text pair, including amber. | pass | `scripts/a11y.mjs` (axe-core, every route, 390 and 1280) → `No accessibility violations`. Contrast table: ink on cream 11.69:1, ink on paper 12.95:1, ink 70 % on cream 4.86:1, on paper 5.10:1, amber on cream 4.93:1, on paper 5.46:1, terracotta on cream 4.63:1, on paper 5.13:1, paper on terracotta (primary button) 5.13:1. All at or above 4.5:1. |
| I2 | A visible 2 px focus ring, 3:1 against its background, on everything focusable. | pass | Tabbed through all 14 routes at 390 and at 1280: `219 focused elements`, `distinct ring styles: 2px solid rgb(143, 90, 12) offset 2px` (one style, amber). Amber ring against cream 4.93:1, against paper 5.46:1. The ring sits 2 px outside each element, on the page background, so the same ratios apply around the terracotta button. |
| I3 | Everything works with the keyboard alone. | pass | Chromium, keyboard only: Tab to the box, type, Tab to "Share this", Enter → `/thanks`, `focused: confirmation`. Then `/admin`: Tab to the field, type the passphrase, Enter → panel with "Log out"; Tab to the Approve button of that story, Enter → `vermilion-9393 on /stories: true`. |
| I4 | Landmarks, labels, headings in order, language on every page. | pass | axe-core clean (above). `<html lang="en">` on `/`, About, Tea Talks, Stories, panel, 404 and contact/sent. One `h1` per page, labels tied to every field (the story box's label is present for screen readers and hidden visually by design). |
| I5 | After sending, the confirmation is announced. | pass | `focused heading: confirmation` after the submit (the heading has `tabindex="-1"` and receives focus on load; the section is `aria-live="polite"`); the same on `/contact/sent`. |
| I6 | Tested with VoiceOver on iPhone and TalkBack on an older Android. | pending: device | Round two, on the devices; notes go in the delivery. |
| I7 | Touch targets at least 44 px. | pass | Bounding boxes of the pill, every button, both home buttons, the doors, nav and footer links, pager links, panel tabs and the return links on all routes: `targets under 44 px tall: none` at 390 and at 1280. |
| I8 | No motion when the device asks for reduced motion; transitions on colour only. | pass | Reduced motion emulated: `transition\|animation durations across all elements on Home: 0s\|0s`. Reduced motion off: the only properties that transition are `background-color, color, border-color`. |

## K · Server and hosting

| # | Promise | Result | Evidence |
|---|---|---|---|
| K1 | Hosting in Iceland with neutral project and server names; a dedicated Proton mailbox. | pending: server | Checked in the first hour on the real server: the hosting account dashboard. |
| K2 | Paid one year in advance. | pending: server | The invoice, at go-live. |
| K3 | Provider backups and snapshots off. | pending: server | The server settings page, first hour. |
| K4 | Caddy: automatic certificates, admin API off, `Server` header removed, security headers repeated at the edge. | pending: server | `deploy/Caddyfile` is written (`admin off`, `-Server`, the eight headers, log discarded). First hour: `curl -I` on the live domain. |
| K5 | The app listens only on the local address; hardened service unit. | pending: server | `deploy/tea-talks.service` is written. First hour: `ss -ltnp` and `systemd-analyze security tea-talks`. |
| K6 | Firewall: only 22, 80, 443; logging off. | pending: server | First hour: `ufw status verbose`. |
| K7 | SSH by key only, no passwords, no root; the collective's key installed on day one with the stated fingerprint. | pending: server | `deploy/collective.pub` is in the repository; its fingerprint, computed here, is `SHA256:ZjrsBaDvO5lZRItROMURKN7vN+aOFwzD8E11O027WE8`. First hour: `sshd -T` and `ssh-keygen -lf` on the server's `authorized_keys`. |
| K8 | The deployment guide is written for this host, ufw without logs, no fail2ban. | pending: server | `deploy/DEPLOY.md` is rewritten (no other host named). Closes when it has been followed once on the fresh server. |
| K9 | Domain registered by the collective, privacy on, DNS pointing at the server; the certificate-log fact on the Safety page. | pending: collective | The Safety page already states the certificate-log fact ("Two things that are public"). Closes when the collective registers the domain: `whois`, `dig`. |
| K10 | Both Vercel preview projects deleted after go-live. | pending: server | After go-live: the Vercel dashboard empty, the old preview addresses answering nothing. |
| K11 | Tea Talks on the real server with the demo switch absent and the stories switch as decided. | pending: server | First hour: the env file; a real test story submitted and deleted. |
| K12 | No secret ever travels through the Upwork chat. | pending: server | At go-live: the setup link sent by one-time link or Proton to Proton; the message history shows no secret. |

## O · Process

| # | Promise | Result | Evidence |
|---|---|---|---|
| O1 | This checklist run before each delivery; results sent with it. | pass | This file. |
| O3 | Browser autofill never fills the hidden spam field, on iPhone Safari and Android Chrome. | pending: device | Round two, on the phones: open Tea Talks and Contact, let the browser offer autofill, confirm the hidden field stays empty. |
| O4 | The collective's older Android phone is on the review list with the screens to open named. | pending: device | Round two: the list goes in the message with the devices; their notes come back. |

## Failures and what they mean

**B1, the "connect" rule of the content security policy.** The promise was written as "connect-src 'none'", which would forbid the page from talking to any server at all, including our own, once it has loaded. The site as built uses "connect-src 'self'": the page may talk to our own server and to nothing else. This is deliberate. When someone sends a story, the page sends it quietly in the background and then replaces itself with the thank-you screen, so that the whole visit leaves a single entry in the browser's history and the Back button cannot bring the story back. That background send is a connection to our own server, and the stricter rule would block it. Every other address on the internet is still blocked; the test that watches the browser's network traffic on every page saw only our own address. The protection the promise was after is intact; the wording of the promise is what differs, and it should be updated to "connect-src 'self'" so that the checklist and the site say the same thing.

## Pending, and when it closes

- **Round two on devices** (I6, O3, O4): VoiceOver on an iPhone and TalkBack on the collective's older Android; the autofill test on iPhone Safari and Android Chrome; the review list for the older phone.
- **The first hour on the real server** (A10, A11, C6, K1–K8, K10–K12): the hosting account and its settings, the firewall, SSH and the collective's key, the web server headers on the live domain, the service unit, the env file with the exit address, a real test story, the preview projects deleted, the setup link delivered outside Upwork. A8 and A9 are re-run there with `systemctl` and `journalctl`.
- **After the collective answers** (G4, H8, K9): whether an email address appears on the Contact page; the two lines on the Tea Talks thank-you screen; the domain registration.

## Not in this milestone

- **L** (languages): D8, J1–J8.
- **W1** (Our Work, collections and editor): F4, N1, N2.
- **W2** (Our Work, media): B7, F5, N3–N9; the real-media half of C4 and the feed half of F2.
- **M3** (verification, documents and handoff): L1–L6, M1–M3, O2; the final version of D7.
