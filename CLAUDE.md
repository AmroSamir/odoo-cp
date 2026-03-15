# CLAUDE.md — Odoo 19 Enterprise: Deployment, Management & Development Platform

> **Created by:** Amr Afifi (amro.sa.af@gmail.com)
> **GitHub:** https://github.com/AmroSamir/odoo19e-docker

---

## 1. Project Overview

This project is an **Odoo 19 Enterprise** self-hosting platform with a **web-based management dashboard** for deploying, managing, and scaling Odoo instances. It runs on a single Contabo VPS using Docker, with automated SSL, backups, and CI/CD via GitHub.

The platform has **three major components**:

1. **Odoo 19 Enterprise** — the ERP system (already deployed and running)
2. **Advanced Staging Manager** — on-demand staging instances that clone production data
3. **Management Dashboard** — a web UI for controlling everything visually

---

## 2. Current Infrastructure (Already Built)

### Server Details

- **Provider:** Contabo VPS (Ubuntu 24.04)
- **Production Domain:** `erp.amro.pro`
- **Staging Domain:** `staging-erp.amro.pro`
- **SSL:** Let's Encrypt (auto-renewal via cron)
- **SSL Email:** `amro.sa.af@gmail.com`

### Tech Stack

- **Odoo:** Version 19 Enterprise
- **Python:** 3.12
- **Database:** PostgreSQL 17 with pgvector (`pgvector/pgvector:pg17`)
- **Containerization:** Docker + Docker Compose
- **Reverse Proxy:** Nginx (Alpine) with SSL termination
- **Base Image:** `odoo:19` official Docker image

### Directory Structure (on VPS)

```
/opt/odoo19e-docker/
├── docker-compose.yml              # Production + Staging (single file, profiles)
├── Dockerfile                      # Custom Odoo image (wkhtmltopdf, google-auth)
├── extra-addons/
│   ├── odoo_unlimited/             # Enterprise activation module
│   └── custom/                     # Custom modules (Git-tracked)
├── addons/                         # Community + Enterprise core addons (from Dropbox zip)
├── odoo-data/                      # Production filestore (persistent volume)
├── odoo-data-staging/              # Staging filestore (persistent volume)
├── odoo-db-data/                   # Production PostgreSQL data
├── odoo-db-data-staging/           # Staging PostgreSQL data
├── nginx/
│   └── default.conf                # Reverse proxy + SSL + websocket
├── scripts/
│   ├── deploy-prod.sh              # Git pull + backup + rebuild production
│   ├── deploy-staging.sh           # Git pull + rebuild staging
│   ├── clone-prod-to-staging.sh    # Clone production DB to staging
│   └── backup.sh                   # Database backup with 30-day rotation
├── setup-odoo.sh                   # Automated full deployment script
├── CLAUDE.md                       # This file
├── README.md                       # Deployment & development guide
├── .gitignore
└── .deploy-config                  # Generated config (domains, IP, email)
```

### Git Repository Structure

Only lightweight config files are tracked in Git. Large files are excluded:

**In Git:** `docker-compose.yml`, `Dockerfile`, `nginx/`, `scripts/`, `setup-odoo.sh`, `README.md`, `CLAUDE.md`, `extra-addons/custom/`

**NOT in Git (via .gitignore):** `addons/` (~900MB), `odoo-data/`, `odoo-db-data/`, `*.sql`, `*.zip`, `.env`, `.deploy-config`

### Docker Compose Services

```yaml
# Production
web          → Odoo 19 on port 8069 (container: web_odoo)
db           → PostgreSQL 17 (container: db_odoo)

# Staging (activated with --profile staging)
web-staging  → Odoo 19 on port 8169 (container: web_odoo_staging)
db-staging   → PostgreSQL 17 (container: db_odoo_staging)

# Reverse Proxy
nginx        → Nginx Alpine on ports 80/443 (container: nginx_odoo)
```

### Source Files

**Dropbox URLs (used by setup-odoo.sh):**
- Base package: `https://www.dropbox.com/scl/fi/rtt0vplxrao3elzk3fooz/odoo19e-docker.zip?rlkey=k1vwn8g2s1eao07kc6hqnyusp&st=29zgcif9&dl=1`
- Enterprise addon: `https://www.dropbox.com/scl/fi/8f9l9h2w1z8r6qkzefc97/odoo_unlimited.zip?rlkey=a4j5kpiktxc06827tzelj5j4r&st=ju8fh4oi&dl=1`

---

## 3. Critical Odoo 19 Knowledge (Learned from Deployment)

These are **must-know** facts for anyone working with this setup:

### Database Rules
- Database names **must be lowercase** — uppercase causes `'NoneType' object has no attribute 'uid'` error
- Example: use `numo-prod`, NOT `Numo-Production`

### Enterprise Activation Flow
1. Create database (lowercase name)
2. Install `odoo_unlimited` addon FIRST — the "Activate" button only appears after this
3. Install Accounting module
4. If "Invalid Operation: currently processing another module operation" error → run `docker compose restart web` then retry
5. Register with any code (e.g. `abc123456`)

### Websocket Configuration
- In Odoo 19, websocket runs on **port 8069** (same as web server), NOT on port 8072
- Nginx websocket proxy must point to `web:8069`, not `web:8072`
- Required Nginx directives for websocket:
  ```nginx
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "Upgrade";
  proxy_read_timeout 86400;
  ```

### Filestore Persistence
- `/var/lib/odoo` must be mounted as a persistent volume (`odoo-data:/var/lib/odoo`)
- Without this, compiled CSS/JS assets are lost on container restart → blank/unstyled pages
- Both `web` and `web-staging` services need their own filestore volume

### Nginx Proxy Headers
- Use `$http_host` (not `$host`) for the Host header — preserves original hostname for Odoo asset URLs
- All proxy headers should be inside each `location` block, not at server level

### Docker Installation
- Must use Docker's **official APT repository** — Ubuntu's default `docker.io` package doesn't include `docker-compose-plugin`
- SSL with certbot: server may return IPv6 from `curl ifconfig.me` but DNS resolves to IPv4 — try certbot directly instead of comparing IPs

---

## 4. Development Workflow (Current)

### Custom Module Development

All custom modules go in `extra-addons/custom/`. Standard Odoo 19 module structure:

```
extra-addons/custom/module_name/
├── __init__.py
├── __manifest__.py
├── models/
│   ├── __init__.py
│   └── model_name.py
├── views/
│   └── model_name_views.xml
├── security/
│   └── ir.model.access.csv
├── data/                    # Optional: default data, sequences, crons
├── wizards/                 # Optional: transient models
├── reports/                 # Optional: QWeb reports
└── static/                  # Optional: JS, CSS, images
```

### __manifest__.py Template

```python
{
    'name': 'Module Display Name',
    'version': '19.0.1.0.0',
    'category': 'Category',
    'summary': 'Short description',
    'description': """Long description""",
    'depends': ['base'],
    'data': [
        'security/ir.model.access.csv',
        'views/model_name_views.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
```

### Deployment Cycle

```
Claude Code (write/edit) → git push → deploy staging → test → deploy prod
```

```bash
# From Mac
git add . && git commit -m "feat: description" && git push origin main

# Deploy to staging
ssh root@SERVER_IP "bash /opt/odoo19e-docker/scripts/deploy-staging.sh"

# Deploy to production (auto-backs up DB first)
ssh root@SERVER_IP "bash /opt/odoo19e-docker/scripts/deploy-prod.sh"
```

After deploying: Odoo → Apps → Update Apps List → Install/Upgrade module.

---

## 5. Project Roadmap — Three Phases

### Phase 1: Advanced Staging Manager (CLI)

**Goal:** Replace the fixed staging environment with on-demand staging instances that clone production data. Each instance is fully isolated with its own Docker stack, database, and port.

**Inspired by:** https://github.com/hishamashraf585/odoo_staging_manager_HA

**What to build:**

A script `scripts/staging-manager.sh` that supports:

```bash
# Create a new staging instance (clones production DB)
./staging-manager.sh create --name "test-invoice" --port 8171

# List all running staging instances
./staging-manager.sh list

# Stop and remove a staging instance
./staging-manager.sh remove --name "test-invoice"

# Stop all staging instances
./staging-manager.sh remove-all
```

**Each staging instance gets:**
- Its own `docker-compose.yml` in `/opt/odoo19e-docker/staging/stg-{name}/`
- Its own PostgreSQL container with cloned production data
- Its own Odoo container on a custom port
- Its own filestore copied from production
- A `manage.sh` script for start/stop/restart/remove
- Optional: auto-generated Nginx config + SSL subdomain (`{name}.staging.erp.amro.pro`)

**Directory structure per instance:**
```
/opt/odoo19e-docker/staging/
├── stg-test-invoice/
│   ├── docker-compose.yml
│   ├── config/odoo.conf
│   ├── data/postgres/
│   ├── filestore/
│   ├── logs/
│   └── manage.sh
├── stg-hr-changes/
│   └── ...
└── stg-client-demo/
    └── ...
```

**Key requirements:**
- Clone production DB using `pg_dump`/`pg_restore`
- Copy production filestore to staging instance
- Auto-generate unique DB credentials per instance
- Share the same `addons/` and `extra-addons/` (read-only bind mount)
- Auto-cleanup: optional TTL (auto-delete after X days)
- Port range: 8171-8199 (auto-assign next available)

---

### Phase 2: Web Management Dashboard

**Goal:** A web-based dashboard running in Docker alongside Odoo for managing everything visually. Think of it as a self-hosted CICDoo alternative.

**Inspired by:** https://odoo.bot/ (CICDoo)

**Tech stack for the dashboard:**
- **Frontend:** React (or Next.js) with Tailwind CSS
- **Backend:** Node.js API (Express or Fastify)
- **Runs in:** Docker container alongside Odoo
- **Access via:** `dashboard.erp.amro.pro` or `erp.amro.pro/dashboard`

**Dashboard features:**

1. **Instance Management Panel**
   - View all running Odoo instances (production + staging)
   - Create new staging instance (one-click, clones production)
   - Start/stop/restart/remove instances
   - View instance logs in real-time
   - Container status indicators (running/stopped/error)

2. **Server Monitoring**
   - Real-time CPU usage gauge
   - Real-time RAM usage gauge
   - Disk usage
   - Docker container resource usage per instance
   - Network I/O

3. **Deployment Controls**
   - One-click deploy to staging
   - One-click deploy to production (with backup confirmation)
   - Deploy history / log
   - Rollback to previous version

4. **Backup Management**
   - View all backups (local + S3)
   - One-click manual backup
   - Restore from backup
   - Backup schedule configuration
   - S3 configuration panel

5. **SSL & Domain Management**
   - View certificate status and expiry
   - One-click certificate renewal
   - Add/remove domains

6. **Git Integration**
   - Current branch and last commit info
   - Pull latest changes
   - View recent commits

**Dashboard UI layout:**
```
┌──────────────────────────────────────────────────────────┐
│  ODOO MANAGER                          [CPU] [RAM] [Disk]│
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ Dashboard│   INSTANCES                                   │
│ Instances│   ┌─────────────┐  ┌─────────────┐          │
│ Backups  │   │ Production  │  │ stg-invoice │          │
│ Deploy   │   │ ● Running   │  │ ● Running   │          │
│ SSL      │   │ Port: 8069  │  │ Port: 8171  │          │
│ Settings │   │ [Stop][Logs]│  │ [Stop][Del] │          │
│          │   └─────────────┘  └─────────────┘          │
│          │                                               │
│          │   ┌─────────────┐  ┌─────────────┐          │
│          │   │ stg-hr-test │  │  + Create   │          │
│          │   │ ● Stopped   │  │   New       │          │
│          │   │ Port: 8172  │  │   Staging   │          │
│          │   │ [Start][Del]│  │   Instance  │          │
│          │   └─────────────┘  └─────────────┘          │
│          │                                               │
├──────────┴───────────────────────────────────────────────┤
│  Recent Activity: Deploy #42 to production — 2 min ago   │
└──────────────────────────────────────────────────────────┘
```

**API endpoints the dashboard needs:**

```
# Instances
GET    /api/instances              — List all instances
POST   /api/instances              — Create new staging instance
DELETE /api/instances/:name        — Remove instance
POST   /api/instances/:name/start  — Start instance
POST   /api/instances/:name/stop   — Stop instance
POST   /api/instances/:name/restart — Restart instance
GET    /api/instances/:name/logs   — Stream logs

# Monitoring
GET    /api/monitoring/system      — CPU, RAM, disk stats
GET    /api/monitoring/containers  — Per-container stats

# Backups
GET    /api/backups                — List all backups
POST   /api/backups                — Create manual backup
POST   /api/backups/:id/restore   — Restore from backup
DELETE /api/backups/:id            — Delete backup

# Deployment
POST   /api/deploy/staging         — Deploy to staging
POST   /api/deploy/production      — Deploy to production
GET    /api/deploy/history         — Deployment history

# SSL
GET    /api/ssl/status             — Certificate status
POST   /api/ssl/renew              — Renew certificates

# Git
GET    /api/git/status             — Current branch, last commit
POST   /api/git/pull               — Pull latest changes
```

**Docker service for dashboard:**
```yaml
  dashboard:
    build: ./dashboard
    container_name: odoo_dashboard
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Control Docker from inside
      - /opt/odoo19e-docker:/opt/odoo19e-docker     # Access project files
      - /opt/backups:/opt/backups                    # Access backups
    environment:
      - NODE_ENV=production
      - DASHBOARD_SECRET=your-secret-key
    depends_on:
      - web
    restart: unless-stopped
```

---

### Phase 3: Polish & Advanced Features

**Goal:** Add remaining features for a complete platform.

1. **GitHub Webhooks (Push-to-Deploy)**
   - Listen for GitHub push events on a webhook endpoint
   - Auto-deploy to staging on push to `develop` branch
   - Notify via the dashboard when deploy completes

2. **S3 Backup Integration**
   - Configure S3 bucket from dashboard
   - Sync daily backups to S3
   - Download/restore from S3

3. **Built-in Code Editor** (optional)
   - Web-based editor for quick fixes to custom modules
   - Based on Monaco Editor (VS Code engine)
   - Edit → Save → Deploy workflow from the browser

4. **Email/Webhook Notifications**
   - Deployment success/failure alerts
   - Backup completion alerts
   - SSL certificate expiry warnings
   - Server resource alerts (CPU > 80%, disk > 90%)

5. **Authentication**
   - Login page for the dashboard
   - JWT-based authentication
   - Role-based access (admin, viewer)

---

## 6. Common Odoo Development Patterns

### Adding a field to an existing model

```python
from odoo import models, fields

class ResPartner(models.Model):
    _inherit = 'res.partner'
    
    custom_code = fields.Char(string='Custom Code', required=True)
```

### Creating a new model

```python
from odoo import models, fields, api
from odoo.exceptions import ValidationError

class CustomModel(models.Model):
    _name = 'custom.model'
    _description = 'Custom Model'
    _order = 'create_date desc'

    name = fields.Char(string='Name', required=True)
    description = fields.Text(string='Description')
    state = fields.Selection([
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('done', 'Done'),
    ], string='Status', default='draft', tracking=True)
    partner_id = fields.Many2one('res.partner', string='Partner')
    line_ids = fields.One2many('custom.model.line', 'parent_id', string='Lines')
    
    def action_confirm(self):
        self.write({'state': 'confirmed'})
    
    def action_done(self):
        self.write({'state': 'done'})
```

### View inheritance (adding field to existing form)

```xml
<record id="view_partner_form_inherit" model="ir.ui.view">
    <field name="name">res.partner.form.custom</field>
    <field name="model">res.partner</field>
    <field name="inherit_id" ref="base.view_partner_form"/>
    <field name="arch" type="xml">
        <xpath expr="//field[@name='phone']" position="after">
            <field name="custom_code"/>
        </xpath>
    </field>
</record>
```

### Scheduled action (cron job)

```xml
<record id="ir_cron_custom_action" model="ir.cron">
    <field name="name">Custom: Daily Cleanup</field>
    <field name="model_id" ref="model_custom_model"/>
    <field name="state">code</field>
    <field name="code">model._cron_daily_cleanup()</field>
    <field name="interval_number">1</field>
    <field name="interval_type">days</field>
    <field name="numbercall">-1</field>
</record>
```

### Access control (ir.model.access.csv)

```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_custom_model_user,custom.model.user,model_custom_model,base.group_user,1,1,1,0
access_custom_model_manager,custom.model.manager,model_custom_model,base.group_system,1,1,1,1
```

---

## 7. Key Commands Reference

```bash
# Production
docker compose up -d                     # Start production
docker compose down                      # Stop production
docker compose restart web               # Restart Odoo only
docker logs -f web_odoo                  # View production logs

# Staging (current fixed staging)
docker compose --profile staging up -d   # Start staging
docker compose --profile staging down    # Stop all

# Database
docker exec db_odoo pg_dumpall -U odoo > backup.sql
docker exec -it db_odoo psql -U odoo -d DATABASE_NAME

# SSL
certbot renew && docker restart nginx_odoo

# Deployment
ssh root@IP "bash /opt/odoo19e-docker/scripts/deploy-staging.sh"
ssh root@IP "bash /opt/odoo19e-docker/scripts/deploy-prod.sh"
```

---

## 8. Rules for Claude Code

1. **All custom Odoo modules** go in `extra-addons/custom/`
2. **All dashboard code** goes in `dashboard/` (Phase 2)
3. **All staging manager scripts** go in `scripts/` (Phase 1)
4. **Follow Odoo 19 conventions** — `_inherit`, `_name`, XML IDs, access CSV format
5. **Never modify** `addons/` or `extra-addons/odoo_unlimited/` — these are upstream
6. **Always test on staging first** — never deploy directly to production
7. **Database names must be lowercase** — this is a hard Odoo 19 requirement
8. **Websocket is on port 8069** in Odoo 19, not 8072
9. **Use `$http_host`** not `$host` in Nginx proxy headers
10. **Mount `/var/lib/odoo`** as a persistent volume — required for CSS/JS assets
