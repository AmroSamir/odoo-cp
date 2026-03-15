#!/bin/bash
# ╔════════════════════════════════════════════════════════════════════╗
# ║  Odoo 19 Enterprise — Advanced Staging Manager                   ║
# ║                                                                    ║
# ║  Replaces the fixed --profile staging approach with on-demand     ║
# ║  isolated staging instances, each with their own DB, filestore,   ║
# ║  Docker network, and optional SSL subdomain.                      ║
# ║                                                                    ║
# ║  Usage:                                                            ║
# ║    ./staging-manager.sh create --name "test-invoice"              ║
# ║    ./staging-manager.sh list                                       ║
# ║    ./staging-manager.sh stop   --name "test-invoice"              ║
# ║    ./staging-manager.sh start  --name "test-invoice"              ║
# ║    ./staging-manager.sh remove --name "test-invoice"              ║
# ║    ./staging-manager.sh logs   --name "test-invoice" [--follow]   ║
# ║    ./staging-manager.sh remove-all                                 ║
# ╚════════════════════════════════════════════════════════════════════╝
set -euo pipefail

# ── Source libraries ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/lib/common.sh"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/lib/docker-helpers.sh"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/lib/nginx-helpers.sh"

# ── Cleanup trap (used in create) ─────────────────────────────────────────────
_CREATING_NAME=""
_cleanup_on_error() {
  local exit_code=$?
  if [ -n "$_CREATING_NAME" ] && [ $exit_code -ne 0 ]; then
    log_warn "Error during create — cleaning up partial instance stg-${_CREATING_NAME}..."
    _force_remove "$_CREATING_NAME" 2>/dev/null || true
  fi
  release_lock 2>/dev/null || true
}

# ════════════════════════════════════════════════════════════════════════════════
# COMMAND: create
# ════════════════════════════════════════════════════════════════════════════════
cmd_create() {
  local name="" port="" ttl="" with_ssl=false

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name)    name="$2";  shift 2 ;;
      --port)    port="$2";  shift 2 ;;
      --ttl)     ttl="$2";   shift 2 ;;
      --with-ssl) with_ssl=true; shift ;;
      *) log_error "Unknown argument: $1"; cmd_help; exit 1 ;;
    esac
  done

  if [ -z "$name" ]; then
    log_error "--name is required"
    cmd_help
    exit 1
  fi

  log_step "Creating staging instance"

  check_dependencies

  # Sanitize name
  name=$(sanitize_name "$name")
  log_info "Instance name: stg-${name}"

  # Check not already exists
  if registry_exists "$name"; then
    log_error "Instance 'stg-${name}' already exists. Use a different name or remove it first."
    exit 1
  fi

  # Resolve port
  if [ -z "$port" ]; then
    port=$(get_next_port)
    log_info "Auto-assigned port: $port"
  else
    if is_port_in_use "$port"; then
      log_error "Port $port is already in use."
      exit 1
    fi
    log_info "Using port: $port"
  fi

  # Validate TTL
  if [ -n "$ttl" ] && ! [[ "$ttl" =~ ^[0-9]+$ ]]; then
    log_error "--ttl must be a positive integer (days)"
    exit 1
  fi

  # Acquire lock and set up trap
  acquire_lock
  _CREATING_NAME="$name"
  trap '_cleanup_on_error' EXIT

  local instance_dir="${STAGING_DIR}/stg-${name}"

  # Create directory structure
  log_info "Creating directory structure..."
  mkdir -p "${instance_dir}/config"
  mkdir -p "${instance_dir}/data/postgres"
  mkdir -p "${instance_dir}/filestore"
  mkdir -p "${instance_dir}/logs"

  # Generate DB credentials
  local db_user="stg_$(echo "$name" | tr '-' '_')"
  local db_pass
  db_pass=$(openssl rand -hex 16)
  local db_name="stg-${name}"   # Lowercase — Odoo 19 requirement

  log_info "DB name: $db_name | DB user: $db_user"

  # Generate config files
  log_info "Generating configuration files..."
  generate_instance_odoo_conf "${instance_dir}/config" "$db_user" "$db_pass" "$db_name"
  generate_instance_compose "$instance_dir" "$name" "$port" "$db_user" "$db_pass" "$db_name"
  generate_instance_manage_sh "$instance_dir" "$name"

  # Clone production database
  log_step "Cloning production database"
  _clone_production_db "$name" "$instance_dir" "$db_user" "$db_pass" "$db_name"

  # Copy production filestore
  log_step "Copying production filestore"
  _copy_filestore "$instance_dir"

  # Start full stack
  log_step "Starting staging instance"
  compose_up "$instance_dir"

  # Optional: nginx vhost + SSL
  if [ "$with_ssl" = "true" ]; then
    log_step "Setting up SSL and Nginx vhost"
    generate_nginx_vhost "$name" "$port"
    request_ssl_cert "${name}.${DOMAIN_STAGING}"
  fi

  # Write to registry
  local created_at
  created_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local registry_entry
  registry_entry=$(cat <<JSON
{
  "name": "${name}",
  "port": ${port},
  "db_name": "${db_name}",
  "db_user": "${db_user}",
  "created_at": "${created_at}",
  "ttl_days": ${ttl:-null},
  "with_ssl": ${with_ssl},
  "status": "running"
}
JSON
)
  registry_add "$registry_entry"

  # Release lock and clear trap
  release_lock
  _CREATING_NAME=""
  trap - EXIT

  # Print summary
  echo ""
  echo -e "${_GREEN}${_BOLD}╔════════════════════════════════════════════════════╗${_NC}"
  echo -e "${_GREEN}${_BOLD}║  ✅  Staging instance created successfully!        ║${_NC}"
  echo -e "${_GREEN}${_BOLD}╠════════════════════════════════════════════════════╣${_NC}"
  echo -e "${_GREEN}${_BOLD}║${_NC}  Name:    stg-${name}"
  echo -e "${_GREEN}${_BOLD}║${_NC}  Port:    http://SERVER_IP:${port}"
  if [ "$with_ssl" = "true" ]; then
    echo -e "${_GREEN}${_BOLD}║${_NC}  URL:     https://${name}.${DOMAIN_STAGING}"
  fi
  echo -e "${_GREEN}${_BOLD}║${_NC}  DB:      ${db_name} (user: ${db_user})"
  if [ -n "$ttl" ]; then
    echo -e "${_GREEN}${_BOLD}║${_NC}  TTL:     ${ttl} days"
  fi
  echo -e "${_GREEN}${_BOLD}╚════════════════════════════════════════════════════╝${_NC}"
  echo ""
  log_info "To manage this instance: ${instance_dir}/manage.sh [start|stop|logs|status|remove]"
}

# ── Clone production DB ───────────────────────────────────────────────────────
_clone_production_db() {
  local name="$1"
  local instance_dir="$2"
  local db_user="$3"
  local db_pass="$4"
  local db_name="$5"
  local safe_name
  safe_name=$(echo "$name" | tr '-' '_')
  local dump_file="/tmp/stg-${name}-$(date +%s).dump"

  # Ensure production DB container is running
  if ! is_container_running "db_odoo"; then
    log_error "Production DB container 'db_odoo' is not running"
    exit 1
  fi

  log_info "Dumping production database (this may take a few minutes)..."
  if ! docker exec db_odoo bash -c "pg_dumpall -U odoo --globals-only" > "${dump_file}.globals" 2>/dev/null; then
    log_warn "Could not dump globals — continuing without them"
  fi

  # Find the production DB name (first non-template, non-postgres DB)
  local prod_db
  prod_db=$(docker exec db_odoo psql -U odoo -t -c \
    "SELECT datname FROM pg_database WHERE datname NOT IN ('postgres','template0','template1') ORDER BY datname LIMIT 1;" \
    2>/dev/null | tr -d ' \n' || echo "")

  if [ -z "$prod_db" ]; then
    log_error "Could not find a production database in db_odoo. Create a database first."
    rm -f "${dump_file}.globals"
    exit 1
  fi

  log_info "Found production database: $prod_db — dumping..."
  docker exec db_odoo pg_dump -U odoo -Fc "$prod_db" > "$dump_file"
  log_info "Dump complete ($(du -sh "$dump_file" | cut -f1))"

  # Start only the DB container for this instance
  log_info "Starting staging DB container..."
  docker compose -f "${instance_dir}/docker-compose.yml" up -d db

  wait_for_postgres "db_stg_${safe_name}"

  # Create the staging user and database
  log_info "Creating staging database and user..."
  docker exec "db_stg_${safe_name}" psql -U postgres -c \
    "CREATE USER \"${db_user}\" WITH PASSWORD '${db_pass}';" 2>/dev/null || true
  docker exec "db_stg_${safe_name}" psql -U postgres -c \
    "CREATE DATABASE \"${db_name}\" OWNER \"${db_user}\";" 2>/dev/null || true
  docker exec "db_stg_${safe_name}" psql -U postgres -c \
    "GRANT ALL PRIVILEGES ON DATABASE \"${db_name}\" TO \"${db_user}\";" 2>/dev/null || true

  # Restore the dump
  log_info "Restoring production dump into staging database..."
  docker exec -i "db_stg_${safe_name}" pg_restore \
    -U "${db_user}" \
    -d "${db_name}" \
    --no-owner \
    --no-acl \
    --exit-on-error \
    < "$dump_file" || {
      log_warn "pg_restore completed with warnings (common for cross-user restores)"
    }

  # Clean up dump file
  rm -f "$dump_file" "${dump_file}.globals"
  log_success "Production database cloned to stg-${name}"
}

# ── Copy production filestore ─────────────────────────────────────────────────
_copy_filestore() {
  local instance_dir="$1"
  local prod_filestore="${INSTALL_DIR}/odoo-data"

  if [ -d "$prod_filestore" ] && [ "$(ls -A "$prod_filestore" 2>/dev/null)" ]; then
    log_info "Copying production filestore (this may take a while)..."
    cp -a "${prod_filestore}/." "${instance_dir}/filestore/"
    log_success "Filestore copied ($(du -sh "${instance_dir}/filestore" | cut -f1))"
  else
    log_warn "Production filestore is empty or missing — starting with empty filestore"
  fi
}

# ── Force remove (used by cleanup trap) ──────────────────────────────────────
_force_remove() {
  local name="$1"
  local instance_dir="${STAGING_DIR}/stg-${name}"
  compose_down "$instance_dir" --volumes 2>/dev/null || true
  remove_nginx_vhost "$name" 2>/dev/null || true
  rm -rf "$instance_dir" 2>/dev/null || true
  registry_delete "$name" 2>/dev/null || true
}

# ════════════════════════════════════════════════════════════════════════════════
# COMMAND: list
# ════════════════════════════════════════════════════════════════════════════════
cmd_list() {
  _ensure_registry
  local instances
  instances=$(registry_get_all)
  local count
  count=$(echo "$instances" | jq 'length')

  echo ""
  echo -e "${_CYAN}${_BOLD}  Odoo Staging Instances${_NC}"
  echo "  ─────────────────────────────────────────────────────────────────"

  # Production instance
  local prod_status="stopped"
  if is_container_running "web_odoo"; then prod_status="running"; fi
  local prod_indicator="${_RED}●${_NC}"
  [ "$prod_status" = "running" ] && prod_indicator="${_GREEN}●${_NC}"
  printf "  %-25s %-10s %-8s %s\n" "NAME" "PORT" "STATUS" "CREATED"
  echo "  ─────────────────────────────────────────────────────────────────"
  echo -e "  ${prod_indicator} production               8069      ${prod_status}     (production)"

  if [ "$count" -eq 0 ]; then
    echo ""
    echo "  No staging instances found."
    echo "  Create one with: staging-manager.sh create --name \"my-test\""
  else
    echo "$instances" | jq -r '.[] | [.name, .port, .status, .created_at, (.ttl_days // "∞")] | @tsv' | \
    while IFS=$'\t' read -r iname iport istatus icreated ittl; do
      # Live status check
      local safe_name
      safe_name=$(echo "$iname" | tr '-' '_')
      local live_status
      live_status=$(get_container_status "web_stg_${safe_name}" 2>/dev/null || echo "absent")
      local indicator="${_RED}●${_NC}"
      case "$live_status" in
        running) indicator="${_GREEN}●${_NC}" ;;
        exited)  indicator="${_YELLOW}●${_NC}" ;;
      esac
      local age
      age=$(date -d "$icreated" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$icreated" +%s 2>/dev/null || echo "0")
      local now
      now=$(date +%s)
      local days_old=$(( (now - age) / 86400 ))
      printf "  " && echo -e "${indicator} stg-%-20s %-10s %-10s %s ago (TTL: ${ittl}d)" \
        "$iname" "$iport" "$live_status" "${days_old}d"
    done
  fi

  echo ""
  echo -e "  ${_BOLD}Total staging instances: $count${_NC}"
  echo ""
}

# ════════════════════════════════════════════════════════════════════════════════
# COMMAND: start
# ════════════════════════════════════════════════════════════════════════════════
cmd_start() {
  local name=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name) name="$2"; shift 2 ;;
      *) log_error "Unknown argument: $1"; exit 1 ;;
    esac
  done
  [ -z "$name" ] && { log_error "--name is required"; exit 1; }
  name=$(sanitize_name "$name")

  if ! registry_exists "$name"; then
    log_error "Instance 'stg-${name}' not found in registry"
    exit 1
  fi

  local instance_dir="${STAGING_DIR}/stg-${name}"
  log_info "Starting stg-${name}..."
  compose_up "$instance_dir"
  registry_update_status "$name" "running"
  log_success "stg-${name} started"
}

# ════════════════════════════════════════════════════════════════════════════════
# COMMAND: stop
# ════════════════════════════════════════════════════════════════════════════════
cmd_stop() {
  local name=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name) name="$2"; shift 2 ;;
      *) log_error "Unknown argument: $1"; exit 1 ;;
    esac
  done
  [ -z "$name" ] && { log_error "--name is required"; exit 1; }
  name=$(sanitize_name "$name")

  if ! registry_exists "$name"; then
    log_error "Instance 'stg-${name}' not found in registry"
    exit 1
  fi

  local instance_dir="${STAGING_DIR}/stg-${name}"
  log_info "Stopping stg-${name} (data is preserved)..."
  compose_down "$instance_dir"
  registry_update_status "$name" "stopped"
  log_success "stg-${name} stopped"
}

# ════════════════════════════════════════════════════════════════════════════════
# COMMAND: remove
# ════════════════════════════════════════════════════════════════════════════════
cmd_remove() {
  local name="" force=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name)  name="$2"; shift 2 ;;
      --force) force=true; shift ;;
      *) log_error "Unknown argument: $1"; exit 1 ;;
    esac
  done
  [ -z "$name" ] && { log_error "--name is required"; exit 1; }
  name=$(sanitize_name "$name")

  if ! registry_exists "$name"; then
    log_warn "Instance 'stg-${name}' not found in registry — checking filesystem..."
    if [ ! -d "${STAGING_DIR}/stg-${name}" ]; then
      log_error "Instance 'stg-${name}' does not exist"
      exit 1
    fi
  fi

  if [ "$force" = "false" ]; then
    confirm_prompt "This will PERMANENTLY DELETE stg-${name} and all its data."
  fi

  log_step "Removing stg-${name}"
  _force_remove "$name"
  log_success "stg-${name} removed successfully"
}

# ════════════════════════════════════════════════════════════════════════════════
# COMMAND: remove-all
# ════════════════════════════════════════════════════════════════════════════════
cmd_remove_all() {
  local force=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --force) force=true; shift ;;
      *) log_error "Unknown argument: $1"; exit 1 ;;
    esac
  done

  _ensure_registry
  local count
  count=$(jq 'length' "$REGISTRY_FILE")

  if [ "$count" -eq 0 ]; then
    log_info "No staging instances to remove."
    return 0
  fi

  if [ "$force" = "false" ]; then
    confirm_prompt "This will PERMANENTLY DELETE all $count staging instance(s) and their data."
  fi

  log_step "Removing all staging instances"
  jq -r '.[].name' "$REGISTRY_FILE" | while read -r iname; do
    log_info "Removing stg-${iname}..."
    _force_remove "$iname" || log_warn "Failed to fully remove stg-${iname}"
  done

  log_success "All staging instances removed"
}

# ════════════════════════════════════════════════════════════════════════════════
# COMMAND: logs
# ════════════════════════════════════════════════════════════════════════════════
cmd_logs() {
  local name="" follow=false tail_lines=100
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name)   name="$2"; shift 2 ;;
      --follow) follow=true; shift ;;
      --tail)   tail_lines="$2"; shift 2 ;;
      *) log_error "Unknown argument: $1"; exit 1 ;;
    esac
  done
  [ -z "$name" ] && { log_error "--name is required"; exit 1; }
  name=$(sanitize_name "$name")

  local instance_dir="${STAGING_DIR}/stg-${name}"
  if [ ! -d "$instance_dir" ]; then
    log_error "Instance directory not found: $instance_dir"
    exit 1
  fi

  local args=("--tail=${tail_lines}")
  [ "$follow" = "true" ] && args+=("-f")
  compose_logs "$instance_dir" "${args[@]}"
}

# ════════════════════════════════════════════════════════════════════════════════
# COMMAND: help
# ════════════════════════════════════════════════════════════════════════════════
cmd_help() {
  echo ""
  echo -e "${_CYAN}${_BOLD}  Odoo Staging Manager${_NC}"
  echo ""
  echo "  Usage: staging-manager.sh <command> [options]"
  echo ""
  echo "  Commands:"
  echo "    create     Create a new on-demand staging instance (clones production)"
  echo "    list       List all staging instances with status"
  echo "    start      Start a stopped staging instance"
  echo "    stop       Stop a running staging instance (data preserved)"
  echo "    remove     Remove a staging instance and all its data"
  echo "    remove-all Remove ALL staging instances"
  echo "    logs       View logs for an instance"
  echo "    help       Show this help"
  echo ""
  echo "  Create options:"
  echo "    --name NAME        Instance name (required, auto-lowercased)"
  echo "    --port PORT        Port number (auto-assigned from 8171-8199 if omitted)"
  echo "    --ttl DAYS         Auto-delete after N days (optional)"
  echo "    --with-ssl         Generate nginx vhost + request SSL certificate"
  echo ""
  echo "  Examples:"
  echo "    ./staging-manager.sh create --name \"test-invoice\""
  echo "    ./staging-manager.sh create --name \"hr-test\" --port 8175 --ttl 7"
  echo "    ./staging-manager.sh create --name \"demo\" --with-ssl"
  echo "    ./staging-manager.sh list"
  echo "    ./staging-manager.sh stop --name \"test-invoice\""
  echo "    ./staging-manager.sh remove --name \"test-invoice\""
  echo "    ./staging-manager.sh logs --name \"test-invoice\" --follow"
  echo ""
}

# ════════════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════════════
main() {
  local command="${1:-help}"
  shift || true

  case "$command" in
    create)     cmd_create "$@" ;;
    list)       cmd_list "$@" ;;
    start)      cmd_start "$@" ;;
    stop)       cmd_stop "$@" ;;
    remove)     cmd_remove "$@" ;;
    remove-all) cmd_remove_all "$@" ;;
    logs)       cmd_logs "$@" ;;
    help|--help|-h) cmd_help ;;
    *)
      log_error "Unknown command: $command"
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
