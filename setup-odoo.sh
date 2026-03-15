#!/bin/bash
set -e

# ╔════════════════════════════════════════════════════════════════════╗
# ║  Odoo 19 Enterprise — Automated Deployment Script                ║
# ║  For fresh Ubuntu 22.04 / 24.04 VPS                              ║
# ║                                                                    ║
# ║  Created by: Amr Afifi (amro.sa.af@gmail.com)                    ║
# ║                                                                    ║
# ║  This script will ask you for:                                    ║
# ║    - Production domain                                            ║
# ║    - Staging domain                                               ║
# ║    - Email for SSL certificates                                   ║
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
DROPBOX_URL="https://www.dropbox.com/scl/fi/rtt0vplxrao3elzk3fooz/odoo19e-docker.zip?rlkey=k1vwn8g2s1eao07kc6hqnyusp&st=29zgcif9&dl=1"
ODOO_UNLIMITED_URL="https://www.dropbox.com/scl/fi/8f9l9h2w1z8r6qkzefc97/odoo_unlimited.zip?rlkey=a4j5kpiktxc06827tzelj5j4r&st=ju8fh4oi&dl=1"

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
# USER INPUT — Domains & SSL Email
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
echo -e "${BOLD}  Automated Deployment Script${NC}"
echo -e "  One script to deploy Odoo 19 Enterprise with Docker, Nginx,"
echo -e "  SSL, staging environment, and CI/CD-ready Git workflow."
echo -e "${YELLOW}  ─────────────────────────────────────────────────────────────────${NC}"
echo -e "  ${CYAN}Created by:${NC} ${BOLD}Amr Afifi${NC} (amro.sa.af@gmail.com)"
echo -e "${YELLOW}  ─────────────────────────────────────────────────────────────────${NC}"
echo ""

echo -e "${BOLD}Please provide your domain names and SSL email.${NC}\n"

while true; do
  read -p "Production domain (e.g. erp.example.com): " DOMAIN_PROD
  if [ -n "$DOMAIN_PROD" ]; then break; fi
  err "Production domain is required"
done

DEFAULT_STAGING="staging.${DOMAIN_PROD}"
read -p "Staging subdomain base [${DEFAULT_STAGING}]: " INPUT_DOMAIN_STAGING
DOMAIN_STAGING="${INPUT_DOMAIN_STAGING:-$DEFAULT_STAGING}"

DEFAULT_DASHBOARD="dashboard.${DOMAIN_PROD}"
read -p "Dashboard domain [${DEFAULT_DASHBOARD}]: " INPUT_DOMAIN_DASHBOARD
DOMAIN_DASHBOARD="${INPUT_DOMAIN_DASHBOARD:-$DEFAULT_DASHBOARD}"

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
echo -e "${BOLD}│  Production:  ${CYAN}${DOMAIN_PROD}${NC}"
echo -e "${BOLD}│  Staging base: ${CYAN}${DOMAIN_STAGING}${NC}"
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
step "Step 1/9 — Installing system packages"

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
step "Step 2/9 — Installing Docker (official repository)"

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
# STEP 3: Download and extract Odoo from Dropbox
# ════════════════════════════════════════════════════════════════════
step "Step 3/9 — Downloading Odoo Enterprise add-ons"

# Only download addons/ if it doesn't already exist (or is empty)
if [ -d "$INSTALL_DIR/addons" ] && [ "$(ls -A "$INSTALL_DIR/addons" 2>/dev/null)" ]; then
  log "addons/ already exists — skipping download"
else
  log "Downloading Odoo Enterprise package from Dropbox (~900 MB)..."
  wget "$DROPBOX_URL" -O /tmp/odoo19e-docker.zip
  log "Extracting addons/ directory..."
  mkdir -p /tmp/odoo-extract
  unzip -o /tmp/odoo19e-docker.zip -d /tmp/odoo-extract

  # Find the addons/ directory inside the extracted zip (handles any root folder name)
  ADDONS_SRC=$(find /tmp/odoo-extract -maxdepth 3 -name "addons" -type d | head -1)
  if [ -n "$ADDONS_SRC" ]; then
    cp -r "$ADDONS_SRC" "$INSTALL_DIR/addons"
    log "addons/ installed ($(ls "$INSTALL_DIR/addons" | wc -l) modules)"
  else
    warn "Could not locate addons/ inside the downloaded zip — you may need to add it manually"
  fi

  rm -rf /tmp/odoo-extract /tmp/odoo19e-docker.zip
fi

cd "$INSTALL_DIR"

mkdir -p "$INSTALL_DIR/extra-addons/custom"
mkdir -p "$INSTALL_DIR/odoo-data"
log "Required directories ready"


# ════════════════════════════════════════════════════════════════════
# STEP 4: Create Dockerfile & docker-compose.yml
# ════════════════════════════════════════════════════════════════════
step "Step 4/9 — Creating Dockerfile & docker-compose.yml"

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
  #  PRODUCTION  —  ${DOMAIN_PROD}
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
      - ${INSTALL_DIR}/extra-addons:/mnt/extra-addons
      - ${INSTALL_DIR}/addons:/usr/lib/python3/dist-packages/odoo/addons
      - ${INSTALL_DIR}/odoo-data:/var/lib/odoo
    restart: unless-stopped
    networks:
      - odoo-net

  db:
    image: pgvector/pgvector:pg17
    container_name: db_odoo
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: odoo
      POSTGRES_PASSWORD: odoo
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - ${INSTALL_DIR}/odoo-db-data:/var/lib/postgresql/data/pgdata
    restart: unless-stopped
    networks:
      - odoo-net

  # ============================================================
  #  DASHBOARD  —  ${DOMAIN_DASHBOARD}
  # ============================================================
  dashboard:
    build: ./dashboard
    container_name: odoo_dashboard
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ${INSTALL_DIR}:${INSTALL_DIR}
      - ${BACKUP_DIR}:/opt/backups
    environment:
      - NODE_ENV=production
      - DASHBOARD_SECRET=\${DASHBOARD_SECRET:-changeme-update-in-env-file}
      - DASHBOARD_ADMIN_PASSWORD=\${DASHBOARD_ADMIN_PASSWORD:-changeme}
      - PROJECT_ROOT=${INSTALL_DIR}
      - BACKUPS_PATH=${BACKUP_DIR}
    depends_on:
      - web
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
    depends_on:
      - web
    restart: unless-stopped
    networks:
      - odoo-net
    extra_hosts:
      - "host.docker.internal:host-gateway"

networks:
  odoo-net:
    driver: bridge
COMPOSEFILE

log "docker-compose.yml created"


# ════════════════════════════════════════════════════════════════════
# STEP 5: Create Nginx config
# ════════════════════════════════════════════════════════════════════
step "Step 5/9 — Creating Nginx configuration"

mkdir -p "$INSTALL_DIR/nginx"

cat > "$INSTALL_DIR/nginx/default.conf" << NGINXCONF
# ── Redirect HTTP → HTTPS ──────────────────────────────────
server {
    listen 80;
    server_name ${DOMAIN_PROD} ${DOMAIN_DASHBOARD};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# ── Production: ${DOMAIN_PROD} ───────────────────────────────
server {
    listen 443 ssl;
    server_name ${DOMAIN_PROD};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN_PROD}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_PROD}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    access_log /var/log/nginx/odoo-access.log;
    error_log /var/log/nginx/odoo-error.log;

    client_max_body_size 200M;
    proxy_read_timeout 720s;
    proxy_connect_timeout 720s;
    proxy_send_timeout 720s;

    location / {
        proxy_pass http://web:8069;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }

    location /websocket {
        proxy_pass http://web:8069;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }

    location ~* /web/static/ {
        proxy_pass http://web:8069;
        proxy_cache_valid 200 60m;
        proxy_buffering on;
        expires 24h;
    }
}

# ── Dashboard: ${DOMAIN_DASHBOARD} ──────────────────────────
server {
    listen 443 ssl;
    server_name ${DOMAIN_DASHBOARD};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN_PROD}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_PROD}/privkey.pem;
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

log "Nginx config created for $DOMAIN_PROD and $DOMAIN_STAGING"


# ════════════════════════════════════════════════════════════════════
# STEP 6: SSL Certificates
# ════════════════════════════════════════════════════════════════════
step "Step 6/9 — Generating SSL certificates"

mkdir -p /var/www/certbot

# Get BOTH IPv4 and IPv6 addresses for comparison
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
      --non-interactive 2>&1; then
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

# Function: create self-signed fallback
create_self_signed() {
  local domain=$1
  warn "Creating temporary self-signed cert for $domain so Nginx can start..."
  mkdir -p "/etc/letsencrypt/live/$domain"
  openssl req -x509 -nodes -days 30 \
    -newkey rsa:2048 \
    -keyout "/etc/letsencrypt/live/$domain/privkey.pem" \
    -out "/etc/letsencrypt/live/$domain/fullchain.pem" \
    -subj "/CN=$domain" 2>/dev/null
}

# ── Production cert (also covers dashboard as a SAN) ──
if [ -d "/etc/letsencrypt/live/$DOMAIN_PROD" ]; then
  log "SSL cert for $DOMAIN_PROD already exists, skipping..."
  log "If you need to add $DOMAIN_DASHBOARD as a SAN, run:"
  log "  certbot certonly --standalone -d $DOMAIN_PROD -d $DOMAIN_DASHBOARD --email $SSL_EMAIL --agree-tos --expand"
else
  # Try to get a combined cert covering both production + dashboard domains
  log "Requesting SSL certificate for $DOMAIN_PROD and $DOMAIN_DASHBOARD..."
  if certbot certonly --standalone \
    -d "$DOMAIN_PROD" -d "$DOMAIN_DASHBOARD" \
    --email "$SSL_EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive 2>&1; then
    log "SSL cert obtained for $DOMAIN_PROD + $DOMAIN_DASHBOARD"
  else
    log "Combined cert failed — trying $DOMAIN_PROD alone..."
    if ! get_ssl_cert "$DOMAIN_PROD"; then
      create_self_signed "$DOMAIN_PROD"
    fi
    # Also create self-signed for dashboard domain (will be replaced by real cert later)
    if [ ! -d "/etc/letsencrypt/live/$DOMAIN_PROD" ]; then
      create_self_signed "$DOMAIN_DASHBOARD"
    fi
  fi
fi

# ── Check if we ended up with self-signed certs ──
PROD_SELF_SIGNED=false
STAGING_SELF_SIGNED=false
if openssl x509 -in "/etc/letsencrypt/live/$DOMAIN_PROD/fullchain.pem" -issuer -noout 2>/dev/null | grep -q "CN = $DOMAIN_PROD"; then
  PROD_SELF_SIGNED=true
  warn "$DOMAIN_PROD is using a self-signed certificate (browser will show 'Not Secure')"
fi
if openssl x509 -in "/etc/letsencrypt/live/$DOMAIN_STAGING/fullchain.pem" -issuer -noout 2>/dev/null | grep -q "CN = $DOMAIN_STAGING"; then
  STAGING_SELF_SIGNED=true
  warn "$DOMAIN_STAGING is using a self-signed certificate (browser will show 'Not Secure')"
fi

if [ "$PROD_SELF_SIGNED" = "true" ] || [ "$STAGING_SELF_SIGNED" = "true" ]; then
  echo ""
  warn "To fix SSL later, run:"
  echo -e "  ${CYAN}cd $INSTALL_DIR${NC}"
  echo -e "  ${CYAN}docker compose --profile staging down${NC}"
  if [ "$PROD_SELF_SIGNED" = "true" ]; then
    echo -e "  ${CYAN}rm -rf /etc/letsencrypt/live/$DOMAIN_PROD /etc/letsencrypt/archive/$DOMAIN_PROD /etc/letsencrypt/renewal/$DOMAIN_PROD.conf${NC}"
    echo -e "  ${CYAN}certbot certonly --standalone -d $DOMAIN_PROD --email $SSL_EMAIL --agree-tos --no-eff-email${NC}"
  fi
  if [ "$STAGING_SELF_SIGNED" = "true" ]; then
    echo -e "  ${CYAN}rm -rf /etc/letsencrypt/live/$DOMAIN_STAGING /etc/letsencrypt/archive/$DOMAIN_STAGING /etc/letsencrypt/renewal/$DOMAIN_STAGING.conf${NC}"
    echo -e "  ${CYAN}certbot certonly --standalone -d $DOMAIN_STAGING --email $SSL_EMAIL --agree-tos --no-eff-email${NC}"
  fi
  echo -e "  ${CYAN}docker compose --profile staging up -d${NC}"
  echo ""
fi

# Auto-renewal cron
(crontab -l 2>/dev/null | grep -v certbot; echo "0 3 * * * certbot renew --quiet --pre-hook 'docker stop nginx_odoo' --post-hook 'docker start nginx_odoo'") | crontab -
log "SSL auto-renewal cron job added"


# ════════════════════════════════════════════════════════════════════
# STEP 7: Deploy scripts + backups
# ════════════════════════════════════════════════════════════════════
step "Step 7/9 — Creating deploy scripts & backup automation"

mkdir -p "$INSTALL_DIR/scripts"
mkdir -p "$BACKUP_DIR"

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

cat > "$INSTALL_DIR/scripts/deploy-prod.sh" << DEPLOYPROD
#!/bin/bash
set -e
cd ${INSTALL_DIR}
echo "=== Pulling latest changes ==="
git pull origin main
echo "=== Backing up production database ==="
mkdir -p ${BACKUP_DIR}
docker exec db_odoo pg_dumpall -U odoo > ${BACKUP_DIR}/odoo-prod-\$(date +%Y%m%d-%H%M%S).sql
echo "=== Rebuilding production ==="
docker compose up -d --build web
echo "=== Production deployed at https://${DOMAIN_PROD} ==="
DEPLOYPROD

cat > "$INSTALL_DIR/scripts/clone-prod-to-staging.sh" << 'CLONESCRIPT'
#!/bin/bash
set -e
echo "=== This will OVERWRITE the staging database with production data ==="
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 0; fi

read -p "Production database name: " PROD_DB
read -p "Staging database name: " STAGING_DB

echo "=== Dumping production database: $PROD_DB ==="
docker exec db_odoo pg_dump -U odoo "$PROD_DB" > /tmp/prod-dump.sql

echo "=== Dropping and recreating staging database: $STAGING_DB ==="
docker exec db_odoo_staging psql -U odoo_staging -c "DROP DATABASE IF EXISTS \"$STAGING_DB\";"
docker exec db_odoo_staging psql -U odoo_staging -c "CREATE DATABASE \"$STAGING_DB\";"

echo "=== Restoring into staging ==="
docker exec -i db_odoo_staging psql -U odoo_staging -d "$STAGING_DB" < /tmp/prod-dump.sql
rm -f /tmp/prod-dump.sql

echo "=== Restarting staging ==="
docker compose --profile staging restart web-staging
echo "=== Done! Staging now mirrors production data ==="
CLONESCRIPT

cat > "$INSTALL_DIR/scripts/backup.sh" << BACKUPSCRIPT
#!/bin/bash
set -e
BACKUP_DIR="${BACKUP_DIR}"
TIMESTAMP=\$(date +%Y%m%d-%H%M%S)
mkdir -p "\$BACKUP_DIR"

echo "=== Backing up production database ==="
docker exec db_odoo pg_dumpall -U odoo > "\$BACKUP_DIR/odoo-prod-\$TIMESTAMP.sql"

echo "=== Cleaning backups older than 30 days ==="
find "\$BACKUP_DIR" -name "*.sql" -mtime +30 -delete

echo "=== Backup saved: \$BACKUP_DIR/odoo-prod-\$TIMESTAMP.sql ==="
ls -lh "\$BACKUP_DIR/odoo-prod-\$TIMESTAMP.sql"
BACKUPSCRIPT

chmod +x "$INSTALL_DIR/scripts/"*.sh
log "Deploy scripts created"

(crontab -l 2>/dev/null | grep -v backup.sh; echo "0 2 * * * ${INSTALL_DIR}/scripts/backup.sh >> /var/log/odoo-backup.log 2>&1") | crontab -
log "Daily backup cron job added (2:00 AM)"


# ════════════════════════════════════════════════════════════════════
# STEP 8: Git + Firewall
# ════════════════════════════════════════════════════════════════════
step "Step 8/9 — Initializing Git repository & firewall"

# Only write .gitignore if one doesn't already exist (repo already has one)
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
# Change domains/email here and re-run setup-odoo.sh to update all configs.
DOMAIN_PROD=${DOMAIN_PROD}
DOMAIN_STAGING=${DOMAIN_STAGING}
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
  git commit -m "initial: Odoo 19 Enterprise setup"
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
# STEP 9: Download odoo_unlimited Enterprise addon
# ════════════════════════════════════════════════════════════════════
step "Step 9/9 — Downloading odoo_unlimited Enterprise addon"

cd "$INSTALL_DIR"

if [ -d "$INSTALL_DIR/extra-addons/odoo_unlimited" ]; then
  warn "odoo_unlimited already exists — replacing with latest version..."
  rm -rf "$INSTALL_DIR/extra-addons/odoo_unlimited"
fi

log "Downloading odoo_unlimited.zip..."
wget "$ODOO_UNLIMITED_URL" -O /tmp/odoo_unlimited.zip

log "Extracting to extra-addons/..."
unzip -o /tmp/odoo_unlimited.zip -d "$INSTALL_DIR/extra-addons/"
rm -f /tmp/odoo_unlimited.zip

# Verify
if [ -d "$INSTALL_DIR/extra-addons/odoo_unlimited" ]; then
  log "odoo_unlimited addon installed successfully"
elif ls "$INSTALL_DIR/extra-addons/"odoo_unlimited* 1>/dev/null 2>&1; then
  # Handle case where zip extracts to a differently named folder
  log "odoo_unlimited addon extracted (check extra-addons/ for exact folder name)"
else
  warn "Could not verify odoo_unlimited installation — you may need to place it manually"
fi


# ════════════════════════════════════════════════════════════════════
# LAUNCH
# ════════════════════════════════════════════════════════════════════
step "Launching Odoo 19 Enterprise"

cd "$INSTALL_DIR"

log "Building and starting production + dashboard..."
docker compose up -d --build

echo -n "Waiting for Odoo to start"
for i in {1..30}; do
  echo -n "."
  sleep 2
  if docker exec web_odoo curl -s -o /dev/null -w "%{http_code}" http://localhost:8069 2>/dev/null | grep -q "200\|303"; then
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
echo "║   ✅  SETUP COMPLETE!                                         ║"
echo "║                                                                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║   Production:  https://${DOMAIN_PROD}"
echo "║   Dashboard:   https://${DOMAIN_DASHBOARD}"
echo "║   Server IP:   ${SERVER_IP}"
echo "║                                                                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║   NEXT STEPS (do these in order!):                             ║"
echo "║                                                                ║"
echo "║   1. Open https://${DOMAIN_PROD}"
echo "║      or http://${SERVER_IP}:8069"
echo "║      → Create database (MUST be lowercase name!)"
echo "║      → Save the Master DB password!"
echo "║                                                                ║"
echo "║   2. Settings → Enable Developer Mode                         ║"
echo "║                                                                ║"
echo "║   3. Apps → Update Apps List                                   ║"
echo "║                                                                ║"
echo "║   4. Search \"unlimited\" → Install odoo_unlimited              ║"
echo "║      (the Activate button appears after this)                  ║"
echo "║                                                                ║"
echo "║   5. Apps → Install Accounting                                 ║"
echo "║      If error \"currently processing another module\":           ║"
echo "║      → docker compose restart web                              ║"
echo "║      → Wait 30 seconds, then retry                            ║"
echo "║                                                                ║"
echo "║   6. Main menu → Register → Enter any code (e.g. abc123456)  ║"
echo "║                                                                ║"
echo "║   7. Open the dashboard:                                       ║"
echo "║      https://${DOMAIN_DASHBOARD}                              ║"
echo "║      Default password: see DASHBOARD_ADMIN_PASSWORD in .env  ║"
echo "║                                                                ║"
echo "║   8. Create staging instances from the dashboard or CLI:      ║"
echo "║      cd ${INSTALL_DIR}                                        ║"
echo "║      bash scripts/staging-manager.sh create --name \"test\"    ║"
echo "║                                                                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║   DEPLOY COMMANDS (via SSH or Claude Code):                    ║"
echo "║                                                                ║"
echo "║   Deploy (or use the dashboard):                               ║"
echo "║   ssh root@${SERVER_IP} \\"
echo "║     \"bash ${INSTALL_DIR}/scripts/deploy-staging.sh\""
echo "║                                                                ║"
echo "║   Production:                                                  ║"
echo "║   ssh root@${SERVER_IP} \\"
echo "║     \"bash ${INSTALL_DIR}/scripts/deploy-prod.sh\""
echo "║                                                                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║   AUTOMATED:                                                   ║"
echo "║   • SSL auto-renews via cron (3:00 AM daily)                  ║"
echo "║   • DB backup runs daily (2:00 AM) → ${BACKUP_DIR}/"
echo "║   • Backups older than 30 days auto-deleted                    ║"
echo "║   • Config saved to ${INSTALL_DIR}/.deploy-config"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Show SSL status warning if needed
if [ "$PROD_SELF_SIGNED" = "true" ] || [ "$STAGING_SELF_SIGNED" = "true" ]; then
  echo -e "${YELLOW}${BOLD}⚠️  SSL WARNING: Some domains are using self-signed certificates.${NC}"
  echo -e "${YELLOW}See the SSL fix commands printed above during Step 6.${NC}\n"
fi

echo "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "odoo|nginx"
echo ""
