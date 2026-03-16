#!/bin/bash
set -e

# ╔════════════════════════════════════════════════════════════════════╗
# ║  Odoo 19 Enterprise — Dashboard Setup Script                      ║
# ║  For fresh Ubuntu 22.04 / 24.04 VPS                               ║
# ║                                                                    ║
# ║  Created by: Amr Afifi (amro.sa.af@gmail.com)                    ║
# ║                                                                    ║
# ║  This script sets up the management dashboard only.                ║
# ║  Production Odoo is deployed later from the dashboard UI.         ║
# ║                                                                    ║
# ║  This script will ask you for:                                    ║
# ║    - Dashboard domain                                             ║
# ║    - Email for SSL certificates                                   ║
# ║    - Dashboard admin password                                     ║
# ║                                                                    ║
# ║  Usage:                                                            ║
# ║    chmod +x setup-odoo.sh                                         ║
# ║    ./setup-odoo.sh                                                ║
# ╚════════════════════════════════════════════════════════════════════╝

# ── Fixed Configuration ─────────────────────────────────────────────
# INSTALL_DIR = the directory this script lives in (the cloned repo)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$SCRIPT_DIR"
BACKUP_DIR="/opt/backups"

# ── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✘]${NC} $1"; }
step() { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}\n"; }

# ── Pre-flight checks ──────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  err "Please run as root: sudo ./setup-odoo.sh"
  exit 1
fi


# ════════════════════════════════════════════════════════════════════
# USER INPUT — Dashboard Domain, SSL Email & Password
# ════════════════════════════════════════════════════════════════════

echo -e "${GREEN}${BOLD}"
echo ""
echo "   ██████╗ ██████╗  ██████╗  ██████╗     ██╗ █████╗ "
echo "  ██╔═══██╗██╔══██╗██╔═══██╗██╔═══██╗   ███║██╔══██╗"
echo "  ██║   ██║██║  ██║██║   ██║██║   ██║   ╚██║╚██████║"
echo "  ██║   ██║██║  ██║██║   ██║██║   ██║    ██║ ╚═══██║"
echo "  ╚██████╔╝██████╔╝╚██████╔╝╚██████╔╝    ██║ █████╔╝"
echo "   ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝     ╚═╝ ╚════╝ "
echo ""
echo -e "${NC}${CYAN}${BOLD}  ███████╗███╗   ██╗████████╗███████╗██████╗ ██████╗ ██████╗ ██╗███████╗███████╗${NC}"
echo -e "${CYAN}${BOLD}  ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██║██╔════╝██╔════╝${NC}"
echo -e "${CYAN}${BOLD}  █████╗  ██╔██╗ ██║   ██║   █████╗  ██████╔╝██████╔╝██████╔╝██║███████╗█████╗  ${NC}"
echo -e "${CYAN}${BOLD}  ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██╔═══╝ ██╔══██╗██║╚════██║██╔══╝  ${NC}"
echo -e "${CYAN}${BOLD}  ███████╗██║ ╚████║   ██║   ███████╗██║  ██║██║     ██║  ██║██║███████║███████╗${NC}"
echo -e "${CYAN}${BOLD}  ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚══════╝${NC}"
echo ""
echo -e "${YELLOW}  ─────────────────────────────────────────────────────────────────${NC}"
echo -e "${BOLD}  Dashboard Setup Script${NC}"
echo -e "  Sets up the management dashboard. Production Odoo is deployed"
echo -e "  later from the dashboard web UI."
echo -e "${YELLOW}  ─────────────────────────────────────────────────────────────────${NC}"
echo -e "  ${CYAN}Created by:${NC} ${BOLD}Amr Afifi${NC} (amro.sa.af@gmail.com)"
echo -e "${YELLOW}  ─────────────────────────────────────────────────────────────────${NC}"
echo ""

echo -e "${BOLD}Please provide your dashboard domain and SSL email.${NC}\n"

while true; do
  read -p "Dashboard domain (e.g. dashboard.erp.example.com): " DOMAIN_DASHBOARD
  if [ -n "$DOMAIN_DASHBOARD" ]; then break; fi
  err "Dashboard domain is required"
done

while true; do
  read -p "Email for SSL certificates (e.g. admin@example.com): " SSL_EMAIL
  if [ -n "$SSL_EMAIL" ]; then break; fi
  err "Email is required for SSL certificates"
done

echo ""
echo -e "${BOLD}Dashboard admin credentials:${NC}"
while true; do
  read -s -p "  Dashboard password: " DASHBOARD_ADMIN_PASSWORD
  echo
  if [ -n "$DASHBOARD_ADMIN_PASSWORD" ]; then break; fi
  err "Dashboard password is required"
done
DASHBOARD_SECRET=$(openssl rand -hex 32)

echo ""
echo -e "${BOLD}┌────────────────────────────────────────────┐${NC}"
echo -e "${BOLD}│  Configuration Summary                     │${NC}"
echo -e "${BOLD}├────────────────────────────────────────────┤${NC}"
echo -e "${BOLD}│  Dashboard:   ${CYAN}${DOMAIN_DASHBOARD}${NC}"
echo -e "${BOLD}│  SSL Email:   ${CYAN}${SSL_EMAIL}${NC}"
echo -e "${BOLD}│  Install Dir: ${CYAN}${INSTALL_DIR}${NC}"
echo -e "${BOLD}└────────────────────────────────────────────┘${NC}"
echo ""

read -p "Continue with this configuration? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted. Re-run the script to try again."
  exit 0
fi


# ════════════════════════════════════════════════════════════════════
# STEP 1: System packages
# ════════════════════════════════════════════════════════════════════
step "Step 1/6 — Installing system packages"

apt update && apt upgrade -y
apt install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  git \
  unzip \
  sed \
  certbot \
  ufw \
  dnsutils

log "Base packages installed"


# ════════════════════════════════════════════════════════════════════
# STEP 2: Install Docker from official repo
# ════════════════════════════════════════════════════════════════════
step "Step 2/6 — Installing Docker (official repository)"

if command -v docker &> /dev/null && docker compose version &> /dev/null; then
  log "Docker already installed, skipping..."
  log "Docker version: $(docker --version)"
  log "Docker Compose version: $(docker compose version)"
else
  for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
    apt remove -y $pkg 2>/dev/null || true
  done

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME:-$UBUNTU_CODENAME}") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt update
  apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable docker
  systemctl start docker

  log "Docker version: $(docker --version)"
  log "Docker Compose version: $(docker compose version)"
fi


# ════════════════════════════════════════════════════════════════════
# STEP 3: Create Dockerfile & docker-compose.yml (dashboard only)
# ════════════════════════════════════════════════════════════════════
step "Step 3/6 — Creating Dockerfile & docker-compose.yml"

cd "$INSTALL_DIR"

mkdir -p "$INSTALL_DIR/extra-addons/custom"
log "Required directories ready"

cat > "$INSTALL_DIR/Dockerfile" << 'DOCKERFILE'
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
DOCKERFILE

log "Dockerfile created"

cat > "$INSTALL_DIR/docker-compose.yml" << COMPOSEFILE
services:

  # ============================================================
  #  DASHBOARD  —  ${DOMAIN_DASHBOARD}
  # ============================================================
  dashboard:
    build: ./dashboard
    container_name: odoo_dashboard
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ${INSTALL_DIR}:${INSTALL_DIR}
      - ${BACKUP_DIR}:/opt/backups
    environment:
      - NODE_ENV=production
      - DASHBOARD_SECRET=\${DASHBOARD_SECRET:-changeme-update-in-env-file}
      - DASHBOARD_ADMIN_PASSWORD=\${DASHBOARD_ADMIN_PASSWORD:-changeme}
      - PROJECT_ROOT=${INSTALL_DIR}
      - BACKUPS_PATH=${BACKUP_DIR}
    restart: unless-stopped
    networks:
      - odoo-net
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

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
      - ${INSTALL_DIR}/nginx/default.conf:/etc/nginx/conf.d/default.conf
      - ${INSTALL_DIR}/staging/nginx:/etc/nginx/staging-instances:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    restart: unless-stopped
    networks:
      - odoo-net
    extra_hosts:
      - "host.docker.internal:host-gateway"

networks:
  odoo-net:
    driver: bridge
COMPOSEFILE

log "docker-compose.yml created (dashboard + nginx only)"


# ════════════════════════════════════════════════════════════════════
# STEP 4: Create Nginx config (dashboard only)
# ════════════════════════════════════════════════════════════════════
step "Step 4/6 — Creating Nginx configuration"

mkdir -p "$INSTALL_DIR/nginx"

cat > "$INSTALL_DIR/nginx/default.conf" << NGINXCONF
# ── Redirect HTTP → HTTPS ──────────────────────────────────
server {
    listen 80;
    server_name ${DOMAIN_DASHBOARD};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# ── Dashboard: ${DOMAIN_DASHBOARD} ──────────────────────────
server {
    listen 443 ssl;
    server_name ${DOMAIN_DASHBOARD};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN_DASHBOARD}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_DASHBOARD}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    access_log /var/log/nginx/dashboard-access.log;
    error_log /var/log/nginx/dashboard-error.log;

    client_max_body_size 10M;

    location / {
        proxy_pass http://dashboard:3000;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        # SSE support (log streaming, deploy output)
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 3600s;
        proxy_buffering off;
    }
}

# ── Dynamic staging instances ────────────────────────────────
# Auto-generated by staging-manager.sh when --with-ssl is used.
# Each instance gets its own conf file in staging/nginx/
include /etc/nginx/staging-instances/*.conf;
NGINXCONF

log "Nginx config created for $DOMAIN_DASHBOARD"


# ════════════════════════════════════════════════════════════════════
# STEP 5: SSL Certificate (dashboard only)
# ════════════════════════════════════════════════════════════════════
step "Step 5/6 — Generating SSL certificate"

mkdir -p /var/www/certbot

# Get server IP
SERVER_IPV4=$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || echo "")
SERVER_IPV6=$(curl -6 -s --max-time 5 ifconfig.me 2>/dev/null || echo "")
SERVER_IP="${SERVER_IPV4:-$SERVER_IPV6}"

# Stop anything on port 80
systemctl stop nginx 2>/dev/null || true
docker compose down 2>/dev/null || true

log "Server IPv4: ${SERVER_IPV4:-none}"
log "Server IPv6: ${SERVER_IPV6:-none}"

# Function: try to get SSL cert with retry
get_ssl_cert() {
  local domain=$1
  local attempt=1
  local max_attempts=2

  while [ $attempt -le $max_attempts ]; do
    log "Requesting SSL certificate for $domain (attempt $attempt/$max_attempts)..."
    if certbot certonly --standalone \
      -d "$domain" \
      --email "$SSL_EMAIL" \
      --agree-tos \
      --no-eff-email \
      --non-interactive \
      --keep-until-expiring \
      --staging 2>&1; then
      log "SSL cert for $domain obtained successfully!"
      return 0
    fi
    attempt=$((attempt + 1))
    if [ $attempt -le $max_attempts ]; then
      warn "Attempt failed, retrying in 10 seconds..."
      sleep 10
    fi
  done
  return 1
}

# Function: create self-signed fallback (only if no cert file exists at all)
create_self_signed() {
  local domain=$1
  if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
    warn "Cert file already exists for $domain — not overwriting"
    return 0
  fi
  warn "Creating temporary self-signed cert for $domain so Nginx can start..."
  mkdir -p "/etc/letsencrypt/live/$domain"
  openssl req -x509 -nodes -days 30 \
    -newkey rsa:2048 \
    -keyout "/etc/letsencrypt/live/$domain/privkey.pem" \
    -out "/etc/letsencrypt/live/$domain/fullchain.pem" \
    -subj "/CN=$domain" 2>/dev/null
}

# Get cert for dashboard domain — skip if cert FILE already exists (not just directory)
if [ -f "/etc/letsencrypt/live/$DOMAIN_DASHBOARD/fullchain.pem" ]; then
  log "SSL cert for $DOMAIN_DASHBOARD already exists, skipping..."
else
  if ! get_ssl_cert "$DOMAIN_DASHBOARD"; then
    create_self_signed "$DOMAIN_DASHBOARD"
  fi
fi

# Check if self-signed
DASHBOARD_SELF_SIGNED=false
if openssl x509 -in "/etc/letsencrypt/live/$DOMAIN_DASHBOARD/fullchain.pem" -issuer -noout 2>/dev/null | grep -q "CN = $DOMAIN_DASHBOARD"; then
  DASHBOARD_SELF_SIGNED=true
  warn "$DOMAIN_DASHBOARD is using a self-signed certificate (browser will show 'Not Secure')"
fi

if [ "$DASHBOARD_SELF_SIGNED" = "true" ]; then
  echo ""
  warn "To fix SSL later, run:"
  echo -e "  ${CYAN}cd $INSTALL_DIR${NC}"
  echo -e "  ${CYAN}docker compose down${NC}"
  echo -e "  ${CYAN}rm -rf /etc/letsencrypt/live/$DOMAIN_DASHBOARD /etc/letsencrypt/archive/$DOMAIN_DASHBOARD /etc/letsencrypt/renewal/$DOMAIN_DASHBOARD.conf${NC}"
  echo -e "  ${CYAN}certbot certonly --standalone -d $DOMAIN_DASHBOARD --email $SSL_EMAIL --agree-tos --no-eff-email${NC}"
  echo -e "  ${CYAN}docker compose up -d${NC}"
  echo ""
fi

# Auto-renewal cron
(crontab -l 2>/dev/null | grep -v certbot; echo "0 3 * * * certbot renew --quiet --pre-hook 'docker stop nginx_odoo' --post-hook 'docker start nginx_odoo'") | crontab -
log "SSL auto-renewal cron job added"


# ════════════════════════════════════════════════════════════════════
# STEP 6: Git + Firewall + Config
# ════════════════════════════════════════════════════════════════════
step "Step 6/6 — Git, firewall & configuration"

mkdir -p "$INSTALL_DIR/scripts"
mkdir -p "$BACKUP_DIR"

# Create deploy-staging.sh
cat > "$INSTALL_DIR/scripts/deploy-staging.sh" << DEPLOYSTAGING
#!/bin/bash
set -e
. ${INSTALL_DIR}/.deploy-config
cd ${INSTALL_DIR}
echo "=== Pulling latest changes ==="
git pull origin main
echo "=== Rebuilding dashboard ==="
docker compose up -d --build dashboard
echo "=== Rebuilding all running staging instances ==="
STAGED=0
for dir in ${INSTALL_DIR}/staging/stg-*/; do
  if [ -f "\${dir}/docker-compose.yml" ]; then
    name=\$(basename "\${dir}" | sed 's/stg-//')
    echo "  Rebuilding stg-\${name}..."
    docker compose -f "\${dir}/docker-compose.yml" up -d --build web || true
    STAGED=\$((STAGED + 1))
  fi
done
echo "=== Done! \${STAGED} staging instance(s) rebuilt. ==="
echo "=== Dashboard: https://${DOMAIN_DASHBOARD} ==="
echo "=== Use staging-manager.sh list to see all staging instances ==="
DEPLOYSTAGING

chmod +x "$INSTALL_DIR/scripts/"*.sh 2>/dev/null || true
log "Deploy scripts created"

# Only write .gitignore if one doesn't already exist
if [ ! -f "$INSTALL_DIR/.gitignore" ]; then
cat > "$INSTALL_DIR/.gitignore" << 'GITIGNORE'
# Environment & secrets
.env
.env.local
.deploy-config

# Database & filestore data
odoo-db-data/
odoo-db-data-staging/
odoo-data/
odoo-data-staging/

# Python
*.pyc
__pycache__/

# Backups
backups/
*.sql
*.sql.gz
*.dump
*.zip

# Staging instances (auto-generated, contain secrets + data)
staging/stg-*/
staging/.registry
staging/.staging.log
staging/.deploy-history.json
staging/nginx/

# Dashboard build artifacts & secrets
dashboard/.env
dashboard/frontend/.next/
dashboard/node_modules/
dashboard/frontend/node_modules/
GITIGNORE
else
  log ".gitignore already exists — skipping"
fi

# ── Create .env with dashboard credentials ──
cat > "$INSTALL_DIR/.env" << ENVFILE
# Dashboard credentials — keep this file secret, never commit it
DASHBOARD_SECRET=${DASHBOARD_SECRET}
DASHBOARD_ADMIN_PASSWORD=${DASHBOARD_ADMIN_PASSWORD}
ENVFILE
chmod 600 "$INSTALL_DIR/.env"
log "Dashboard .env created at $INSTALL_DIR/.env"

cat > "$INSTALL_DIR/.deploy-config" << DEPLOYCONFIG
# Odoo 19 Enterprise — Deployment Configuration
# Generated by setup-odoo.sh on $(date)
# Production domain is set when deploying from the dashboard.
DOMAIN_PROD=
DOMAIN_STAGING=
DOMAIN_DASHBOARD=${DOMAIN_DASHBOARD}
SSL_EMAIL=${SSL_EMAIL}
SERVER_IP=${SERVER_IP}
INSTALL_DIR=${INSTALL_DIR}
BACKUP_DIR=${BACKUP_DIR}
DEPLOYCONFIG

# ── Create staging directory structure ──
mkdir -p "$INSTALL_DIR/staging/nginx"
if [ ! -f "$INSTALL_DIR/staging/.registry" ]; then
  echo "[]" > "$INSTALL_DIR/staging/.registry"
fi
log "Staging directory structure created at $INSTALL_DIR/staging/"

log "Deploy config saved to $INSTALL_DIR/.deploy-config"

cd "$INSTALL_DIR"
if [ ! -d ".git" ]; then
  git init
  git add .
  git commit -m "initial: Odoo 19 Enterprise dashboard setup"
  log "Git repository initialized"
  echo ""
  warn "Git remote not set — run this when you have a repo URL:"
  echo -e "  ${CYAN}cd $INSTALL_DIR${NC}"
  echo -e "  ${CYAN}git remote add origin YOUR_GIT_REPO_URL${NC}"
  echo -e "  ${CYAN}git push -u origin main${NC}"
else
  log "Git repository already exists"
fi

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "Firewall enabled (SSH, HTTP, HTTPS)"


# ════════════════════════════════════════════════════════════════════
# LAUNCH (dashboard + nginx only)
# ════════════════════════════════════════════════════════════════════
step "Launching Dashboard"

cd "$INSTALL_DIR"

log "Building and starting dashboard + nginx..."
docker compose up -d --build

echo -n "Waiting for dashboard to start"
for i in {1..20}; do
  echo -n "."
  sleep 2
  if docker exec odoo_dashboard wget -qO- http://localhost:3000/api/health 2>/dev/null | grep -q "ok"; then
    break
  fi
done
echo ""


# ════════════════════════════════════════════════════════════════════
# DONE
# ════════════════════════════════════════════════════════════════════

echo -e "\n${GREEN}${BOLD}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║   ✅  DASHBOARD SETUP COMPLETE!                                ║"
echo "║                                                                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║   Dashboard:   https://${DOMAIN_DASHBOARD}"
echo "║   Server IP:   ${SERVER_IP}"
echo "║                                                                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║   NEXT STEPS:                                                  ║"
echo "║                                                                ║"
echo "║   1. Open the dashboard:                                       ║"
echo "║      https://${DOMAIN_DASHBOARD}"
echo "║      Password: the one you just entered                        ║"
echo "║                                                                ║"
echo "║   2. Go to the Setup page in the dashboard                    ║"
echo "║      Enter your production domain and click Deploy             ║"
echo "║      (this downloads Odoo addons + configures everything)      ║"
echo "║                                                                ║"
echo "║   3. After production deploys:                                 ║"
echo "║      - Create a database (MUST be lowercase name!)             ║"
echo "║      - Install odoo_unlimited addon                            ║"
echo "║      - Install Accounting                                      ║"
echo "║      - Register with any code (e.g. abc123456)                ║"
echo "║                                                                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║   AUTOMATED:                                                   ║"
echo "║   • SSL auto-renews via cron (3:00 AM daily)                  ║"
echo "║   • Config saved to ${INSTALL_DIR}/.deploy-config"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Show SSL status warning if needed
if [ "$DASHBOARD_SELF_SIGNED" = "true" ]; then
  echo -e "${YELLOW}${BOLD}⚠️  SSL WARNING: Dashboard is using a self-signed certificate.${NC}"
  echo -e "${YELLOW}See the SSL fix commands printed above during Step 5.${NC}\n"
fi

echo "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "odoo|nginx"
echo ""
