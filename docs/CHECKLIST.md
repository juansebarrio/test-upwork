# Shai Collective · Verification checklist

Every promise made in the proposal, the messages and the two feedback rounds, in one place. Run by hand before each delivery; the results go to the collective with the delivery. An item is done only when its check passes on the real thing, not when the code exists.

Milestones: **M2** build and put online · **M3** verification, documents and handoff · **L** languages add-on · **W1** Our Work, collections and editor · **W2** Our Work, media pipeline and handoff.

Wording to keep everywhere (adopted from the collective): *every request carries an address so it can be routed; what matters is that the server does not record it, and nothing derived from it is stored.*

---

## A · What is stored

| # | Promise | How to verify | When |
|---|---|---|---|
| A1 | Stories table holds only: random 16-char `id`, `text`, `status` (pending / approved / rejected), `day` (UTC, YYYY-MM-DD), `lang`. Nothing else. | `node scripts/inspect-db.mjs`; `PRAGMA table_info(submissions)` shows exactly these columns. | M2 |
| A2 | No time of day, no IP, no user agent, no headers are ever written. | `grep -rn "headers\|remoteAddress\|x-forwarded" src/` touches nothing that writes; inspect-db after a full flow. | M2 |
| A3 | Rejected stories live in a separate list and are never served publicly. | Reject a story; `GET /stories` and every page of it never contain it; DB shows `status = rejected`. | M2 |
| A4 | Delete is real: `DELETE` with `secure_delete=ON`, `journal_mode=DELETE`, `auto_vacuum=FULL`, no WAL file. | `PRAGMA secure_delete` = 1; submit a story with a unique phrase, delete it, `strings tea-talks.sqlite \| grep <phrase>` returns nothing; no `-wal` file in the data dir. | M2 |
| A5 | Nothing expires on its own (stories). | No timer, cron or job touches `submissions`; grep for `DELETE FROM submissions` only in the admin action. | M2 |
| A6 | Contact table holds only: `id`, `text`, `reply_to` (nullable), `day`. | `PRAGMA table_info(messages)`. | M2 |
| A7 | "Replied" erases `reply_to` at once, with real deletion; the message text stays until deleted. | Press Replied; inspect-db shows NULL; `strings` finds no trace of the address. | M2 |
| A8 | `reply_to` not marked within 30 days is erased automatically. | Insert a row dated 31 days ago; run the timer (`systemctl start tea-talks-sweep.service`); field is NULL. | M2 |
| A9 | Application log: one line at start, errors without request data. | Run every flow, then `journalctl -u tea-talks` shows only the startup line. | M2 |
| A10 | Caddy access log off; `X-Forwarded-For` and `X-Real-IP` stripped before the app. | Caddyfile has `log { output discard }`; `curl -H "X-Forwarded-For: 1.2.3.4"` and confirm the app never logs or echoes it. | M2 |
| A11 | Firewall without logs; no fail2ban. | `ufw status verbose` shows `Logging: off`; `dpkg -l \| grep fail2ban` is empty. | M2 |

## B · Headers, cookies, external requests

| # | Promise | How to verify | When |
|---|---|---|---|
| B1 | CSP `default-src 'self'; connect-src 'none'; frame-ancestors 'none'`, no `unsafe-inline`, on every response: pages, static files, 404, 403, 500. | `node scripts/verify.mjs https://<domain>`; `curl -I` on `/`, `/stories`, `/admin`, `/nothing-here`, `/fonts/<file>.woff2`. | M2 |
| B2 | `Referrer-Policy: no-referrer`, HSTS, `nosniff`, `X-Frame-Options: DENY`, Permissions-Policy, `Cache-Control: no-store` on pages. | verify.mjs; Caddy repeats the same set at the edge. | M2 |
| B3 | Zero cookies on every public page. | `curl -I` on every public route shows no `Set-Cookie`; browser devtools confirms. | M2 |
| B4 | Admin cookie: `Path=/admin; HttpOnly; Secure; SameSite=Strict`, session-only. | `curl -i` on login shows exactly these attributes and no `Expires`. | M2 |
| B5 | Zero external requests: fonts self-hosted as woff2, no CDN, no analytics, no captcha, no embeds. | Headless Chromium network log on every page shows only the site's origin; verify.mjs. | M2 (Ethiopic font in L) |
| B6 | B1–B5 hold on all seven pages and the panel, not only Tea Talks. | Loop verify.mjs over the full route list. | M2 |
| B7 | Media: native players only, `preload="none"`, no autoplay, `disablepictureinpicture`, no third-party poster. | Inspect markup of an episode and a film; network log while the page loads shows no media bytes until play. | W2 |

## C · Quick exit

| # | Promise | How to verify | When |
|---|---|---|---|
| C1 | "Leave quickly" pill on every page, including panel, 404, 403, 500. | `curl` each error page and grep the pill; visual pass of every screen. | M2 |
| C2 | Escape twice within one second exits; one Escape does nothing; holding the key does not count. | Manual in Chromium: type text, press Escape once (text stays), twice (exit). | M2 |
| C3 | On exit: all fields cleared, tab title changed, `location.replace` to `QUICK_EXIT_URL`, a single history entry, Back does not return. | Chromium: `history.length` stays at 2 through the visit; Back from the exit site lands before Tea Talks. | M2 |
| C4 | Exit pauses every audio and video before leaving; players cannot pop out. | Play a sample, trigger exit, no sound continues; `disablepictureinpicture` present. | M2 script · W2 real media |
| C5 | Works with JavaScript off: the pill is a plain link. | Disable JS, click the pill. | M2 |
| C6 | `QUICK_EXIT_URL` is the neutral regional site the collective chose. | Env file on the server. | M2 (needs their choice) |

## D · Moderation panel

| # | Promise | How to verify | When |
|---|---|---|---|
| D1 | Three tabs: Waiting, Approved, Rejected, each with a count. Waiting: Approve, Reject, Delete. Approved: Unpublish (back to Waiting), Delete. Rejected: Restore (to Waiting), Delete. | Click through every action; DB status follows. | M2 |
| D2 | Rejected never mixes with the public page. | A3. | M2 |
| D3 | Edit before approving: the edited text replaces the original; nothing of the original remains. | Edit a story with a unique phrase, approve, `strings` finds the new text and not the old. | M2 |
| D4 | Passphrase set by the collective through a one-time setup link at go-live; stored as a hash (scrypt or argon2), never plaintext; changeable from the panel; link dead after use. | Open the link twice (second fails); DB holds a hash; change from the panel and log in again. | M2 |
| D5 | Login: constant-time compare, fixed 500 ms delay on every attempt, no attempt counting, no login logging. | Time a right and a wrong attempt (both ≈ 0.5 s); journal shows nothing. | M2 |
| D6 | Session: 30 minutes of inactivity, sliding; logout always visible. | Shorten the window in a test build and watch it expire; logout clears the cookie. | M2 |
| D7 | Moderation guide updated: three actions, edit before approve, removal-request procedure, Contact "Replied", no screenshots, no copying stories into chats. | Read-through against the panel. | M2 draft · M3 final |
| D8 | Panel in both languages. | Switch language inside `/admin`. | L |

## E · Public stories page

| # | Promise | How to verify | When |
|---|---|---|---|
| E1 | Behind `PUBLIC_ARCHIVE`; 404 when off, identical to any missing page. | Toggle the flag, restart, `curl -I /stories`. | M2 |
| E2 | 20 per page, newest first, Older / Newer links, no infinite scroll, works without JS. | Seed 45 approved stories; three pages; JS off. | M2 |
| E3 | Month and year only, never a full date. | Page source. | M2 |
| E4 | Every story carries a language mark; the English page shows English, the local page shows local, each with a visible "Show all". | Seed stories in both; check both pages and the Show all link. | M2 mark · L local page |
| E5 | Pending and rejected never appear. | A3. | M2 |

## F · Search engines

| # | Promise | How to verify | When |
|---|---|---|---|
| F1 | The site is indexable: Home, About, Our Work, Safety and Privacy, Contact, Mental Health. | No `noindex` on these; `/robots.txt` absent or allow-all. | M2 |
| F2 | Tea Talks, `/stories` and each of its pages, `/thanks`, and the podcast feed carry `<meta name="robots" content="noindex, nofollow">` and `X-Robots-Tag: noindex, nofollow`. | `curl -I` and page source on each. | M2 · feed in W2 |
| F3 | These paths are deliberately not listed in `robots.txt`. | Read `/robots.txt`. | M2 |
| F4 | Our Work: indexing switch per collection, on by default. | Toggle in the panel; header changes. | W1 |
| F5 | Podcast feed: no `<link rel="alternate">` in any HTML; not submitted to any directory. | Grep the built HTML; a written note in the handoff. | W2 |
| F6 | Removal-request procedure in the moderation guide. | Read. | M2 |

## G · Contact

| # | Promise | How to verify | When |
|---|---|---|---|
| G1 | Stores only text, optional reply field, day. | A6. | M2 |
| G2 | Same headers, no cookies, honeypot; nothing about the sender recorded. | B-section checks on `/contact`; honeypot filled → "sent" and nothing stored. | M2 |
| G3 | Confirmation screen never shows the message. | Submit and read the screen and its source. | M2 |
| G4 | An email address appears only if the collective decides; never Gmail. | Decision on file; page source. | M2 (pending their answer) |

## H · Pages and copy

| # | Promise | How to verify | When |
|---|---|---|---|
| H1 | Seven pages; header, switcher, pill and footer identical on every page. | Visual pass of every page at 390 and 1280. | M2 |
| H2 | Copy verbatim to the master document; ledger lines L1–L30 kept as listed; D1–D3 reverted to the collective's wording. | Script: extract rendered text per page and diff against the master and the ledger. | M2 |
| H3 | Design as approved in the visual pass: cream, paper, ink, terracotta, amber `#8F5A0C`; Albert Sans 400/500/600; type scale; held line only on Home; at most two shapes per screen, drawn in CSS. | Visual pass; grep CSS for any other colour value. | M2 |
| H4 | Home: variant B on desktop, C on the phone. | Visual pass. | M2 |
| H5 | Safety and Privacy includes "What we cannot control" and "Two things that are public". | Read the live page. | M2 |
| H6 | The code contains no country, city or location; those words exist only in the collective's content files. | `grep -rni "ethiopia\|addis\|horn of africa" src/ \| grep -v content/` is empty. | M2 |
| H7 | No image files; the only icons are two inline Lucide SVGs. | `find public src -name "*.png" -o -name "*.jpg" -o -name "*.svg"` returns nothing. | M2 |
| H8 | Tea Talks confirmation screen carries the collective's lines (ledger L13) and never the text sent. | Read; submit and check. | M2 (needs their lines) |

## I · Accessibility

| # | Promise | How to verify | When |
|---|---|---|---|
| I1 | AA contrast on every text pair, including amber. | axe-core on every page; contrast table in the delivery note. | M2 |
| I2 | Focus ring visible, 2 px, ≥ 3:1 against its background, on everything focusable. | Tab through every page. | M2 |
| I3 | Full keyboard navigation; nothing reachable only by mouse. | Tab through; submit and moderate with keyboard only. | M2 |
| I4 | Landmarks, labels, headings in order, `lang` on every page. | axe-core; screen reader pass. | M2 |
| I5 | Announcement on submit (focus moves to the confirmation heading, or `aria-live`). | VoiceOver reads the confirmation without a gesture. | M2 |
| I6 | Tested with VoiceOver (iPhone) and TalkBack (older Android). | Notes from both devices in the delivery; the collective's older Android on the review list. | M2 round 2 |
| I7 | Touch targets ≥ 44 px. | Measure pill, buttons, links in rows. | M2 |
| I8 | No motion with reduced motion on; transitions on colour only. | `prefers-reduced-motion` emulation. | M2 |

## J · Languages

| # | Promise | How to verify | When |
|---|---|---|---|
| J1 | Switcher visible on every page next to the pill; never a prompt; no cookie, no memory of the choice. | Visual pass; B3. | L |
| J2 | Language in the URL prefix; English is default. | `/` and `/am/` (or the agreed prefix). | L |
| J3 | Noto Sans Ethiopic self-hosted as subset woff2; falls back to the device face. | Network log; block the font file and confirm the page still renders. | L |
| J4 | Every screen in both languages, including the panel. | Full pass in each language. | L |
| J5 | One text file plus one font per language. | Repo structure. | L |
| J6 | Tested with real text, on the older Android. | Device pass; no clipping, wrapping holds. | L |
| J7 | The code reveals only the languages offered, no location. | H6. | L |
| J8 | `lang` attribute per page and per story. | Page source. | L |

## K · Server and hosting

| # | Promise | How to verify | When |
|---|---|---|---|
| K1 | 1984 Hosting, Iceland; account in Juan's name with neutral project and server names; dedicated Proton mailbox. | Account dashboard. | M2 |
| K2 | Paid one year in advance. | Invoice; reimbursed at cost through Upwork. | M2 |
| K3 | Provider backups and snapshots off. | Server settings. | M2 |
| K4 | Caddy: automatic TLS, admin API off, `Server` header removed, security headers repeated at the edge. | Caddyfile; `curl -I`. | M2 |
| K5 | Node bound to `127.0.0.1:4321`; hardened systemd unit (own user, `ProtectSystem`, `NoNewPrivileges`, no capabilities). | `ss -ltnp`; `systemd-analyze security tea-talks`. | M2 |
| K6 | ufw: only 22, 80, 443; logging off. | `ufw status verbose`. | M2 |
| K7 | SSH: key only, password auth off, root login off; the collective's key in `authorized_keys` from day one, fingerprint `SHA256:ZjrsBaDvO5lZRItROMURKN7vN+aOFwzD8E11O027WE8`. | `sshd -T \| grep -i "passwordauth\|permitroot"`; `ssh-keygen -lf authorized_keys`. | M2 |
| K8 | `deploy/DEPLOY.md` rewritten for 1984/Iceland (no Hetzner), ufw without logs, no fail2ban. | Read; follow it on a fresh server once. | M2 |
| K9 | Domain registered by the collective at Gandi, `.org`, privacy on; DNS points to the server; the CT-log fact is on the Safety page. | `whois`; `dig`; read the page. | M2 |
| K10 | Both Vercel projects deleted after go-live. | Vercel dashboard empty; old URLs return nothing. | M2 |
| K11 | Tea Talks on the real server, `DEMO_MODE` absent, `PUBLIC_ARCHIVE` as decided. | Env file; submit a real test story and delete it. | M2 |
| K12 | No secret ever travels through Upwork chat; the setup link goes by one-time link or Proton to Proton. | Message history. | M2 |

## L · Continuity

| # | Promise | How to verify | When |
|---|---|---|---|
| L1 | Hosting account credentials sealed with `age -R shai-server.pub`, delivered to the collective. | They decrypt a test file with `age -d -i shai-server` and confirm. | M3 |
| L2 | Repository transferred to the collective's GitHub account; Juan a removable collaborator. | Repo settings. | M3 (needs their account) |
| L3 | `RECOVERY.md`: rebuild the site anywhere in a day, including how to open sealed files. | Follow it on a fresh VPS; time it. | M3 |
| L4 | Offline encrypted copy of code and documents delivered. | Sealed archive; they confirm it opens. | M3 |
| L5 | Monthly encrypted database backup, automated (timer → SQLite backup → `age -R` → push to a place they control), first one verified by them. | `systemctl list-timers`; the first backup decrypted on their side. | M3 |
| L6 | Maintenance proposed at the close of M3. | Message sent. | M3 |

## M · Encryption at rest

| # | Promise | How to verify | When |
|---|---|---|---|
| M1 | Story and message text encrypted in the database with a key kept outside it (systemd credential or root-only env file). | `inspect-db` shows ciphertext; `strings tea-talks.sqlite \| grep <phrase>` finds nothing. | M3 |
| M2 | Documented limit: protects against disk remnants, provider snapshots and theft; not against root on the running server. | Sentence present in the Safety page or the community document, and in the handoff. | M3 |
| M3 | The key is part of the sealed credentials, or backups are unreadable. | Open the sealed file; the key is there; restore a backup with it. | M3 |

## N · Our Work

| # | Promise | How to verify | When |
|---|---|---|---|
| N1 | Four collections in the same panel; categories created, renamed and moved by the collective; editor for text and images; site rendered from the database without rebuild; language mark per item. | Create, rename, move, publish; page updates without a deploy. | W1 |
| N2 | Magazine: articles as web pages first; each issue also as PDF. | Publish an issue; both forms exist. | W1 |
| N3 | Upload working area on a dm-crypt volume keyed from memory at each boot, never written; wiped and overwritten after success or failure; reboot mid-upload leaves it empty, panel says "not completed". | Pull the plug during an upload; after reboot the area is empty and unreadable. | W2 |
| N4 | Metadata stripped per type: images re-encoded without EXIF/IPTC/XMP; audio without tags or cover art; video re-encoded without device, location, creation time, encoder, extra tracks; PDFs rewritten with qpdf without author, creator, producer, title, keywords, dates, XMP, incremental revisions, embedded-image EXIF, annotations. Original file never kept; random identifier replaces the filename. | `exiftool` on each output shows technical fields only; `find` on the server for the original name returns nothing. | W2 |
| N5 | Metadata report after every upload; the `exiftool` command for the collective in the handoff. | Upload one real file of each type they send; compare report and exiftool. | W2 |
| N6 | Native players, `preload="none"`, no autoplay, no PiP, quick exit stops playback. | B7, C4. | W2 |
| N7 | Podcast RSS: `X-Robots-Tag: noindex`, no `rel="alternate"`, not submitted; the shared-catalogue limit written down. | F2, F5; handoff note. | W2 |
| N8 | Job queue with state in the panel; durations as promised (seconds for image/PDF, minutes for audio, up to an hour for a 30-minute film). | Time one of each. | W2 |
| N9 | Tested with one real file of each type from the collective. | Their files, their report. | W2 |

## O · Process

| # | Promise | How to verify | When |
|---|---|---|---|
| O1 | This checklist run by hand before each delivery; results sent with the delivery. | The results table in the delivery message. | Every delivery |
| O2 | Final review of the live site by a separate reviewer who built none of it. | Reviewer's report attached to the M3 delivery. | M3 |
| O3 | Honeypot autocomplete test on iPhone Safari and Android Chrome. | Open the form on both, let the browser offer autofill, honeypot stays empty. | M2 |
| O4 | The collective's older Android phone on the review list, with the screens to open named. | Message with the list; their notes. | M2 round 2 |
