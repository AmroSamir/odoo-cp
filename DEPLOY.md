# Fresh VPS Deployment Guide

Deploy the full Odoo CP stack (Odoo 19 Enterprise + Staging Manager + Web Dashboard) on a fresh Ubuntu 24.04 VPS.

---

## Requirements

| Item | Minimum |
|------|---------|
| OS | Ubuntu 24.04 LTS |
| RAM | 4 GB (8 GB recommended) |
| CPU | 2 vCPU |
| Disk | 40 GB SSD |
| Root SSH access | Required |

---

## Before You Start — DNS Records

Point all three A records to your VPS IP **before running the setup script**. Certbot will fail if DNS isn't resolving yet.

| Record | Example | Points to |
|--------|---------|-----------|
| `erp.yourdomain.com` | Odoo ERP | VPS IP |
| `dashboard.yourdomain.com` | Management panel | VPS IP |
| `staging.yourdomain.com` | Staging subdomains base | VPS IP (optional — only needed if you use SSL on staging instances) |

> DNS propagation can take up to 30 minutes. Check with:
> ```bash
> nslookup erp.yourdomain.com
> ```

---

## Step 1 — SSH Into Your VPS

```bash
ssh root@YOUR_VPS_IP
```

---

## Step 2 — Clone the Repo

```bash
git clone https://github.com/AmroSamir/odoo-cp.git /opt/odoo-cp
cd /opt/odoo-cp
```

---

## Step 3 — Run the Setup Script

```bash
bash setup-odoo.sh
```

The script is fully interactive. It will ask for:

| Prompt | Example | Notes |
|--------|---------|-------|
| Production domain | `erp.yourdomain.com` | Must have A record pointing to this VPS |
| Staging subdomain base | `staging.erp.yourdomain.com` | Used as base for staging instance subdomains |
| Dashboard domain | `dashboard.erp.yourdomain.com` | Where the management UI will live |
| SSL email | `admin@yourdomain.com` | Let's Encrypt renewal notifications |
| Dashboard password | *(your choice)* | Login password for the web dashboard |

After you confirm, the script runs **9 steps automatically** (~10–20 min depending on your VPS speed):

```
Step 1/9  Install system packages (curl, git, unzip, certbot, ufw)
Step 2/9  Install Docker CE from the official repository
Step 3/9  Download Odoo Enterprise add-ons from Dropbox (~900 MB)
Step 4/9  Generate Dockerfile + docker-compose.yml
Step 5/9  Generate Nginx reverse proxy config
Step 6/9  Obtain Let's Encrypt SSL certificates
Step 7/9  Create deploy scripts + backup cron
Step 8/9  Write .deploy-config, .env, staging directory, firewall
Step 9/9  Download odoo_unlimited Enterprise addon
Launch    docker compose up -d --build
```

---

## Step 4 — Verify Everything Is Running

```bash
cd /opt/odoo-cp
docker compose ps
```

Expected output:

```
NAME              STATUS          PORTS
web_odoo          Up (healthy)    0.0.0.0:8069->8069/tcp
db_odoo           Up              5432/tcp
odoo_dashboard    Up (healthy)    127.0.0.1:3000->3000/tcp
nginx_odoo        Up              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

Quick health check:

```bash
# Odoo
curl -s -o /dev/null -w "%{http_code}" http://localhost:8069
# → 303

# Dashboard API
curl -s http://localhost:3000/api/health
# → {"status":"ok","timestamp":"..."}
```

---

## Step 5 — First Odoo Database Setup

1. Open `https://erp.yourdomain.com` in your browser
2. You'll see the Odoo database creation screen
3. Fill in:
   - **Database Name**: must be **lowercase** (e.g. `mycompany-prod`) — uppercase causes errors
   - **Email / Password**: your admin credentials
   - **Language / Country**: your preference
4. Click **Create Database**

> **Save the Master DB Password** shown on this screen — you'll need it for database management.

---

## Step 6 — Activate Odoo Enterprise

After the database is created:

1. Go to **Settings → Activate Developer Mode**
2. Go to **Apps → Update Apps List**
3. Search for `unlimited` → Install **odoo_unlimited**
4. The **Activate** button appears — click it and enter any code (e.g. `abc123456`)
5. Install **Accounting** module (and any others you need)

> If you see *"currently processing another module operation"* → run:
> ```bash
> docker compose restart web
> ```
> Then retry the installation.

---

## Step 7 — Log Into the Dashboard

Open `https://dashboard.yourdomain.com` in your browser.

Enter the password you chose during setup.

You'll land on the **Instances** page showing:
- Production Odoo container (running)
- No staging instances yet

---

## Step 8 — Create Your First Staging Instance

From the dashboard → **Instances** → **+ New Staging Instance**

Or via CLI:

```bash
cd /opt/odoo-cp
bash scripts/staging-manager.sh create --name "test-01"
```

This will:
1. Clone the production database
2. Copy the production filestore
3. Start a new isolated Odoo + PostgreSQL stack on port 8171
4. Register it in `staging/.registry`

Access it at: `http://YOUR_VPS_IP:8171`

---

## Useful Commands

```bash
# View all running containers
docker compose ps

# View Odoo logs
docker logs -f web_odoo

# View dashboard logs
docker logs -f odoo_dashboard

# List staging instances
bash scripts/staging-manager.sh list

# Remove a staging instance
bash scripts/staging-manager.sh remove --name "test-01" --force

# Manual database backup
bash scripts/backup.sh

# Deploy latest code to production (git pull + rebuild)
bash scripts/deploy-prod.sh

# Renew SSL certificates manually
certbot renew && docker restart nginx_odoo
```

---

## File Locations

| Path | Purpose |
|------|---------|
| `/opt/odoo-cp/.deploy-config` | Domain, email, paths config (auto-generated) |
| `/opt/odoo-cp/.env` | Dashboard secret + admin password (keep secret) |
| `/opt/odoo-cp/staging/.registry` | JSON registry of all staging instances |
| `/opt/odoo-cp/staging/stg-*/` | Per-instance Docker stacks (not in git) |
| `/opt/backups/` | Automatic daily database backups |
| `/etc/letsencrypt/` | SSL certificates |

---

## Troubleshooting

**Certbot fails with "connection refused" or "DNS problem"**
- Check DNS has propagated: `nslookup erp.yourdomain.com`
- Make sure port 80 is not blocked: `ufw status`
- Try manually: `certbot certonly --standalone -d erp.yourdomain.com --email your@email.com --agree-tos --no-eff-email`

**Dashboard shows blank page or 502**
```bash
docker logs odoo_dashboard
# If "Frontend not built" error:
docker compose up -d --build dashboard
```

**Odoo shows unstyled/blank page after restart**
- This means the filestore volume is missing — should not happen with our setup
- Check: `docker volume ls | grep odoo-data`

**Staging instance won't start**
```bash
bash scripts/staging-manager.sh logs test-01
```

**Port 8069 not accessible**
```bash
ufw allow 8069/tcp  # only if you want direct access (not needed — use nginx)
docker compose restart nginx
```
