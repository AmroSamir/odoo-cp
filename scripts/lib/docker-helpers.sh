#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/lib/docker-helpers.sh — Docker utilities for staging-manager
# Requires: common.sh sourced first (provides INSTALL_DIR, STAGING_DIR, etc.)
# ─────────────────────────────────────────────────────────────────────────────

PORT_RANGE_MIN="${PORT_RANGE_MIN:-8171}"
PORT_RANGE_MAX="${PORT_RANGE_MAX:-8199}"

# ── Port discovery ────────────────────────────────────────────────────────────
# Scans PORT_RANGE_MIN..PORT_RANGE_MAX, returns first port not in registry
# and not currently listening on the host.
get_next_port() {
  local port
  for port in $(seq "$PORT_RANGE_MIN" "$PORT_RANGE_MAX"); do
    # Check registry
    if jq -e --argjson p "$port" '.[] | select(.port == $p)' "$REGISTRY_FILE" &>/dev/null 2>&1; then
      continue
    fi
    # Check if port is already bound (ss preferred over netstat on Ubuntu 24.04)
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
      continue
    fi
    echo "$port"
    return 0
  done
  log_error "No free ports available in range ${PORT_RANGE_MIN}-${PORT_RANGE_MAX}"
  exit 1
}

# ── Port in-use check ─────────────────────────────────────────────────────────
is_port_in_use() {
  local port="$1"
  # Check registry
  if jq -e --argjson p "$port" '.[] | select(.port == $p)' "$REGISTRY_FILE" &>/dev/null 2>&1; then
    return 0
  fi
  # Check live
  if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
    return 0
  fi
  return 1
}

# ── Wait for PostgreSQL to be ready ──────────────────────────────────────────
# Usage: wait_for_postgres <container_name> [timeout_seconds]
wait_for_postgres() {
  local container="$1"
  local timeout="${2:-60}"
  local elapsed=0
  local interval=2

  log_info "Waiting for PostgreSQL in $container to be ready..."
  while [ $elapsed -lt $timeout ]; do
    if docker exec "$container" pg_isready -q 2>/dev/null; then
      log_info "PostgreSQL is ready in $container"
      return 0
    fi
    sleep $interval
    elapsed=$((elapsed + interval))
  done
  log_error "PostgreSQL in $container did not become ready after ${timeout}s"
  return 1
}

# ── Container status check ───────────────────────────────────────────────────
is_container_running() {
  local container="$1"
  local status
  status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "absent")
  [ "$status" = "running" ]
}

is_container_present() {
  local container="$1"
  docker inspect "$container" &>/dev/null
}

get_container_status() {
  local container="$1"
  docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "absent"
}

# ── Compose helpers ───────────────────────────────────────────────────────────
# Usage: compose_up <instance_dir> [service...]
compose_up() {
  local instance_dir="$1"; shift
  local compose_file="${instance_dir}/docker-compose.yml"
  if [ ! -f "$compose_file" ]; then
    log_error "docker-compose.yml not found in $instance_dir"
    return 1
  fi
  docker compose -f "$compose_file" up -d "$@"
}

# Usage: compose_down <instance_dir> [--volumes]
compose_down() {
  local instance_dir="$1"; shift
  local compose_file="${instance_dir}/docker-compose.yml"
  if [ ! -f "$compose_file" ]; then
    log_warn "docker-compose.yml not found in $instance_dir, skipping compose down"
    return 0
  fi
  docker compose -f "$compose_file" down "$@"
}

# Usage: compose_logs <instance_dir> [--follow] [--tail=N]
compose_logs() {
  local instance_dir="$1"; shift
  local compose_file="${instance_dir}/docker-compose.yml"
  if [ ! -f "$compose_file" ]; then
    log_error "docker-compose.yml not found in $instance_dir"
    return 1
  fi
  docker compose -f "$compose_file" logs "$@"
}

# ── Generate per-instance docker-compose.yml ─────────────────────────────────
generate_instance_compose() {
  local instance_dir="$1"
  local name="$2"
  local port="$3"
  local db_user="$4"
  local db_pass="$5"
  local db_name="$6"

  # Sanitize name for container naming (replace hyphens with underscores)
  local safe_name
  safe_name=$(echo "$name" | tr '-' '_')

  cat > "${instance_dir}/docker-compose.yml" << COMPOSE
services:

  db:
    image: pgvector/pgvector:pg17
    container_name: db_stg_${safe_name}
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: ${db_user}
      POSTGRES_PASSWORD: ${db_pass}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - ./data/postgres:/var/lib/postgresql/data/pgdata
    restart: unless-stopped
    networks:
      - stg-${name}-net

  web:
    image: odoo:19
    container_name: web_stg_${safe_name}
    user: root
    depends_on:
      - db
    ports:
      - "${port}:8069"
    environment:
      - HOST=db
      - USER=${db_user}
      - PASSWORD=${db_pass}
      - ODOO_PROXY_MODE=True
    volumes:
      - ${INSTALL_DIR}/addons:/usr/lib/python3/dist-packages/odoo/addons:ro
      - ${INSTALL_DIR}/extra-addons:/mnt/extra-addons:ro
      - ./filestore:/var/lib/odoo
      - ./config/odoo.conf:/etc/odoo/odoo.conf:ro
      - ./logs:/var/log/odoo
    restart: unless-stopped
    networks:
      - stg-${name}-net

networks:
  stg-${name}-net:
    driver: bridge
COMPOSE

  log_info "Generated docker-compose.yml for stg-${name}"
}

# ── Generate per-instance odoo.conf ──────────────────────────────────────────
generate_instance_odoo_conf() {
  local config_dir="$1"
  local db_user="$2"
  local db_pass="$3"
  local db_name="$4"

  cat > "${config_dir}/odoo.conf" << ODOOCONF
[options]
addons_path = /mnt/extra-addons,/usr/lib/python3/dist-packages/odoo/addons
db_host = db
db_port = 5432
db_user = ${db_user}
db_password = ${db_pass}
db_name = ${db_name}
http_port = 8069
workers = 2
max_cron_threads = 1
proxy_mode = True
logfile = /var/log/odoo/odoo.log
log_level = info
ODOOCONF

  log_info "Generated odoo.conf for instance"
}

# ── Generate per-instance manage.sh ──────────────────────────────────────────
generate_instance_manage_sh() {
  local instance_dir="$1"
  local name="$2"

  cat > "${instance_dir}/manage.sh" << 'MANAGESH'
#!/bin/bash
# Auto-generated by staging-manager.sh — do not edit manually
# Usage: ./manage.sh [start|stop|restart|logs|status|remove]
set -e
INSTANCE_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$INSTANCE_DIR/docker-compose.yml"

case "${1:-help}" in
  start)
    docker compose -f "$COMPOSE_FILE" up -d
    echo "Instance started."
    ;;
  stop)
    docker compose -f "$COMPOSE_FILE" down
    echo "Instance stopped."
    ;;
  restart)
    docker compose -f "$COMPOSE_FILE" restart
    echo "Instance restarted."
    ;;
  logs)
    shift
    docker compose -f "$COMPOSE_FILE" logs "${@:---tail=100}"
    ;;
  status)
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  remove)
    echo "WARNING: This will permanently delete this instance and its data."
    read -r -p "Type 'yes' to confirm: " ans
    if [ "$ans" = "yes" ]; then
      docker compose -f "$COMPOSE_FILE" down --volumes
      echo "Stopped and removed containers."
      echo "To fully clean up, also run: rm -rf $INSTANCE_DIR"
    else
      echo "Aborted."
    fi
    ;;
  help|*)
    echo "Usage: ./manage.sh [start|stop|restart|logs|status|remove]"
    ;;
esac
MANAGESH

  chmod +x "${instance_dir}/manage.sh"
  log_info "Generated manage.sh for stg-${name}"
}
