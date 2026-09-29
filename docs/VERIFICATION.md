# Verification checklist

Run these yourself after deploying. Each item names what to do and what you should see. The automated part is `node scripts/verify.mjs https://tea.example.org`; the manual steps below cover what a script cannot see.

## 1. No external requests

1. Open the site in Firefox or Chrome. Open the developer tools (F12) and choose the **Network** tab.
2. Tick "Disable cache", then reload the page.
3. Look at the domain column of every row. **Every request must go to your own hostname.** Expect roughly: the page, one stylesheet, `quick-exit.js`, `favicon.svg`, and one or two `.woff2` font files.
4. Type something in the box and send it. The only new request is a POST to `/submit` and the `/thanks` page, both on your hostname.
5. Repeat on `/stories` (if on) and `/admin`.

Also in the **Console** tab: there must be no "Refused to load" messages. Those would mean something tried to reach elsewhere and the Content-Security-Policy blocked it, which is the safety net working but also a bug to fix.

Command-line version: `node scripts/verify.mjs https://tea.example.org` scans the HTML and CSS for any other origin.

## 2. No cookies on the public pages

1. Same developer tools, **Application** tab (Chrome) or **Storage** tab (Firefox), then **Cookies**.
2. Load `/`, `/thanks`, `/stories`. The cookie list for your hostname must be **empty**.
3. Also check **Local Storage** and **Session Storage**: empty.

Command line:

```bash
curl -sI https://tea.example.org/ | grep -i set-cookie      # prints nothing
curl -sI https://tea.example.org/thanks | grep -i set-cookie
```

The only cookie in the whole app appears after a moderator signs in at `/admin`. Check its flags there: `Path=/admin; HttpOnly; Secure; SameSite=Strict`, and no `Max-Age` or `Expires`, so it dies with the browser. Log out and it is removed. Leave the panel untouched for 30 minutes and the next click asks for the password again.

## 3. Database rows hold only text, status and day

On the server:

```bash
cd /opt/tea-talks
DB_PATH=/var/lib/tea-talks/tea-talks.sqlite node scripts/inspect-db.mjs
```

You should see one table, `submissions`, with the columns `id, text, status, day`, and every row printed as exactly those four fields. `day` looks like `2026-09-29` with no time. `id` is a random 16-character string that says nothing about order.

If you prefer to look without our script:

```bash
apt install sqlite3
sqlite3 /var/lib/tea-talks/tea-talks.sqlite '.schema' 'select * from submissions;'
```

There should be no other tables and no other files in `/var/lib/tea-talks/` apart from the database itself (a `-journal` file may exist for a fraction of a second during a write).

## 4. Caddy and the app write no request logs

Send two or three test stories and load a few pages first, so there would be something to log. Then:

```bash
# The app: only "Server listening" and, if anything ever went wrong, an error message.
journalctl -u tea-talks --no-pager --since "1 hour ago"

# Caddy: certificate and startup lines only. No line should mention a path, a method, a status code or an address.
journalctl -u caddy --no-pager --since "1 hour ago"

# No log files on disk either.
ls -la /var/log/caddy 2>&1          # "No such file or directory"
grep -rn "log" /etc/caddy/Caddyfile  # only the "output discard" and "level WARN" blocks from the repo
```

If you ever see a line with `GET /` or `POST /submit` in either journal, something has changed in the configuration and needs fixing before the site is used.

## 5. Quick exit leaves no back-button trail

On a phone and on a laptop:

1. Open some unrelated site first (say, a news site). Then open Tea Talks.
2. Type a few words in the box. Press **Leave quickly**.
3. You land on the weather site. Press **Back**. You must land on the news site, **not** on Tea Talks.
4. Open Tea Talks again, type, and this time press **Escape twice within a second**. Same result.
   Also press Escape **once** and wait two seconds: nothing should happen and your text must still be there. A single stray Escape must never erase a story.
5. Open Tea Talks, send a story, and from the thank-you page press **Leave quickly**. Press **Back**: news site again, not Tea Talks and not the form.
6. Return to Tea Talks by typing the address. The box must be empty (the text was cleared before leaving).

Why this works: every internal move (form, links, quick exit) uses `location.replace`, which swaps the current history entry instead of adding a new one, so a whole visit occupies one slot and the exit overwrites it.

Note: browsers still keep their own **history list** (the one under the menu) unless private mode is used. The quick exit protects the Back button, not that list. The community document says so.

## 6. Headers (quick check)

```bash
curl -sI https://tea.example.org/
```

Expect to see, among others:

```
content-security-policy: default-src 'self'; script-src 'self'; style-src 'self'; ...
referrer-policy: no-referrer
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
cache-control: no-store
```

and **no** `server:` line (Caddy's banner is removed).

## 7. Honeypot

With developer tools, find the hidden field named `x9f3a` inside the form, give it any value, and submit. You get the normal thank-you page, but `inspect-db.mjs` shows nothing was stored.

**Autofill test, required before launch.** If a browser's autofill ever filled the hidden field on its own, that person's story would be silently dropped. The field name is meaningless on purpose so autofill has nothing to match, but check on real phones:

1. On an **iPhone with Safari** that has a contact card and saved addresses, and on an **Android phone with Chrome** that has autofill turned on with a saved address and payment method, open the story page.
2. Tap into the box. If the keyboard offers an autofill suggestion, accept it. Write a short story and send it.
3. On the server, run `inspect-db.mjs`. The story must be there. If it is not, autofill touched the honeypot and the field needs a different name.

Repeat once with a password manager installed (1Password, Bitwarden or the phone's own) since they also fill forms.

## 8. Archive flag

With `PUBLIC_ARCHIVE=false`, `https://tea.example.org/stories` shows the same "nothing on this page" screen as any wrong address, with a 404 status. Set it to `true` in `/etc/tea-talks/env`, `systemctl restart tea-talks`, and the page shows approved stories, newest first, text and the month and year only (never the day).
