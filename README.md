# Odoo 19 Enterprise — Self-Hosting Platform

A complete self-hosting platform for **Odoo 19 Enterprise** with a web-based management dashboard, on-demand staging instances, automated SSL, backups, and CI/CD-ready workflow. Runs on a single VPS using Docker.

> **Created by:** Amr Afifi — amro.sa.af@gmail.com

---

## How It Works

```
setup-odoo.sh                    Dashboard UI
     │                                │
     ▼                                ▼
 Installs Docker              Deploy Production
 Sets up Dashboard             Create Staging
 Gets SSL cert                 Manage Backups
 Creates config                Deploy Updates
     │                          Monitor Server
     ▼                          SSL Management
 Dashboard ready                    │
 at your domain                     ▼
     └──────── Production Odoo deployed from dashboard ────────┘
```

1. **Run `setup-odoo.sh`** on a fresh VPS — it installs Docker, sets up the dashboard, and gets SSL
2. **Open the dashboard** in your browser and deploy production Odoo from the Setup page
3. **Manage everything** from the dashboard: instances, deployments, backups, SSL, and more

---

## Architecture

```
                         ┌─────────────────────────────────────────────┐
                         │              VPS (Ubuntu 24.04)             │
                         │                                             │
  HTTPS :443             │   ┌──────────────────────────────────────┐  │
 ────────────────────────┼──►│           NGINX (Alpine)             │  │
                         │   │   SSL termination + reverse proxy    │  │
                         │   └──────┬─────────────┬────────────────┘  │
                         │          │             │                    │
                         │          ▼             ▼                    │
                         │   ┌────────────┐ ┌──────────────────────┐  │
  dashboard.domain.com   │   │ DASHBOARD  │ │     PRODUCTION       │  │
 ────────────────────────┼──►│ Express+   │ │                      │  │
                         │   │ Next.js    │ │  Odoo 19 Enterprise  │  │
                         │   │ :3000      │ │  :8069               │  │
                         │   │            │ │         │             │  │
                         │   │ Docker API │ │         ▼             │  │
                         │   │     │      │ │  PostgreSQL 17        │  │
                         │   └─────┼──────┘ │  (pgvector)          │  │
                         │         │        └──────────────────────┘  │
                         │         │                                   │
                         │         ▼                                   │
                         │   ┌──────────────────────────────────────┐  │
                         │   │         STAGING INSTANCES            │  │
                         │   │                                      │  │
                         │   │  stg-test (:8171)  stg-demo (:8172) │  │
                         │   │  Each with own DB + filestore        │  │
                         │   │  Cloned from production data         │  │
                         │   └──────────────────────────────────────┘  │
                         └─────────────────────────────────────────────┘
```

**Services:**

| Service | Container | Port | Domain |
|---------|-----------|------|--------|
| Dashboard | `odoo_dashboard` | 3000 (internal) | `dashboard.your-domain.com` |
| Production Odoo | `web_odoo` | 8069 | `erp.your-domain.com` |
| Production DB | `db_odoo` | 5432 (internal) | — |
| Nginx | `nginx_odoo` | 80, 443 | — |
| Staging (per instance) | `stg-{name}_web` | 8171–8199 | optional SSL subdomain |

---

## Dashboard

The web dashboard provides a visual interface for managing the entire platform.

**Pages:**

| Page | What it does |
|------|-------------|
| **Setup** | First-time production Odoo deployment with real-time log streaming |
| **Instances** | View/create/start/stop/remove production and staging instances |
| **Deploy** | One-click deploy to staging or production (with backup confirmation) |
| **Backups** | View, create, and restore database backups |
| **SSL** | Certificate status, expiry dates, one-click renewal |
| **Git** | Current branch, recent commits, pull latest changes |

**Tech stack:** Next.js 14 (static export) + Express.js backend + Tailwind CSS, served from a single Docker container.

**API:** Full REST API at `/api/*` — instances, monitoring, backups, deploy, SSL, git, setup. JWT authentication with httpOnly cookies.

---

## Quick Start

### Prerequisites

- A **VPS** running **Ubuntu 22.04 or 24.04** (tested on Contabo)
- **DNS records** pointed to the server:
  - `dashboard.your-domain.com → A → YOUR_SERVER_IP`
  - `erp.your-domain.com → A → YOUR_SERVER_IP` (can be added later)

### Installation

```bash
# 1. SSH into the server
ssh root@YOUR_SERVER_IP

# 2. Clone the repo
git clone https://github.com/AmroSamir/odoo-cp.git /opt/odoo-cp
cd /opt/odoo-cp

# 3. Run the setup script
bash setup-odoo.sh
```

> **Tip:** Use `tmux` if running from a mobile terminal (Termux) to keep the session alive:
> ```bash
> apt install -y tmux && tmux
> # ... run the commands above ...
> # If disconnected: tmux attach
> ```

### What the Script Asks

```
Dashboard domain (e.g. dashboard.erp.example.com):
Email for SSL certificates (e.g. admin@example.com):
Dashboard password: ********
```

That's it. No production domain needed yet — you deploy production from the dashboard.

### What the Script Does

1. Installs system packages (git, curl, certbot, ufw, etc.)
2. Installs Docker Engine + Compose from Docker's official APT repository
3. Creates `docker-compose.yml` with dashboard + nginx only (no Odoo yet)
4. Creates nginx config for the dashboard domain
5. Gets SSL certificate via Let's Encrypt (or self-signed fallback)
6. Configures firewall (SSH, HTTP, HTTPS), Git, cron jobs
7. Builds and starts the dashboard

### After Setup

1. Open `https://dashboard.your-domain.com` and log in
2. Go to **Setup** → enter your production domain → click **Deploy Production**
3. The dashboard streams real-time logs as it:
   - Downloads Odoo Enterprise addons (~900 MB)
   - Downloads the `odoo_unlimited` activation addon
   - Generates Docker config with Odoo services
   - Gets SSL certificate for the production domain
   - Starts Odoo containers
4. Once deployed, go to `https://erp.your-domain.com` and:
   - Create a database (**name MUST be lowercase**)
   - Install `odoo_unlimited` addon (enables Enterprise activation)
   - Install Accounting
   - Register with any code (e.g. `abc123456`)

---

## Project Structure

```
odoo-cp/
├── setup-odoo.sh                          # Initial setup (dashboard only)
├── Dockerfile                             # Odoo 19 custom image
├── docker-compose.yml                     # Generated by setup scripts
├── CLAUDE.md                              # AI assistant instructions
├── README.md
├── .deploy-config                         # Generated config (domains, IP, email)
├── .env                                   # Dashboard credentials (not in Git)
│
├── dashboard/                             # Web management dashboard
│   ├── Dockerfile                         # Multi-stage: frontend build + backend
│   ├── package.json                       # Backend dependencies
│   ├── backend/
│   │   ├── server.js                      # Express entry point (:3000)
│   │   ├── config/index.js                # Environment config
│   │   ├── middleware/
│   │   │   ├── auth.js                    # JWT authentication
│   │   │   └── errorHandler.js            # Global error handling
│   │   ├── routes/
│   │   │   ├── index.js                   # Route registry
│   │   │   ├── auth.js                    # Login/logout
│   │   │   ├── setup.js                   # Production setup (SSE)
│   │   │   ├── instances.js               # Instance CRUD
│   │   │   ├── deploy.js                  # Deploy to staging/production
│   │   │   ├── backups.js                 # Backup management
│   │   │   ├── monitoring.js              # System stats
│   │   │   ├── ssl.js                     # Certificate management
│   │   │   └── git.js                     # Git operations
│   │   ├── services/
│   │   │   ├── productionSetupService.js  # First-time Odoo deployment
│   │   │   ├── stagingService.js          # Staging instance lifecycle
│   │   │   ├── dockerService.js           # Docker API interactions
│   │   │   ├── deployService.js           # Deploy orchestration
│   │   │   ├── backupService.js           # Backup operations
│   │   │   ├── monitoringService.js       # CPU/RAM/disk metrics
│   │   │   ├── sslService.js              # SSL cert management
│   │   │   └── gitService.js              # Git operations
│   │   └── utils/
│   │       ├── deployConfig.js            # Read/write .deploy-config
│   │       └── shellExec.js               # Shell command execution
│   └── frontend/                          # Next.js 14 (static export)
│       ├── package.json
│       ├── app/                           # Pages (App Router)
│       │   ├── setup/page.tsx             # Production deploy wizard
│       │   ├── instances/page.tsx         # Instance management
│       │   ├── deploy/page.tsx            # Deploy controls + history
│       │   ├── backups/page.tsx           # Backup management
│       │   ├── ssl/page.tsx               # SSL certificates
│       │   ├── git/page.tsx               # Git status
│       │   └── login/page.tsx             # Authentication
│       ├── components/
│       │   ├── layout/                    # Sidebar, TopBar
│       │   ├── instances/                 # InstanceCard, CreateInstanceModal
│       │   └── common/                    # ConfirmModal, MetricGauge, etc.
│       ├── lib/                           # api.ts, useSSE.ts, usePolling.ts
│       └── types/index.ts                # TypeScript interfaces
│
├── scripts/
│   ├── setup-production.sh                # Deploy production Odoo (called from dashboard)
│   ├── staging-manager.sh                 # On-demand staging instances
│   ├── deploy-prod.sh                     # Update production (generated)
│   ├── deploy-staging.sh                  # Update staging (generated)
│   ├── backup.sh                          # Database backup (generated)
│   ├── ttl-cleanup.sh                     # Auto-remove expired staging instances
│   └── lib/                               # Shell helper libraries
│       ├── common.sh
│       ├── docker-helpers.sh
│       └── nginx-helpers.sh
│
├── nginx/
│   └── default.conf                       # Generated nginx config
│
├── extra-addons/
│   ├── odoo_unlimited/                    # Enterprise activation (downloaded)
│   └── custom/                            # Your custom Odoo modules
│
├── addons/                                # Odoo Enterprise addons (downloaded, ~900 MB)
├── odoo-data/                             # Production filestore
├── odoo-db-data/                          # Production PostgreSQL data
└── staging/                               # Staging instances
    ├── stg-{name}/                        # Per-instance directory
    │   ├── docker-compose.yml
    │   ├── config/odoo.conf
    │   ├── data/                          # DB + filestore
    │   └── manage.sh                      # Start/stop/remove
    ├── nginx/                             # SSL configs for staging subdomains
    └── .registry                          # Instance registry (JSON)
```

**What's tracked in Git:** `setup-odoo.sh`, `Dockerfile`, `dashboard/`, `scripts/`, `nginx/`, `extra-addons/custom/`, `CLAUDE.md`, `README.md`

**What's NOT in Git:** `addons/` (~900 MB), `odoo-data/`, `odoo-db-data/`, `staging/stg-*/`, `.env`, `.deploy-config`, `*.sql`, `*.zip`

---

## Staging Instances

On-demand staging environments that clone production data. Each instance is fully isolated with its own Docker containers, database, filestore, and port.

### From the Dashboard

Click **"+ New Staging Instance"** on the Instances page. Configure name, TTL, and SSL.

### From the CLI

```bash
# Create a new staging instance (clones production DB + filestore)
bash scripts/staging-manager.sh create --name "test-invoice" --port 8171

# Create with auto-expiry and SSL
bash scripts/staging-manager.sh create --name "demo" --ttl 7 --with-ssl

# List all instances
bash scripts/staging-manager.sh list

# Start/stop/restart
bash scripts/staging-manager.sh stop --name "test-invoice"
bash scripts/staging-manager.sh start --name "test-invoice"

# View logs
bash scripts/staging-manager.sh logs --name "test-invoice" --follow

# Remove a single instance
bash scripts/staging-manager.sh remove --name "test-invoice"

# Remove all staging instances
bash scripts/staging-manager.sh remove-all
```

**Each staging instance gets:**
- Its own `docker-compose.yml` in `staging/stg-{name}/`
- Its own PostgreSQL container with cloned production data
- Its own Odoo container on a unique port (8171–8199)
- Its own filestore copied from production
- A `manage.sh` script for lifecycle management
- Optional SSL subdomain (`{name}.staging.erp.your-domain.com`)
- Optional TTL (auto-deleted after N days via cron)

---

## Development Workflow

### Custom Odoo Modules

All custom modules go in `extra-addons/custom/`. Standard Odoo 19 module structure:

```
extra-addons/custom/my_module/
├── __init__.py
├── __manifest__.py
├── models/
├── views/
├── security/
│   └── ir.model.access.csv
└── static/                    # Optional: JS, CSS, images
```

### Deploy Cycle

```
Write code locally → git push → Deploy from dashboard (or CLI) → Test on staging → Promote to production
```

**From the dashboard:**
- **Deploy** page → click "Deploy to Staging" or "Deploy to Production"
- Production deploys auto-backup the database first

**From the CLI:**
```bash
# Deploy to staging
ssh root@SERVER_IP "bash /opt/odoo-cp/scripts/deploy-staging.sh"

# Deploy to production (auto-backs up DB first)
ssh root@SERVER_IP "bash /opt/odoo-cp/scripts/deploy-prod.sh"
```

After deploying: Odoo → Apps → Update Apps List → Install/Upgrade your module.

---

## API Reference

All endpoints are under `/api/`. Authentication via JWT (httpOnly cookie). Public endpoints: `/api/auth/login`, `/api/health`, `/api/setup/status`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Login with admin password |
| `POST` | `/auth/logout` | Clear session |
| `GET` | `/setup/status` | Check if production is deployed (public) |
| `POST` | `/setup/production` | Deploy production Odoo (SSE stream) |
| `GET` | `/instances` | List all instances |
| `POST` | `/instances` | Create staging instance |
| `DELETE` | `/instances/:name` | Remove instance |
| `POST` | `/instances/:name/start` | Start instance |
| `POST` | `/instances/:name/stop` | Stop instance |
| `POST` | `/instances/:name/restart` | Restart instance |
| `GET` | `/instances/:name/logs` | Stream instance logs (SSE) |
| `GET` | `/monitoring/system` | CPU, RAM, disk stats |
| `GET` | `/monitoring/containers` | Per-container resource usage |
| `GET` | `/backups` | List all backups |
| `POST` | `/backups` | Create manual backup |
| `POST` | `/backups/:id/restore` | Restore from backup |
| `DELETE` | `/backups/:id` | Delete backup |
| `POST` | `/deploy/staging` | Deploy to staging (SSE) |
| `POST` | `/deploy/production` | Deploy to production (SSE) |
| `GET` | `/deploy/history` | Deployment history |
| `GET` | `/ssl/status` | Certificate status |
| `POST` | `/ssl/renew` | Renew certificates |
| `GET` | `/git/status` | Branch, commits, dirty state |
| `POST` | `/git/pull` | Pull latest changes |

---

## Useful Commands

### Production

```bash
docker compose up -d                     # Start all services
docker compose down                      # Stop all services
docker compose restart web               # Restart Odoo only
docker compose up -d --build web         # Rebuild Odoo
docker logs -f web_odoo                  # View Odoo logs
docker logs -f nginx_odoo               # View Nginx logs
docker logs -f odoo_dashboard            # View dashboard logs
```

### Database

```bash
# Backup
docker exec db_odoo pg_dumpall -U odoo > backup.sql

# Connect to PostgreSQL shell
docker exec -it db_odoo psql -U odoo -d YOUR_DB_NAME

# List databases
docker exec db_odoo psql -U odoo -l
```

### SSL

```bash
# Renew all certificates
docker stop nginx_odoo
certbot renew
docker start nginx_odoo

# Get a new certificate manually
docker compose down
certbot certonly --standalone -d your-domain.com --email your@email.com --agree-tos --no-eff-email
docker compose up -d
```

### Dashboard

```bash
# Rebuild dashboard after code changes
docker compose up -d --build dashboard

# View dashboard environment
docker exec odoo_dashboard env | grep -E "PROJECT_ROOT|NODE_ENV"
```

---

## Odoo Enterprise Activation

After deploying production from the dashboard:

1. Go to `https://erp.your-domain.com` → Create database (**must be lowercase name**)
2. **Settings** → Enable **Developer Mode**
3. **Apps** → **Update Apps List**
4. Search `unlimited` → Install **odoo_unlimited** (the "Activate" button appears after this)
5. Install **Accounting** module
   - If you get "currently processing another module operation": `docker compose restart web`, wait 30s, retry
6. Main menu → **Register** → Enter any code (e.g. `abc123456`)

---

## Known Issues & Fixes

### Database name must be lowercase

**Error:** `'NoneType' object has no attribute 'uid'` during database creation
**Fix:** Use `my-prod`, never `My-Prod`. This is a hard Odoo 19 requirement.

### "Activate" button not appearing

**Cause:** `odoo_unlimited` not installed yet.
**Fix:** Developer Mode → Apps → Update Apps List → Search "unlimited" → Install.

### "Currently processing another module operation"

**Fix:** `docker compose restart web` — wait 30 seconds, then retry the install.

### SSL shows "Not Secure"

**Cause:** DNS wasn't pointed when setup ran; self-signed certs were created.
**Fix:** Point DNS, then from the dashboard SSL page click Renew, or manually:
```bash
docker compose down
rm -rf /etc/letsencrypt/live/your-domain.com /etc/letsencrypt/renewal/your-domain.com.conf
certbot certonly --standalone -d your-domain.com --email your@email.com --agree-tos --no-eff-email
docker compose up -d
```

### Broken CSS/JS — unstyled pages

**Cause:** Filestore volume (`/var/lib/odoo`) not mounted.
**Fix:** The `setup-production.sh` script handles this automatically. If assets are corrupted:
```bash
docker exec -it db_odoo psql -U odoo -d YOUR_DB_NAME -c \
  "DELETE FROM ir_attachment WHERE mimetype IN ('application/javascript', 'text/css') AND url LIKE '/web/assets/%';"
docker compose restart web
```

### Real-time chat not working

**Cause:** Websocket misconfigured.
**Note:** In Odoo 19, websocket runs on port **8069** (same as web), not 8072. The generated nginx config handles this correctly.

### `docker-compose-plugin` not found

**Cause:** Docker installed from Ubuntu's default repos.
**Fix:** The setup script installs from Docker's official APT repository. If running manually, follow [Docker's install guide](https://docs.docker.com/engine/install/ubuntu/).

---

## Automated Maintenance

| Schedule | Task | Details |
|----------|------|---------|
| Daily 2:00 AM | Database backup | Saves to `/opt/backups/`, auto-deletes after 30 days |
| Daily 3:00 AM | SSL renewal | Checks and renews via certbot |
| Configurable | Staging TTL cleanup | Removes expired staging instances |

---

## Configuration

All configuration is stored in `.deploy-config` (excluded from Git):

```bash
DOMAIN_PROD=erp.your-domain.com          # Set when production is deployed from dashboard
DOMAIN_STAGING=staging.erp.your-domain.com
DOMAIN_DASHBOARD=dashboard.erp.your-domain.com
SSL_EMAIL=admin@your-domain.com
SERVER_IP=203.0.113.1
INSTALL_DIR=/opt/odoo-cp
BACKUP_DIR=/opt/backups
```

Dashboard credentials are in `.env`:

```bash
DASHBOARD_SECRET=<random-hex>            # JWT signing key
DASHBOARD_ADMIN_PASSWORD=<your-password> # Login password
```

---

## Security Notes

- Change default PostgreSQL passwords (`odoo`/`odoo`) in production
- The Odoo Master DB password is required for database operations — save it securely
- Dashboard credentials are in `.env` (never committed to Git)
- The Docker socket is mounted read-only in the dashboard container
- Firewall only allows SSH (22), HTTP (80), HTTPS (443)
- All dashboard API routes require JWT authentication except login and setup status

---

## License

LGPL-3
