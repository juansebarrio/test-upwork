# Deploying to a fresh Ubuntu 24.04 VPS at 1984 Hosting (Iceland)

Time needed: about an hour. You need the domain the collective registered, the
collective's public SSH key in `deploy/collective.pub`, and a 1984 Hosting account.

Everything below runs as `root` unless it says otherwise. Replace `example.org`
with the real hostname wherever it appears. Nothing in this guide is sent through
Upwork chat: the setup link and any credential go by a one-time-link service or
Proton to Proton.

## 1. Create the server

1. In the 1984 Hosting panel, order a VPS with **Ubuntu 24.04**. The smallest size is enough.
2. Give the project and the server neutral names (a word, a colour, a number), nothing that names the collective or the region.
3. **Backups and snapshots: off.** A backup is a copy of every story and every message. If the collective wants backups later, that is a deliberate decision with its own encryption, not a default.
4. Add your SSH public key when the panel asks. Note the server's IPv4 and IPv6 addresses.

## 2. Point the domain at it

At the registrar, add:

| Type | Name | Value |
|------|------|-------|
| A    | @    | the server's IPv4 |
| AAAA | @    | the server's IPv6 |

Wait until `dig +short example.org` answers with the new address.

## 3. First login, SSH, firewall

```bash
ssh root@example.org
apt update && apt -y upgrade
apt -y install ufw unattended-upgrades curl git

# Security updates install themselves.
dpkg-reconfigure -plow unattended-upgrades

# Firewall: only SSH, HTTP (for certificates and the HTTPS redirect) and HTTPS. No logging.
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw logging off
ufw --force enable
ufw status verbose          # must show "Logging: off"
```

Do not install fail2ban: it keeps a log of addresses, which is exactly what this server must not do. Key-only SSH is the protection.

Create the app user and give it the collective's key on day one. The key file `deploy/collective.pub` is in the repository (one `ssh-ed25519` line). Its fingerprint must read `SHA256:ZjrsBaDvO5lZRItROMURKN7vN+aOFwzD8E11O027WE8`; the collective verified it on their side. Check it **before** copying, from your own checkout, and **again after** copying, on the server:

```bash
# on your machine, in the repository checkout:
ssh-keygen -lf deploy/collective.pub          # must print SHA256:ZjrsBaDvO5lZRItROMURKN7vN+aOFwzD8E11O027WE8
scp deploy/collective.pub root@example.org:/root/collective.pub

# on the server, as root:
adduser --system --group --home /opt/tea-talks --shell /bin/bash teatalks
mkdir -p /opt/tea-talks/.ssh
cat /root/collective.pub >> /opt/tea-talks/.ssh/authorized_keys
cat ~/.ssh/authorized_keys >> /opt/tea-talks/.ssh/authorized_keys   # your own key, so you can still deploy
chown -R teatalks:teatalks /opt/tea-talks/.ssh
chmod 700 /opt/tea-talks/.ssh && chmod 600 /opt/tea-talks/.ssh/authorized_keys
ssh-keygen -lf /opt/tea-talks/.ssh/authorized_keys   # one line per key; the collective's must again read SHA256:ZjrsBaDvO5lZRItROMURKN7vN+aOFwzD8E11O027WE8
rm /root/collective.pub
```

If either check prints a different fingerprint, stop: do not copy the key, and ask the collective to re-send it by a channel other than the one it came through.

The same key is also the recipient for anything we later need to seal for the collective (a database export, a credential): `age -R deploy/collective.pub -o file.age file`. Nothing is sealed in this milestone; the note is here so the key's two uses are written down in one place.

Harden sshd: no passwords, no root login. Test a new SSH session as `teatalks` **before** closing the root one.

```bash
cat > /etc/ssh/sshd_config.d/10-hardening.conf <<'EOF2'
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
EOF2
sshd -t && systemctl restart ssh
sshd -T | grep -iE "passwordauthentication|permitrootlogin"
```

From here on, log in as `teatalks` and use `sudo` (add the user to sudo first: `usermod -aG sudo teatalks`).

Keep the system journal short. It never holds request data, but there is no reason to keep old error lines around:

```bash
sudo mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nMaxRetentionSec=7day\nSystemMaxUse=100M\n' | sudo tee /etc/systemd/journald.conf.d/short.conf
sudo systemctl restart systemd-journald
```

## 4. Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt -y install nodejs build-essential python3
node --version   # v22.x
```

(`build-essential` and `python3` are only needed if the SQLite module has to be compiled; usually a prebuilt binary is downloaded during `npm ci`.)

## 5. Install Caddy

```bash
sudo apt -y install debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt -y install caddy
```

## 6. Put the app on the server

```bash
# Get the code. Either clone it:
sudo -u teatalks git clone https://github.com/YOUR-ORG/tea-talks.git /opt/tea-talks/app
# or upload it from your laptop with:  rsync -a --exclude node_modules --exclude .git ./ teatalks@example.org:/opt/tea-talks/app/

cd /opt/tea-talks/app
sudo -u teatalks npm ci
sudo -u teatalks npm run build
sudo -u teatalks npm prune --omit=dev
```

The systemd units expect the app in `/opt/tea-talks` (`WorkingDirectory`). If you keep it in `/opt/tea-talks/app`, adjust `WorkingDirectory` and `ExecStart` in both units, or symlink.

## 7. The environment file

```bash
sudo mkdir -p /etc/tea-talks
sudo cp /opt/tea-talks/app/.env.example /etc/tea-talks/env
sudo chmod 600 /etc/tea-talks/env
sudo nano /etc/tea-talks/env
```

Set these lines:

```
PUBLIC_ARCHIVE=true            # or false, as the collective decided
QUICK_EXIT_URL=https://www.google.com/   # the collective chose Google's homepage; keep the www, no redirect on the way out
DB_PATH=/var/lib/tea-talks/tea-talks.sqlite
HOST=127.0.0.1
PORT=4321
# CONTACT_EMAIL=               # only if the collective decides to show one; never Gmail
```

There is **no `ADMIN_PASSWORD`**. The passphrase is chosen by the collective in step 10.

## 8. Start the app and the sweep timer

```bash
sudo cp /opt/tea-talks/app/deploy/tea-talks.service /etc/systemd/system/
sudo cp /opt/tea-talks/app/deploy/tea-talks-sweep.service /opt/tea-talks/app/deploy/tea-talks-sweep.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tea-talks
sudo systemctl enable --now tea-talks-sweep.timer
sudo systemctl status tea-talks --no-pager
sudo systemctl list-timers tea-talks-sweep.timer --no-pager
sudo ss -ltnp | grep 4321          # bound to 127.0.0.1 only
sudo systemd-analyze security tea-talks
```

You should see `[tea-talks] listening on http://127.0.0.1:4321`. That address is only reachable from the server itself.

## 9. Put Caddy in front

```bash
sudo cp /opt/tea-talks/app/deploy/Caddyfile /etc/caddy/Caddyfile
sudo sed -i 's/tea.example.org/example.org/' /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy fetches a certificate from Let's Encrypt on the first request. That certificate is written to public certificate-transparency logs, permanently; the Safety and Privacy page says so. Open `https://example.org` in a browser: the Home page, with a padlock.

The Caddyfile discards access logs, switches the admin API off, removes the `Server` header, repeats the security headers at the edge and strips `X-Forwarded-For`, `X-Real-IP` and `Forwarded` before the app sees a request.

## 10. The passphrase: a one-time setup link for the collective

On the server:

```bash
cd /opt/tea-talks/app
sudo -u teatalks DB_PATH=/var/lib/tea-talks/tea-talks.sqlite SITE_URL=https://example.org node scripts/setup-link.mjs
```

It prints one URL, `https://example.org/admin/setup?token=...`, valid for 24 hours and usable once. Send it to the collective through a one-time-link service (a link that destroys itself after being opened once) or Proton to Proton. **Never through the Upwork chat.** Only the hash of the token is on the server; the printed link is the only copy.

They open it, choose a passphrase of at least 16 characters, type it twice, and the link is dead. From then on `/admin` accepts that passphrase, and it can be changed inside the panel ("Change passphrase"). If a link expires unused, run the script again; it replaces the old one.

## 11. Check the promises on the live domain

From your laptop, on the repository:

```bash
node scripts/verify.mjs https://example.org
PLAYWRIGHT_CHROMIUM=... node scripts/a11y.mjs https://example.org
node --experimental-strip-types scripts/copy-check.mjs https://example.org
```

Then walk through `docs/CHECKLIST.md` by hand, and keep the results with the delivery. On the server:

```bash
cd /opt/tea-talks/app && sudo -u teatalks DB_PATH=/var/lib/tea-talks/tea-talks.sqlite node scripts/inspect-db.mjs
sudo journalctl -u tea-talks --no-pager | tail        # only the startup line
sudo journalctl -u caddy --no-pager | tail            # no request lines
ls /var/log/caddy 2>/dev/null || echo "no caddy log directory, as intended"
```

## 12. After go-live

- Delete both Vercel projects (the preview and the earlier test). The old URLs must return nothing.
- Submit a real test story on the live site, find it in the panel, delete it. Confirm with `scripts/inspect-db.mjs` that the row is gone.
- Put the collective's older Android phone on the review list, with the screens to open.

## Updating the app later

```bash
cd /opt/tea-talks/app
sudo -u teatalks git pull            # or rsync the new files
sudo -u teatalks npm ci && sudo -u teatalks npm run build && sudo -u teatalks npm prune --omit=dev
sudo systemctl restart tea-talks
```

The database is in `/var/lib/tea-talks/`, outside the app folder, so updates never touch it. Migrations run at startup and are safe to repeat.

## Things that stay deliberate

- **Backups and snapshots** stay off at the provider. Encrypted backups and encryption at rest are a later milestone.
- **The hosting company** keeps its own network records outside our reach. We chose the country for its privacy laws; that is protection, not invisibility, and the Safety and Privacy page says so.
- **Tor Browser** works with the site, for anyone who needs to hide that they visited at all.
