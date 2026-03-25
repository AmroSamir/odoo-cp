#!/bin/bash
set -e

# ╔════════════════════════════════════════════════════════════════════╗
# ║  Setup Production Odoo — Called from the Dashboard                ║
# ║                                                                    ║
# ║  Flow (matches the original working setup-odoo.sh):               ║
# ║    1. Downloads Odoo Enterprise addons (~900 MB from Dropbox)     ║
# ║    2. Downloads odoo_unlimited addon                              ║
# ║    3. Generates Dockerfile + docker-compose.yml                   ║
# ║    4. Gets SSL certificate (two-phase nginx approach)             ║
# ║    5. Builds and starts Odoo containers                           ║
# ║    6. Updates .deploy-config                                      ║
# ║                                                                    ║
# ║  NOTE: nginx reload is handled by the dashboard backend AFTER     ║
# ║  this script completes and the SSE stream ends.                   ║
# ║                                                                    ║
# ║  Usage:                                                            ║
# ║    bash setup-production.sh --domain erp.example.com              ║
# ╚════════════════════════════════════════════════════════════════════╝

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$INSTALL_DIR/.deploy-config" ]; then
  source "$INSTALL_DIR/.deploy-config"
fi

BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
DROPBOX_URL="https://www.dropbox.com/scl/fi/rtt0vplxrao3elzk3fooz/odoo19e-docker.zip?rlkey=k1vwn8g2s1eao07kc6hqnyusp&st=29zgcif9&dl=1"
ODOO_UNLIMITED_URL="https://www.dropbox.com/scl/fi/8f9l9h2w1z8r6qkzefc97/odoo_unlimited.zip?rlkey=a4j5kpiktxc06827tzelj5j4r&st=ju8fh4oi&dl=1"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✘]${NC} $1"; }
step() { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}\n"; }

# ── Parse arguments ──────────────────────────────────────────────
DOMAIN_PROD=""
DOMAIN_STAGING_OVERRIDE=""
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN_PROD="$2"; shift 2 ;;
    --staging-domain) DOMAIN_STAGING_OVERRIDE="$2"; shift 2 ;;
    --force) FORCE=true; shift ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

if [ -z "$DOMAIN_PROD" ]; then
  err "Usage: setup-production.sh --domain erp.example.com"
  exit 1
fi

DOMAIN_STAGING="${DOMAIN_STAGING_OVERRIDE:-staging.${DOMAIN_PROD}}"

if [ -z "$DOMAIN_DASHBOARD" ]; then err "DOMAIN_DASHBOARD not found in .deploy-config"; exit 1; fi
if [ -z "$SSL_EMAIL" ]; then err "SSL_EMAIL not found in .deploy-config"; exit 1; fi

echo ""
log "Production domain:  $DOMAIN_PROD"
log "Staging base:       $DOMAIN_STAGING"
log "Dashboard domain:   $DOMAIN_DASHBOARD"
log "Install directory:  $INSTALL_DIR"
echo ""

EXISTING_PROD=$(grep "^DOMAIN_PROD=" "$INSTALL_DIR/.deploy-config" 2>/dev/null | cut -d= -f2)
if [ -n "$EXISTING_PROD" ] && [ "$FORCE" = false ]; then
  err "Production is already deployed at $EXISTING_PROD"
  err "Use --force to re-run setup"
  exit 1
fi


# ════════════════════════════════════════════════════════════════════
# STEP 1: Download Odoo Enterprise addons
# ════════════════════════════════════════════════════════════════════
step "Step 1/5 — Downloading Odoo Enterprise addons"

if [ -d "$INSTALL_DIR/addons" ] && [ "$(ls -A "$INSTALL_DIR/addons" 2>/dev/null)" ]; then
  log "addons/ already exists — skipping download"
else
  log "Downloading Odoo Enterprise package from Dropbox (~900 MB)..."
  wget -q --show-progress "$DROPBOX_URL" -O /tmp/odoo19e-docker.zip || {
    err "Failed to download addons package"
    exit 1
  }
  log "Extracting addons/ directory..."
  mkdir -p /tmp/odoo-extract
  unzip -q -o /tmp/odoo19e-docker.zip -d /tmp/odoo-extract

  ADDONS_SRC=$(find /tmp/odoo-extract -maxdepth 3 -name "addons" -type d | head -1)
  if [ -n "$ADDONS_SRC" ]; then
    cp -r "$ADDONS_SRC" "$INSTALL_DIR/addons"
    log "addons/ installed ($(ls "$INSTALL_DIR/addons" | wc -l) modules)"
  else
    warn "Could not locate addons/ — Odoo will use built-in addons only"
  fi

  rm -rf /tmp/odoo-extract /tmp/odoo19e-docker.zip
fi

# Merge core Odoo modules into addons/ directory.
# The Dropbox zip has Enterprise addons but may be missing core modules (base, web, etc.)
# that Odoo needs to boot. We extract ALL core modules from the Docker image first,
# then overlay Enterprise addons on top — so Enterprise versions win where they exist.
if [ -d "$INSTALL_DIR/addons" ]; then
  log "Ensuring core Odoo modules are present in addons/..."
  docker pull odoo:19 > /dev/null 2>&1 || true

  # Extract all core addons from the Docker image
  rm -rf /tmp/odoo-core-addons
  docker run --rm --user root -v /tmp/odoo-core-addons:/mnt/out odoo:19 \
    sh -c "cp -r /usr/lib/python3/dist-packages/odoo/addons/* /mnt/out/ && cp -r /usr/lib/python3/dist-packages/addons/* /mnt/out/" 2>/dev/null || true

  if [ -d "/tmp/odoo-core-addons" ]; then
    # Copy core modules WITHOUT overwriting existing Enterprise addons
    cp -rn /tmp/odoo-core-addons/* "$INSTALL_DIR/addons/" 2>/dev/null || true
    rm -rf /tmp/odoo-core-addons
    log "Core modules merged — $(ls "$INSTALL_DIR/addons" | wc -l) total modules"
  fi
fi

mkdir -p "$INSTALL_DIR/extra-addons/custom"
mkdir -p "$INSTALL_DIR/odoo-data"


# ════════════════════════════════════════════════════════════════════
# STEP 2: Generate Dockerfile + docker-compose.yml
# ════════════════════════════════════════════════════════════════════
step "Step 2/5 — Generating Docker configuration"

cat > "$INSTALL_DIR/Dockerfile" << 'DOCKERFILE'
FROM odoo:19

USER root

# Install system dependencies needed by Odoo modules
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    wkhtmltopdf \
    python3-google-auth \
    python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Install Python libraries needed by Odoo modules
RUN pip3 install imgkit google-auth --break-system-packages

USER odoo
DOCKERFILE

log "Dockerfile created"

if [ -f "$INSTALL_DIR/.env" ]; then
  source "$INSTALL_DIR/.env"
fi

# docker-compose.yml — uses the ORIGINAL working addons mount path
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
    command: ["--db-filter=.*", "--proxy-mode"]
    environment:
      - HOST=db
      - USER=odoo
      - PASSWORD=odoo
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

log "docker-compose.yml created"


# ════════════════════════════════════════════════════════════════════
# STEP 3: SSL Certificate for production domain
# ════════════════════════════════════════════════════════════════════
step "Step 3/5 — SSL certificate for production domain"

docker run --rm -v /var/www:/var/www alpine mkdir -p /var/www/certbot 2>/dev/null || true

CERT_EXISTS=$(docker run --rm -v /etc/letsencrypt:/etc/letsencrypt alpine sh -c "[ -f '/etc/letsencrypt/live/$DOMAIN_PROD/fullchain.pem' ] && echo yes || echo no" 2>/dev/null || echo "no")

if [ "$CERT_EXISTS" = "yes" ]; then
  log "SSL cert for $DOMAIN_PROD already exists — skipping"
else
  # ── Phase 1: Add production domain to nginx HTTP block for ACME challenge ──
  # Write a TEMPORARY nginx config that adds HTTP for production domain
  # but keeps the existing dashboard HTTPS block unchanged.
  log "Adding production domain to nginx for ACME challenge..."

  cat > "$INSTALL_DIR/nginx/default.conf" << NGINXCONF_TEMP
# Temporary config — HTTP for both domains (ACME challenge), HTTPS only for dashboard
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

# Dashboard HTTPS (unchanged — keeps existing SSE connection alive)
server {
    listen 443 ssl;
    server_name ${DOMAIN_DASHBOARD};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN_DASHBOARD}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_DASHBOARD}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    client_max_body_size 10M;

    location / {
        proxy_pass http://dashboard:3000;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 3600s;
        proxy_buffering off;
    }
}

include /etc/nginx/staging-instances/*.conf;
NGINXCONF_TEMP

  # Reload nginx with temp config (dashboard HTTPS stays, adds production HTTP)
  docker exec nginx_odoo nginx -s reload 2>/dev/null || true
  sleep 2

  # ── Phase 2: Get real SSL cert via webroot (nginx is serving HTTP for production domain) ──
  log "Requesting SSL certificate for $DOMAIN_PROD..."

  if docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot certonly --webroot \
      -w /var/www/certbot \
      -d "$DOMAIN_PROD" \
      --email "$SSL_EMAIL" \
      --agree-tos \
      --no-eff-email \
      --non-interactive \
      --keep-until-expiring 2>&1; then
    log "SSL cert for $DOMAIN_PROD obtained successfully!"
  else
    # Only create self-signed if no cert file exists at all — never overwrite existing certs
    CERT_FILE_EXISTS=$(docker run --rm -v /etc/letsencrypt:/etc/letsencrypt alpine sh -c "[ -f '/etc/letsencrypt/live/$DOMAIN_PROD/fullchain.pem' ] && echo yes || echo no" 2>/dev/null || echo "no")
    if [ "$CERT_FILE_EXISTS" = "yes" ]; then
      warn "Certbot failed but existing cert found — keeping it"
    else
      warn "Certbot failed — creating self-signed cert as fallback..."
      docker run --rm -v /etc/letsencrypt:/etc/letsencrypt alpine sh -c "
        mkdir -p /etc/letsencrypt/live/$DOMAIN_PROD &&
        apk add --no-cache openssl > /dev/null 2>&1 &&
        openssl req -x509 -nodes -days 30 \
          -newkey rsa:2048 \
          -keyout /etc/letsencrypt/live/$DOMAIN_PROD/privkey.pem \
          -out /etc/letsencrypt/live/$DOMAIN_PROD/fullchain.pem \
          -subj '/CN=$DOMAIN_PROD' 2>/dev/null
      "
      warn "Self-signed cert created — renew from SSL page when rate limit resets"
    fi
  fi
fi

# ── Write the FINAL nginx config with HTTPS for both domains ──
log "Writing final nginx configuration..."

cat > "$INSTALL_DIR/nginx/default.conf" << NGINXCONF
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

server {
    listen 443 ssl;
    server_name ${DOMAIN_DASHBOARD};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN_DASHBOARD}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_DASHBOARD}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    client_max_body_size 10M;

    location / {
        proxy_pass http://dashboard:3000;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 3600s;
        proxy_buffering off;
    }
}

include /etc/nginx/staging-instances/*.conf;
NGINXCONF

log "Final nginx config written"


# ════════════════════════════════════════════════════════════════════
# STEP 4: Download odoo_unlimited addon
# ════════════════════════════════════════════════════════════════════
step "Step 4/5 — Downloading odoo_unlimited addon"

if [ -d "$INSTALL_DIR/extra-addons/odoo_unlimited" ]; then
  warn "odoo_unlimited already exists — replacing with latest..."
  rm -rf "$INSTALL_DIR/extra-addons/odoo_unlimited"
fi

log "Downloading odoo_unlimited.zip..."
wget -q --show-progress "$ODOO_UNLIMITED_URL" -O /tmp/odoo_unlimited.zip || {
  warn "Failed to download odoo_unlimited — you can add it manually later"
}

if [ -f "/tmp/odoo_unlimited.zip" ]; then
  unzip -q -o /tmp/odoo_unlimited.zip -d "$INSTALL_DIR/extra-addons/"
  rm -f /tmp/odoo_unlimited.zip
  if [ -d "$INSTALL_DIR/extra-addons/odoo_unlimited" ]; then
    log "odoo_unlimited addon installed"
  else
    warn "odoo_unlimited may have extracted with a different name"
  fi
fi


# ════════════════════════════════════════════════════════════════════
# STEP 5: Build and start Odoo
# ════════════════════════════════════════════════════════════════════
step "Step 5/5 — Building and starting production Odoo"

cd "$INSTALL_DIR"

# Create deploy scripts
cat > "$INSTALL_DIR/scripts/deploy-prod.sh" << DEPLOYPROD
#!/bin/bash
set -e
cd ${INSTALL_DIR}
echo "=== Pulling latest changes ==="
git pull origin main
echo "=== Backing up production database ==="
mkdir -p ${BACKUP_DIR}
docker exec db_odoo pg_dumpall -U odoo > ${BACKUP_DIR}/odoo-prod-\$(date +%Y%m%d-%H%M%S).sql
echo "=== Rebuilding production + dashboard ==="
docker compose up -d --build web dashboard
docker compose restart nginx
echo "=== Production deployed at https://${DOMAIN_PROD} ==="
DEPLOYPROD
chmod +x "$INSTALL_DIR/scripts/deploy-prod.sh"

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
chmod +x "$INSTALL_DIR/scripts/backup.sh"

# Update .deploy-config
sed -i '/^DOMAIN_PROD=/d' "$INSTALL_DIR/.deploy-config" 2>/dev/null || true
sed -i '/^DOMAIN_STAGING=/d' "$INSTALL_DIR/.deploy-config" 2>/dev/null || true
echo "DOMAIN_PROD=${DOMAIN_PROD}" >> "$INSTALL_DIR/.deploy-config"
echo "DOMAIN_STAGING=${DOMAIN_STAGING}" >> "$INSTALL_DIR/.deploy-config"

log "Updated .deploy-config"

# Build Odoo image (Dockerfile: odoo:19 + wkhtmltopdf + google-auth + imgkit)
# and start web + db containers only — dashboard stays running
log "Building Odoo image and starting containers..."
docker compose -f "$INSTALL_DIR/docker-compose.yml" --project-directory "$INSTALL_DIR" up -d --build web db

# NOTE: nginx reload is done by the dashboard backend AFTER this script ends
# and the SSE stream closes cleanly. NOT here.

# Wait for Odoo to respond
echo -n "Waiting for Odoo to start"
for i in {1..30}; do
  echo -n "."
  sleep 2
  if docker exec web_odoo curl -s -o /dev/null -w "%{http_code}" http://localhost:8069 2>/dev/null | grep -q "200\|303"; then
    break
  fi
done
echo ""

if docker ps --format '{{.Names}}' | grep -q web_odoo; then
  log "Production Odoo is running!"
else
  warn "Odoo may not have started — check: docker logs web_odoo"
fi

echo ""
log "Production deployed at: https://${DOMAIN_PROD}"
log ""
log "Next steps:"
log "  1. Go to https://${DOMAIN_PROD}/web/database/manager"
log "  2. Create a database (MUST be lowercase name)"
log "  3. Install odoo_unlimited addon"
log "  4. Install Accounting"
log "  5. Register with any code (e.g. abc123456)"
log ""
