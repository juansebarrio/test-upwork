# Deploying Tea Talks on a fresh Hetzner VPS (Ubuntu 24.04, Germany)

Time needed: about 45 minutes. You need a domain name you control and a Hetzner account.

Everything below runs as `root` unless it says otherwise. Replace `tea.example.org` with your real hostname wherever it appears.

## 1. Create the server

1. In the Hetzner Cloud console, create a project, then **Add Server**.
2. Location: **Falkenstein** or **Nuremberg** (both in Germany).
3. Image: **Ubuntu 24.04**. Type: the smallest shared vCPU (CX22 or CPX11) is plenty.
4. Networking: keep both IPv4 and IPv6.
5. SSH key: add your public key. Do not use password login.
6. **Backups: leave off.** A backup is a copy of every story. If the collective wants backups, that is a deliberate decision to make later, not a default.
7. Create the server and note its IPv4 and IPv6 addresses.

## 2. Point the domain at it

At your DNS provider, add:

| Type | Name | Value |
|------|------|-------|
| A    | tea  | the server's IPv4 |
| AAAA | tea  | the server's IPv6 |

Wait until `ping tea.example.org` from your laptop answers with the new address.

## 3. First login and basic hardening

```bash
ssh root@tea.example.org

apt update && apt -y upgrade
apt -y install ufw unattended-upgrades curl git

# Firewall: only SSH, HTTP (for the HTTPS redirect and certificates) and HTTPS.
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Security updates install themselves.
dpkg-reconfigure -plow unattended-upgrades
```

Disable SSH password login:

```bash
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Keep the system journal short. It never holds request data, but there is no reason to keep old error lines around:

```bash
mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nMaxRetentionSec=7day\nSystemMaxUse=100M\n' > /etc/systemd/journald.conf.d/short.conf
systemctl restart systemd-journald
```

## 4. Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt -y install nodejs build-essential python3
node --version   # v22.x
```

(`build-essential` and `python3` are only needed if the SQLite module has to be compiled; usually a prebuilt binary is downloaded during `npm ci`.)

## 5. Install Caddy

```bash
apt -y install debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt -y install caddy
```

## 6. Put the app on the server

```bash
# A user that owns nothing but the app.
adduser --system --group --home /opt/tea-talks --shell /usr/sbin/nologin teatalks

# Get the code. Either clone it:
git clone https://github.com/YOUR-ORG/tea-talks.git /opt/tea-talks
# or upload it from your laptop with:  rsync -a --exclude node_modules --exclude .git ./ root@tea.example.org:/opt/tea-talks/

cd /opt/tea-talks
npm ci
npm run build
npm prune --omit=dev
chown -R teatalks:teatalks /opt/tea-talks
```

## 7. Set the admin password and the archive flag

These live in one file that only root can read. The service reads it at start.

```bash
mkdir -p /etc/tea-talks
cp /opt/tea-talks/.env.example /etc/tea-talks/env
chmod 600 /etc/tea-talks/env

# Make a strong password and put it in the file:
openssl rand -base64 24
nano /etc/tea-talks/env
```

Set these lines:

```
ADMIN_PASSWORD=paste-the-generated-password-here
PUBLIC_ARCHIVE=true
DB_PATH=/var/lib/tea-talks/tea-talks.sqlite
QUICK_EXIT_URL=https://www.weather.com/
HOST=127.0.0.1
PORT=4321
```

To switch the public archive off or on: change `PUBLIC_ARCHIVE` in this file and run `systemctl restart tea-talks`. No rebuild is needed. Same for changing the password or the quick-exit site.

Share the password with moderators in person or through an end-to-end encrypted messenger, never by email.

## 8. Start the app

```bash
cp /opt/tea-talks/deploy/tea-talks.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now tea-talks
systemctl status tea-talks --no-pager
```

You should see `[tea-talks] listening on http://127.0.0.1:4321`. That address is only reachable from the server itself.

## 9. Put Caddy in front

```bash
cp /opt/tea-talks/deploy/Caddyfile /etc/caddy/Caddyfile
sed -i 's/tea.example.org/YOUR-REAL-HOSTNAME/' /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Caddy fetches a certificate from Let's Encrypt on the first request. Open `https://tea.example.org` in a browser. You should see the welcome page with a padlock.

## 10. Check the privacy promises

From your laptop:

```bash
node scripts/verify.mjs https://tea.example.org
```

On the server:

```bash
# Rows hold only id, text, status, day:
cd /opt/tea-talks && DB_PATH=/var/lib/tea-talks/tea-talks.sqlite node scripts/inspect-db.mjs

# No request lines in either log (submit a test story first, then look):
journalctl -u tea-talks --no-pager | tail
journalctl -u caddy --no-pager | tail
ls /var/log/caddy 2>/dev/null || echo "no caddy log directory, as intended"
```

The full checklist is in `docs/VERIFICATION.md`.

## Updating the app later

```bash
cd /opt/tea-talks
git pull            # or rsync the new files
npm ci && npm run build && npm prune --omit=dev
chown -R teatalks:teatalks /opt/tea-talks
systemctl restart tea-talks
```

The database is in `/var/lib/tea-talks/`, outside the app folder, so updates never touch it.

## Things to decide deliberately

- **Disk encryption.** Hetzner Cloud volumes are not encrypted at rest by default. Someone with physical access to the disk image could read the stories. Full-disk encryption on a cloud VPS is possible (via the rescue system and a LUKS root, unlocked over SSH with dropbear) but fiddly. A simpler halfway measure: keep the archive short by deleting stories once they have served their purpose.
- **Backups.** Off by default, see step 1. If you want them, encrypt them and decide who holds the key.
- **Hetzner's own logs.** Hetzner, like every host, can see traffic to and from the server at the network level. Tea Talks cannot change that. People who need to hide that they visited at all should use Tor Browser; the site works in it.
- **Snapshots.** Do not take console snapshots of the server; a snapshot is a copy of the database.
