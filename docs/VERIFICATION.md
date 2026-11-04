# Verification checklist (technical)

The full list of promises with their milestone is `docs/CHECKLIST.md`. This file
is the hands-on companion: what to run and what you should see. The automated
part is three scripts, run against a local build or the live domain:

```bash
node scripts/verify.mjs https://example.org                              # headers, cookies, origins, noindex, static files
PLAYWRIGHT_CHROMIUM=/path/to/chromium node scripts/a11y.mjs https://example.org   # axe-core at 390 and 1280
node --experimental-strip-types scripts/copy-check.mjs https://example.org       # rendered text against src/content/
```

## Routes

| Route | What it is | Indexable |
|---|---|---|
| `/` | Home | yes |
| `/about`, `/our-work`, `/safety-and-privacy`, `/contact`, `/mental-health` | the content pages | yes |
| `/tea-talks` | the anonymous writing page | **no** (meta + `X-Robots-Tag`) |
| `/thanks` | its confirmation | **no** |
| `/contact/sent` | the contact confirmation | **no** |
| `/stories`, `/stories?page=N`, `/stories?all=1` | public stories, behind `PUBLIC_ARCHIVE` | **no** |
| `/admin`, `/admin/setup`, `/admin/passphrase` | the panel | **no** (existing privacy property) |
| `/robots.txt` | `User-agent: *` and an empty `Disallow:`; the Tea Talks paths are deliberately not listed | n/a |
| anything else | the 404 page, with the full header and quick exit | no |

## 1. No external requests

1. Open the site in Firefox or Chrome. Open the developer tools (F12) and choose the **Network** tab. Tick "Disable cache", then reload.
2. Every row must go to your own hostname. Expect: the page, `site.css`, `quick-exit.js`, and one or two `.woff2` font files. Browsers also ask for `/favicon.ico`, which returns the 404 page; there is no icon file on purpose.
3. Repeat on every page in the route table, including `/admin` and a wrong address.

Also in the **Console** tab: there must be no "Refused to load" messages. `verify.mjs` scans the HTML and CSS of every route for any other origin.

## 2. No cookies on the public pages

Developer tools, **Application** (Chrome) or **Storage** (Firefox), then **Cookies**, on every public route: empty. Also **Local Storage** and **Session Storage**: empty.

```bash
for p in / /about /our-work /safety-and-privacy /contact /contact/sent /mental-health /tea-talks /thanks /stories; do curl -sI https://example.org$p | grep -i set-cookie; done   # prints nothing
```

The only cookie in the whole app appears after a moderator signs in at `/admin`: `Path=/admin; HttpOnly; Secure; SameSite=Strict`, no `Max-Age` or `Expires`. Log out and it is removed. Leave the panel untouched for 30 minutes and the next click asks for the passphrase again.

## 3. The database holds only what we promised

```bash
cd /opt/tea-talks/app && DB_PATH=/var/lib/tea-talks/tea-talks.sqlite node scripts/inspect-db.mjs
```

Three tables: `submissions` (`id, text, status, day, lang`), `messages` (`id, text, reply_to, day`), `settings` (`key, value`, holding only the passphrase hash and, briefly, the setup token hash). `day` looks like `2026-09-29` with no time. `id` is a random 16-character string.

Real deletion:

```bash
# submit a story containing a unique phrase, delete it in the panel, then:
strings /var/lib/tea-talks/tea-talks.sqlite | grep -c "<the phrase>"     # 0
ls /var/lib/tea-talks/                                                     # no -wal file; a -journal may exist for a fraction of a second during a write
```

Edited stories: edit a story in the panel with a unique phrase, save, then `strings` finds the new text and not the old.

Contact: send a message with a reply address, press **Replied**, `inspect-db` shows `reply_to` as NULL and `strings` finds no trace of the address. For the 30-day rule, insert a row dated 31 days ago and run `node scripts/sweep.mjs` (or `systemctl start tea-talks-sweep.service` on the server): the field is NULL.

## 4. Caddy and the app write no request logs

Send two or three test stories and load a few pages first, so there would be something to log. Then:

```bash
journalctl -u tea-talks --no-pager --since "1 hour ago"     # only "[tea-talks] listening" and, if anything ever went wrong, an error message
journalctl -u tea-talks-sweep --no-pager                      # only "sweep: N reply address(es) erased"
journalctl -u caddy --no-pager --since "1 hour ago"           # certificate and startup lines only; no path, method, status or address
ls -la /var/log/caddy 2>&1                                    # "No such file or directory"
curl -s -H "X-Forwarded-For: 1.2.3.4" https://example.org/ >/dev/null   # then check the journal again: nothing
ufw status verbose                                            # Logging: off
dpkg -l | grep fail2ban                                       # empty
```

## 5. Quick exit leaves no back-button trail

On a phone and on a laptop:

1. Open some unrelated site first (say, a news site). Then open the Tea Talks page.
2. Type a few words in the box. Press **Leave quickly**.
3. You land on the exit site. Press **Back**. You must land on the news site, **not** on this site.
4. Open the Tea Talks page again, type, and this time press **Escape twice within a second**. Same result.
   Also press Escape **once** and wait two seconds: nothing should happen and your text must still be there.
5. Send a story, and from the thank-you page press **Leave quickly**. Press **Back**: news site again.
6. On any other page (Home, About), the pill and the double Escape work the same way; only the exit itself replaces the history entry there.
7. With JavaScript disabled, the pill is a plain link to the exit site.

Why this works: on the Tea Talks pages every internal move (form, links, quick exit) uses `location.replace`, which swaps the current history entry instead of adding a new one, so a whole visit occupies one slot and the exit overwrites it. Before leaving, the script also pauses any audio or video on the page.

Note: browsers still keep their own **history list** (the one under the menu) unless private mode is used. The quick exit protects the Back button, not that list. The Safety and Privacy page says so.

## 6. Headers

```bash
curl -sI https://example.org/
curl -sI https://example.org/site.css
curl -sI https://example.org/nothing-here
```

Expect on all three, among others:

```
content-security-policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'
referrer-policy: no-referrer
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
x-frame-options: DENY
permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

`connect-src` is `'self'`, not `'none'`: the story form is sent in the background to the same origin so the confirmation can replace the page. No other origin is reachable.

Pages carry `cache-control: no-store`; static files are cacheable. **No** `server:` line (Caddy's banner is removed). `verify.mjs` checks every route.

Noindex: `curl -sI https://example.org/tea-talks | grep -i x-robots-tag` prints `noindex, nofollow`; the same on `/thanks`, `/stories`, `/stories?page=2`, `/contact/sent`, `/admin` and the 404 page. On `/`, `/about`, `/contact` and the other content pages it prints nothing, and their source has no robots meta tag. `verify.mjs` asserts the exact set.

## 7. Honeypot

With developer tools, find the hidden field named `x9f3a` inside the Tea Talks form (and the same field on the Contact form), give it any value, and submit. You get the normal confirmation page, but `inspect-db.mjs` shows nothing was stored.

**Autofill test, required before launch.** If a browser's autofill ever filled the hidden field on its own, that person's story would be silently dropped. The field name is meaningless on purpose so autofill has nothing to match, but check on real phones:

1. On an **iPhone with Safari** that has a contact card and saved addresses, and on an **Android phone with Chrome** that has autofill turned on with a saved address and payment method, open the Tea Talks page and the Contact page.
2. Tap into the box. If the keyboard offers an autofill suggestion, accept it. Write a short story and send it.
3. On the server, run `inspect-db.mjs`. The story must be there. If it is not, autofill touched the honeypot and the field needs a different name.

Repeat once with a password manager installed (1Password, Bitwarden or the phone's own) since they also fill forms.

## 8. Stories page

With `PUBLIC_ARCHIVE=false`, `https://example.org/stories` shows the same "That page is not here." screen as any wrong address, with a 404 status. With `true`, approved stories, newest day first, 20 per page, with "Older stories" and "Newer stories" links that work with JavaScript off, text and the month and year only. The English page shows English stories with a "Show all." link to `?all=1`. Pending and rejected stories never appear.

## 9. Accessibility

`scripts/a11y.mjs` runs axe-core on every route at 390 and 1280 and must report no violations. By hand: Tab through every page (the focus ring is 2 px amber everywhere, the skip link appears first), submit a story and moderate with the keyboard only, and check that after sending the confirmation heading has focus (a screen reader reads it without a gesture). Emulate `prefers-reduced-motion` and confirm nothing animates. VoiceOver on iPhone and TalkBack on an older Android are part of the second review round.

## 10. Copy and design

`scripts/copy-check.mjs` renders every page and fails if any visible text is not a string from `src/content/`, or if any string a page must show is missing. By hand: `grep -rni "ethiopia\|addis\|horn of africa" src/ | grep -v content/` is empty; `find public src -name "*.png" -o -name "*.jpg" -o -name "*.svg"` is empty; `verify.mjs` checks that `site.css` uses only the five palette colours.
