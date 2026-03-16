# Odoo 19 Enterprise — Deployment & Development Guide

> **Created by:** Amr Afifi — amro.sa.af@gmail.com

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   Odoo 19 Enterprise  ─  Production + Staging Infrastructure       │
│                                                                     │
├──────────────────────┬──────────────────────────────────────────────┤
│                      │                                              │
│   DEVELOPER          │   VPS                                        │
│                      │                                              │
│   ┌──────────────┐   │   ┌──────────────────────────────────────┐  │
│   │  Claude Code  │───┼──►│  Git Repo  (/opt/odoo19e-docker)    │  │
│   │  (local dev)  │   │   └──────┬───────────────────────────────┘  │
│   └──────┬───────┘   │          │ git pull                         │
│          │ git push   │          ▼                                  │
│          │            │   ┌──────────────────────────────────────┐  │
│          │            │   │  deploy-staging.sh / deploy-prod.sh  │  │
│          │            │   └──────┬──────────────┬────────────────┘  │
│          │            │          │              │                   │
│          │            │          ▼              ▼                   │
│          │            │   ┌─────────────────────────────────────┐  │
│          │            │   │          NGINX  (:80 → :443)        │  │
│          │            │   │   SSL via Let's Encrypt             │  │
│          │            │   └──────┬──────────────┬───────────────┘  │
│          │            │          │              │                   │
│          │            │          ▼              ▼                   │
│          │            │                                            │
│          │            │   ┏━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━━┓  │
│          │            │   ┃  PRODUCTION  ┃  ┃     STAGING      ┃  │
│          │            │   ┃              ┃  ┃                  ┃  │
│          │            │   ┃  your-prod.  ┃  ┃  your-staging.   ┃  │
│          │            │   ┃  domain.com  ┃  ┃  domain.com      ┃  │
│          │            │   ┃ ┌──────────┐ ┃  ┃ ┌──────────────┐ ┃  │
│          │            │   ┃ │ web_odoo │ ┃  ┃ │ web_odoo_    │ ┃  │
│          │            │   ┃ │ :8069    │ ┃  ┃ │ staging      │ ┃  │
│          │            │   ┃ │ :8072 ws │ ┃  ┃ │ :8169        │ ┃  │
│          │            │   ┃ └────┬─────┘ ┃  ┃ │ :8172 ws     │ ┃  │
│          │            │   ┃      │       ┃  ┃ └──────┬───────┘ ┃  │
│          │            │   ┃      ▼       ┃  ┃        ▼         ┃  │
│          │            │   ┃ ┌──────────┐ ┃  ┃ ┌──────────────┐ ┃  │
│          │            │   ┃ │ db_odoo  │ ┃  ┃ │ db_odoo_     │ ┃  │
│          │            │   ┃ │ PG 17    │ ┃  ┃ │ staging      │ ┃  │
│          │            │   ┃ │ pgvector │ ┃  ┃ │ PG 17        │ ┃  │
│          │            │   ┃ └──────────┘ ┃  ┃ └──────────────┘ ┃  │
│          │            │   ┗━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━━┛  │
│          │            │                                            │
│          │            │   ┌─────────────────────────────────────┐  │
│          │            │   │        SHARED VOLUMES               │  │
│          │            │   │                                     │  │
│          │            │   │  extra-addons/          (plugins)   │  │
│          │            │   │  extra-addons/custom/   (your dev)  │  │
│          │            │   │  addons/          (Community core)  │  │
│          │            │   └─────────────────────────────────────┘  │
│          │            │                                            │
└──────────┴────────────┴────────────────────────────────────────────┘

 WORKFLOW:  code locally  →  git push  →  deploy staging  →  verify  →  deploy prod
```

**Ports:**

| Environment | HTTPS | Direct |
|---|---|---|
| Production | `https://YOUR_PROD_DOMAIN` | `:8069` |
| Staging | `https://YOUR_STAGING_DOMAIN` | `:8169` |

---

## Repository Structure

```
odoo19e-docker/
├── docker-compose.yml              # Production + Staging (single file)
├── Dockerfile
├── extra-addons/                   # Enterprise plugins + custom modules
│   ├── odoo_unlimited/             # Enterprise activation module
│   └── custom/                     # Your custom modules
├── addons/                         # Community + Enterprise addons (from zip)
├── odoo-data/                      # Production filestore (persistent)
├── odoo-data-staging/              # Staging filestore (persistent)
├── nginx/
│   └── default.conf                # Reverse proxy + SSL config
├── scripts/
│   ├── deploy-prod.sh              # One-command production deploy
│   ├── deploy-staging.sh           # One-command staging deploy
│   ├── clone-prod-to-staging.sh    # Copy prod DB to staging
│   └── backup.sh                   # Database backup
├── .deploy-config                  # Generated config (domains, IP, email)
├── .gitignore
└── README.md
```

---

## Source Files

### Dockerfile

```dockerfile
FROM odoo:19

USER root

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    wkhtmltopdf \
    python3-google-auth \
    python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Install Python libraries
RUN pip3 install imgkit google-auth --break-system-packages

USER odoo
```

### Docker Compose (Production + Staging — Single File)

Staging services use Docker Compose **profiles**. By default only production starts. Add `--profile staging` to include staging. The setup script generates this file with your actual domains.

```yaml
# docker-compose.yml
services:

  # ============================================================
  #  PRODUCTION  —  YOUR_PROD_DOMAIN
  # ============================================================
  web:
    build: .
    container_name: web_odoo
    user: root
    depends_on:
      - db
    ports:
      - "8069:8069"
      - "8072:8072"
    environment:
      - HOST=db
      - USER=odoo
      - PASSWORD=odoo
      - ODOO_PROXY_MODE=True
    volumes:
      - /opt/odoo19e-docker/extra-addons:/mnt/extra-addons
      - /opt/odoo19e-docker/addons:/usr/lib/python3/dist-packages/odoo/addons
      - /opt/odoo19e-docker/odoo-data:/var/lib/odoo
    restart: unless-stopped

  db:
    image: pgvector/pgvector:pg17
    container_name: db_odoo
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: odoo
      POSTGRES_PASSWORD: odoo
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - /opt/odoo19e-docker/odoo-db-data:/var/lib/postgresql/data/pgdata
    restart: unless-stopped

  # ============================================================
  #  STAGING  —  YOUR_STAGING_DOMAIN
  # ============================================================
  web-staging:
    build: .
    container_name: web_odoo_staging
    user: root
    depends_on:
      - db-staging
    ports:
      - "8169:8069"
      - "8172:8072"
    environment:
      - HOST=db-staging
      - USER=odoo_staging
      - PASSWORD=odoo_staging
      - ODOO_PROXY_MODE=True
    volumes:
      - /opt/odoo19e-docker/extra-addons:/mnt/extra-addons
      - /opt/odoo19e-docker/addons:/usr/lib/python3/dist-packages/odoo/addons
      - /opt/odoo19e-docker/odoo-data-staging:/var/lib/odoo
    restart: unless-stopped
    profiles:
      - staging

  db-staging:
    image: pgvector/pgvector:pg17
    container_name: db_odoo_staging
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: odoo_staging
      POSTGRES_PASSWORD: odoo_staging
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - /opt/odoo19e-docker/odoo-db-data-staging:/var/lib/postgresql/data/pgdata
    restart: unless-stopped
    profiles:
      - staging

  # ============================================================
  #  NGINX  —  Reverse Proxy + SSL
  # ============================================================
  nginx:
    image: nginx:alpine
    container_name: nginx_odoo
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /opt/odoo19e-docker/nginx/default.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    depends_on:
      - web
    restart: unless-stopped
```

### Nginx Configuration

The setup script generates this with your actual domains. Below is the template:

```nginx
# nginx/default.conf

# ── Redirect HTTP → HTTPS ──────────────────────────────────
server {
    listen 80;
    server_name YOUR_PROD_DOMAIN YOUR_STAGING_DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# ── Production ──────────────────────────────────────────────
server {
    listen 443 ssl;
    server_name YOUR_PROD_DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/YOUR_PROD_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_PROD_DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    access_log /var/log/nginx/odoo-access.log;
    error_log /var/log/nginx/odoo-error.log;

    client_max_body_size 200M;
    proxy_read_timeout 720s;
    proxy_connect_timeout 720s;
    proxy_send_timeout 720s;

    location / {
        proxy_pass http://web:8069;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /websocket {
        proxy_pass http://web:8069;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location ~* /web/static/ {
        proxy_pass http://web:8069;
        proxy_cache_valid 200 60m;
        proxy_buffering on;
        expires 24h;
    }
}

# ── Staging ─────────────────────────────────────────────────
server {
    listen 443 ssl;
    server_name YOUR_STAGING_DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/YOUR_STAGING_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_STAGING_DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    client_max_body_size 200M;
    proxy_read_timeout 720s;
    proxy_connect_timeout 720s;
    proxy_send_timeout 720s;

    location / {
        proxy_pass http://web-staging:8069;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /websocket {
        proxy_pass http://web-staging:8069;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location ~* /web/static/ {
        proxy_pass http://web-staging:8069;
        proxy_cache_valid 200 60m;
        proxy_buffering on;
        expires 24h;
    }
}
```

---

---

# Deployment Methods

There are **two ways** to deploy. Choose one.

---

## Method A — Automated Script (Recommended)

A single script that handles everything. It asks you for your domains and email at the start, then runs fully automatically.

### Prerequisites

- A fresh **VPS** running **Ubuntu 22.04 or 24.04**
- **DNS records** pointed to the server IP (for SSL to work on first run):
  - `YOUR_PROD_DOMAIN → A → YOUR_SERVER_IP`
  - `YOUR_STAGING_DOMAIN → A → YOUR_SERVER_IP`
- If DNS isn't ready, the script creates temporary self-signed certs — you fix SSL later

### How to Run

```bash
# 1. SSH into the server
ssh root@YOUR_SERVER_IP

# 2. Clone the repo
git clone https://github.com/AmroSamir/odoo-cp.git /opt/odoo-cp
cd /opt/odoo-cp

# 3. Run the setup script (fully interactive, ~15 min)
bash setup-odoo.sh

# 4. Check everything started
docker compose ps
```

> **Tip:** If you're running from a mobile terminal (Termux), use `tmux` to keep the session alive:
> ```bash
> apt update && apt install -y tmux
> tmux
> # ... run the commands above ...
> # If disconnected, reconnect with: tmux attach
> ```

### What It Asks You

```
Production domain (e.g. erp.example.com): 
Staging domain [staging-erp.example.com]: 
Email for SSL certificates (e.g. admin@example.com): 
```

The staging domain defaults to `staging-` + your production domain. Press Enter to accept.

### What the Script Does (in order)

1. Installs system packages (git, curl, unzip, certbot, ufw, etc.)
2. Installs Docker Engine + Compose from Docker's **official APT repository**
3. Downloads `odoo19e-docker.zip` from Dropbox and extracts it
4. Moves `odoo_unlimited` to the correct addons path (if found in the zip)
5. Creates the `Dockerfile`, `docker-compose.yml`, and `nginx/default.conf` using your domains
6. Generates SSL certificates via Let's Encrypt (or self-signed fallback)
7. Creates deploy scripts (`deploy-prod.sh`, `deploy-staging.sh`, `backup.sh`, `clone-prod-to-staging.sh`)
8. Initializes Git repository and configures firewall (SSH, HTTP, HTTPS only)
9. Downloads `odoo_unlimited.zip` addon from Dropbox and installs it to `extra-addons/` (overwrites if exists)
10. Builds and launches both production and staging containers
11. Sets up cron jobs for SSL auto-renewal (3 AM) and daily DB backups (2 AM)
12. Saves your configuration to `.deploy-config` for future reference

### After the Script Finishes

Follow the **Odoo Enterprise Activation** steps below.

---

## Method B — Manual Deployment (Step by Step)

### Step 1: Prepare the Server

```bash
ssh root@YOUR_SERVER_IP

apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg lsb-release git unzip sed certbot ufw dnsutils
```

### Step 2: Install Docker (Official Repository)

```bash
# Remove conflicting packages
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
  apt remove -y $pkg 2>/dev/null || true
done

# Add Docker GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${VERSION_CODENAME:-$UBUNTU_CODENAME}") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker && systemctl start docker

# Verify
docker --version
docker compose version
```

### Step 3: Download Odoo from Dropbox

```bash
cd /opt

wget "https://www.dropbox.com/scl/fi/rtt0vplxrao3elzk3fooz/odoo19e-docker.zip?rlkey=k1vwn8g2s1eao07kc6hqnyusp&st=29zgcif9&dl=1" -O odoo19e-docker.zip

unzip odoo19e-docker.zip
cd odoo19e-docker
```

### Step 4: Verify Folder Structure

```bash
ls /opt/odoo19e-docker/
# Expected: addons/  extra-addons/  Dockerfile

ls /opt/odoo19e-docker/addons/ | head -5
# Expected: base, account, account_accountant, etc.
```

If `odoo_unlimited` is at the root level, move it:

```bash
mkdir -p /opt/odoo19e-docker/extra-addons
mv /opt/odoo19e-docker/odoo_unlimited /opt/odoo19e-docker/extra-addons/odoo_unlimited
```

Create a directory for custom modules:

```bash
mkdir -p /opt/odoo19e-docker/extra-addons/custom
```

### Step 5: Create Configuration Files

Create the `Dockerfile`, `docker-compose.yml`, and `nginx/default.conf` using the contents from the **Source Files** section above. Replace all `YOUR_PROD_DOMAIN` and `YOUR_STAGING_DOMAIN` placeholders with your actual domains.

```bash
nano /opt/odoo19e-docker/Dockerfile
nano /opt/odoo19e-docker/docker-compose.yml
mkdir -p /opt/odoo19e-docker/nginx
nano /opt/odoo19e-docker/nginx/default.conf
```

### Step 6: Set Up DNS

Point both domains to your server IP:

```
YOUR_PROD_DOMAIN      →  A  →  YOUR_SERVER_IP
YOUR_STAGING_DOMAIN   →  A  →  YOUR_SERVER_IP
```

### Step 7: Generate SSL Certificates

```bash
mkdir -p /var/www/certbot
docker compose down 2>/dev/null || true

certbot certonly --standalone \
  -d YOUR_PROD_DOMAIN \
  --email YOUR_EMAIL \
  --agree-tos --no-eff-email

certbot certonly --standalone \
  -d YOUR_STAGING_DOMAIN \
  --email YOUR_EMAIL \
  --agree-tos --no-eff-email

# Auto-renewal cron
echo "0 3 * * * certbot renew --quiet --pre-hook 'docker stop nginx_odoo' --post-hook 'docker start nginx_odoo'" | crontab -
```

### Step 8: Download odoo_unlimited Enterprise Addon

```bash
cd /opt/odoo19e-docker

# Download and extract (overwrites existing if present)
rm -rf extra-addons/odoo_unlimited
wget "https://www.dropbox.com/scl/fi/8f9l9h2w1z8r6qkzefc97/odoo_unlimited.zip?rlkey=a4j5kpiktxc06827tzelj5j4r&st=ju8fh4oi&dl=1" -O /tmp/odoo_unlimited.zip
unzip -o /tmp/odoo_unlimited.zip -d extra-addons/
rm -f /tmp/odoo_unlimited.zip

# Verify
ls extra-addons/odoo_unlimited/
```

### Step 9: Launch Odoo

```bash
cd /opt/odoo19e-docker

docker compose up -d --build                     # Production
docker compose --profile staging up -d --build    # Staging
```

### Step 10: Set Up Firewall

```bash
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable
```

### Step 11: Initialize Git Repository

```bash
cd /opt/odoo19e-docker

cat > .gitignore << 'EOF'
.env
.deploy-config
odoo-db-data/
odoo-db-data-staging/
odoo-data/
odoo-data-staging/
*.pyc
__pycache__/
backups/
*.sql
*.zip
EOF

git init
git add .
git commit -m "initial: Odoo 19 Enterprise setup"
git remote add origin YOUR_GIT_REPO_URL
git push -u origin main
```

---

---

# Odoo Enterprise Activation

After deployment (both methods), complete these steps through the Odoo web UI. Do this for **both** production and staging.

### Step 1: Create a Database

Open `https://YOUR_PROD_DOMAIN/web/database/create` (or `http://YOUR_SERVER_IP:8069`)

| Field | Value |
|---|---|
| Master Password | Choose a strong one — **save it!** |
| Database Name | **Must be lowercase!** e.g. `my-production` |
| Email | Your admin email |
| Password | Your admin login password |
| Language | Your preferred language |
| Country | Your country |
| Demo Data | Unchecked |

> **⚠️ CRITICAL: Database names must be lowercase.**
> Using uppercase letters (e.g. `My-Production`) causes the error:
> `Database creation error: 'NoneType' object has no attribute 'uid'`
> Always use lowercase: `my-production`, `my-staging`.

### Step 2: Install `odoo_unlimited`

The `odoo_unlimited` addon is already downloaded to `extra-addons/` by the setup script. You just need to install it in Odoo.

1. Go to **Settings** → Enable **Developer Mode** (bottom of the page)
2. Go to **Apps** → Click **Update Apps List** → Confirm
3. Search for `unlimited`
4. If `odoo_unlimited` appears → Install it
5. If it does NOT appear → upload it manually via **Apps** → **Upload Module**

The "Activate" button for Enterprise **will appear after** installing `odoo_unlimited`.

### Step 3: Activate Enterprise Modules

1. Go to **Apps** → Install **Accounting** (do this one first!)
2. If you get this error:
   > `Invalid Operation: Odoo is currently processing another module operation.`
   
   **Fix:** Restart Odoo, then retry:
   ```bash
   docker compose restart web          # for production
   # or
   docker compose --profile staging restart web-staging   # for staging
   ```
   Wait 30 seconds, then go back and install Accounting again.
3. Install any other Enterprise modules you need

### Step 4: Register

1. Return to the main menu
2. Click **Register**
3. Enter any code — e.g. `abc123456`

**Enterprise is now activated.**

### Repeat for Staging

Do Steps 1–4 for staging at `https://YOUR_STAGING_DOMAIN` (or `http://YOUR_SERVER_IP:8169`), using a different database name like `my-staging`.

---

---

# Day-to-Day Development with Claude Code

### Making Changes

```bash
# Edit custom modules locally
# Example: extra-addons/custom/my_module/__manifest__.py

git add .
git commit -m "feat: add custom module"
git push origin main
```

### Deploy to Staging First (Always)

```bash
ssh root@YOUR_SERVER_IP "bash /opt/odoo19e-docker/scripts/deploy-staging.sh"
```

Test at `https://YOUR_STAGING_DOMAIN` — verify everything works.

### Promote to Production

```bash
ssh root@YOUR_SERVER_IP "bash /opt/odoo19e-docker/scripts/deploy-prod.sh"
```

This automatically backs up the production database before deploying.

### Deploy Scripts Reference

**`scripts/deploy-staging.sh`** — pulls latest code, rebuilds staging:

```bash
#!/bin/bash
set -e
cd /opt/odoo19e-docker
git pull origin main
docker compose --profile staging up -d --build web-staging
```

**`scripts/deploy-prod.sh`** — pulls code, backs up DB, rebuilds production:

```bash
#!/bin/bash
set -e
cd /opt/odoo19e-docker
git pull origin main
docker exec db_odoo pg_dumpall -U odoo > /opt/backups/odoo-prod-$(date +%Y%m%d-%H%M%S).sql
docker compose up -d --build web
```

**`scripts/clone-prod-to-staging.sh`** — copies production DB to staging for testing with real data. Interactive — asks for database names.

**`scripts/backup.sh`** — manual or cron-triggered backup. Auto-deletes backups older than 30 days.

---

---

# Useful Commands

### Production

```bash
docker compose up -d                  # Start
docker compose down                   # Stop
docker logs -f web_odoo               # Logs
docker compose restart web            # Restart (no rebuild)
docker compose up -d --build web      # Rebuild
```

### Staging

```bash
docker compose --profile staging up -d                      # Start
docker compose --profile staging stop web-staging db-staging # Stop
docker logs -f web_odoo_staging                              # Logs
docker compose --profile staging up -d --build web-staging   # Rebuild
```

### Both

```bash
docker compose --profile staging up -d          # Start all
docker compose --profile staging down           # Stop all
docker compose --profile staging up -d --build  # Rebuild all
```

### Database

```bash
docker exec db_odoo pg_dumpall -U odoo > backup.sql                     # Backup
docker exec -it db_odoo psql -U odoo -d YOUR_DB_NAME                    # Shell (prod)
docker exec -it db_odoo_staging psql -U odoo_staging -d YOUR_DB_NAME    # Shell (staging)
```

### SSL

```bash
# Fix SSL after DNS is pointed (replace self-signed with real certs)
docker compose --profile staging down
rm -rf /etc/letsencrypt/live/YOUR_PROD_DOMAIN
rm -rf /etc/letsencrypt/live/YOUR_STAGING_DOMAIN
rm -rf /etc/letsencrypt/renewal/YOUR_PROD_DOMAIN.conf
rm -rf /etc/letsencrypt/renewal/YOUR_STAGING_DOMAIN.conf
certbot certonly --standalone -d YOUR_PROD_DOMAIN --email YOUR_EMAIL --agree-tos --no-eff-email
certbot certonly --standalone -d YOUR_STAGING_DOMAIN --email YOUR_EMAIL --agree-tos --no-eff-email
docker compose --profile staging up -d

# Manual renewal
certbot renew && docker restart nginx_odoo
```

---

---

# Known Issues & Fixes

### 1. `'NoneType' object has no attribute 'uid'` during database creation

**Cause:** Database name contains uppercase letters.
**Fix:** Always use **lowercase** names. Use `my-prod` not `My-Prod`.

### 2. "Activate" button not appearing

**Cause:** `odoo_unlimited` module not installed yet.
**Fix:** Developer Mode → Apps → Update Apps List → Search "unlimited" → Install. If it doesn't appear, upload manually.

### 3. `Invalid Operation: currently processing another module operation`

**Cause:** Installing modules too quickly after Enterprise activation.
**Fix:** Restart Odoo and retry:
```bash
docker compose restart web
```

### 4. SSL shows "Not Secure"

**Cause:** DNS wasn't pointed when setup ran; self-signed certs were created.
**Fix:** See SSL commands above — remove self-signed certs, run certbot, restart.

### 5. `docker-compose-plugin` package not found

**Cause:** Docker installed from Ubuntu default repos instead of Docker's official repo.
**Fix:** Use the automated script (handles this), or follow Step 2 in Manual Deployment.

### 6. Broken CSS/JS — unstyled login page or blank white page after login

**Cause:** Odoo's filestore (`/var/lib/odoo`) is not mounted as a persistent volume. When the container restarts, compiled CSS/JS assets are lost and Odoo can't serve them.
**Fix:** Add a filestore volume to both `web` and `web-staging` services in `docker-compose.yml`:
```yaml
volumes:
  - /opt/odoo19e-docker/odoo-data:/var/lib/odoo        # for production
  - /opt/odoo19e-docker/odoo-data-staging:/var/lib/odoo # for staging
```
Then rebuild: `docker compose --profile staging up -d --build`

If assets are already corrupted, clear them and restart:
```bash
docker exec -it db_odoo psql -U odoo -d YOUR_DB_NAME -c \
  "DELETE FROM ir_attachment WHERE mimetype IN ('application/javascript', 'text/css') AND url LIKE '/web/assets/%';"
docker compose restart web
```

### 7. Real-time chat/notifications not working (Discuss messages delayed)

**Cause:** Nginx websocket proxy pointing to port `8072`. In Odoo 19, the websocket is served on port `8069` (same as the web server), not on a separate gevent port.
**Fix:** In `nginx/default.conf`, change the websocket `proxy_pass` from `8072` to `8069`:
```nginx
location /websocket {
    proxy_pass http://web:8069;       # NOT 8072
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_read_timeout 86400;
}
```
Then restart Nginx: `docker restart nginx_odoo`

---

---

# Automated Maintenance

| Schedule | Task | Details |
|---|---|---|
| Daily 2:00 AM | Database backup | `/opt/backups/`, auto-deletes after 30 days |
| Daily 3:00 AM | SSL renewal | Checks and renews if needed |

---

# Security Notes

- Change default database passwords (`odoo`/`odoo`) in production
- The Master DB password is required for all database operations — **save it securely**
- Restrict staging access by IP if needed (Nginx `allow`/`deny`)
- Never commit `.env` files, database dumps, or zip files to Git
- Your domains, email, and server IP are saved in `.deploy-config` (excluded from Git)

---

---

# Quick Reference

| Action | Command |
|---|---|
| Start production | `docker compose up -d` |
| Start all | `docker compose --profile staging up -d` |
| Deploy staging | `ssh root@IP "bash /opt/odoo19e-docker/scripts/deploy-staging.sh"` |
| Deploy production | `ssh root@IP "bash /opt/odoo19e-docker/scripts/deploy-prod.sh"` |
| Clone prod → staging | `bash /opt/odoo19e-docker/scripts/clone-prod-to-staging.sh` |
| Backup prod DB | `docker exec db_odoo pg_dumpall -U odoo > backup.sql` |
| Restart prod Odoo | `docker compose restart web` |
| Restart staging Odoo | `docker compose --profile staging restart web-staging` |
| Renew SSL | `certbot renew && docker restart nginx_odoo` |
| Prod logs | `docker logs -f web_odoo` |
| Staging logs | `docker logs -f web_odoo_staging` |
| View saved config | `cat /opt/odoo19e-docker/.deploy-config` |
