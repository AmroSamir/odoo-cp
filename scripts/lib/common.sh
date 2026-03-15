#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/lib/common.sh — Shared utilities for staging-manager
# Sourced by staging-manager.sh and ttl-cleanup.sh
# ─────────────────────────────────────────────────────────────────────────────

# ── Load deploy config ────────────────────────────────────────────────────────
_find_deploy_config() {
  local search_dir="${INSTALL_DIR:-/opt/odoo19e-docker}"
  local cfg="$search_dir/.deploy-config"
  if [ -f "$cfg" ]; then
    # shellcheck disable=SC1090
    . "$cfg"
  elif [ -f "/opt/odoo19e-docker/.deploy-config" ]; then
    . "/opt/odoo19e-docker/.deploy-config"
  else
    echo "[ERROR] .deploy-config not found. Run setup-odoo.sh first." >&2
    exit 1
  fi
}
_find_deploy_config

# Ensure INSTALL_DIR is set after sourcing deploy config
INSTALL_DIR="${INSTALL_DIR:-/opt/odoo19e-docker}"
STAGING_DIR="${INSTALL_DIR}/staging"
REGISTRY_FILE="${STAGING_DIR}/.registry"
STAGING_LOG="${STAGING_DIR}/.staging.log"
LOCK_FILE="/tmp/staging-manager.lock"

# ── Colors ───────────────────────────────────────────────────────────────────
_RED='\033[0;31m'
_GREEN='\033[0;32m'
_YELLOW='\033[1;33m'
_CYAN='\033[0;36m'
_BOLD='\033[1m'
_NC='\033[0m'

# ── Logging ───────────────────────────────────────────────────────────────────
_log() {
  local level="$1"; shift
  local msg="$*"
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  case "$level" in
    INFO)    echo -e "${_GREEN}[✔]${_NC} $msg" ;;
    WARN)    echo -e "${_YELLOW}[!]${_NC} $msg" ;;
    ERROR)   echo -e "${_RED}[✘]${_NC} $msg" ;;
    SUCCESS) echo -e "${_GREEN}${_BOLD}[✔]${_NC} $msg" ;;
    STEP)    echo -e "\n${_CYAN}${_BOLD}━━━ $msg ━━━${_NC}\n" ;;
  esac
  echo "[$ts] [$level] $msg" >> "$STAGING_LOG" 2>/dev/null || true
}

log_info()    { _log INFO    "$@"; }
log_warn()    { _log WARN    "$@"; }
log_error()   { _log ERROR   "$@"; }
log_success() { _log SUCCESS "$@"; }
log_step()    { _log STEP    "$@"; }

# ── Lock management ───────────────────────────────────────────────────────────
acquire_lock() {
  local retries=30
  local wait=2
  local i=0
  while [ $i -lt $retries ]; do
    if ( set -C; echo "$$" > "$LOCK_FILE" ) 2>/dev/null; then
      return 0
    fi
    local holder
    holder=$(cat "$LOCK_FILE" 2>/dev/null || echo "unknown")
    if ! kill -0 "$holder" 2>/dev/null; then
      log_warn "Stale lock found (PID $holder not running), removing..."
      rm -f "$LOCK_FILE"
      continue
    fi
    log_warn "Another staging operation is running (PID $holder), waiting ${wait}s..."
    sleep $wait
    i=$((i + 1))
  done
  log_error "Could not acquire lock after $((retries * wait))s. Aborting."
  exit 1
}

release_lock() {
  rm -f "$LOCK_FILE"
}

# ── Registry helpers (JSON array via jq) ──────────────────────────────────────
_ensure_registry() {
  mkdir -p "$STAGING_DIR/nginx"
  if [ ! -f "$REGISTRY_FILE" ]; then
    echo "[]" > "$REGISTRY_FILE"
  fi
}

registry_get_all() {
  _ensure_registry
  cat "$REGISTRY_FILE"
}

registry_get() {
  local name="$1"
  _ensure_registry
  jq -c --arg n "$name" '.[] | select(.name == $n)' "$REGISTRY_FILE"
}

registry_exists() {
  local name="$1"
  local result
  result=$(registry_get "$name")
  [ -n "$result" ]
}

registry_add() {
  # registry_add <json-object>
  local entry="$1"
  _ensure_registry
  local tmp
  tmp=$(mktemp)
  jq --argjson e "$entry" '. + [$e]' "$REGISTRY_FILE" > "$tmp" && mv "$tmp" "$REGISTRY_FILE"
}

registry_update_status() {
  local name="$1"
  local status="$2"
  _ensure_registry
  local tmp
  tmp=$(mktemp)
  jq --arg n "$name" --arg s "$status" \
    'map(if .name == $n then .status = $s else . end)' \
    "$REGISTRY_FILE" > "$tmp" && mv "$tmp" "$REGISTRY_FILE"
}

registry_delete() {
  local name="$1"
  _ensure_registry
  local tmp
  tmp=$(mktemp)
  jq --arg n "$name" '[.[] | select(.name != $n)]' "$REGISTRY_FILE" > "$tmp" && mv "$tmp" "$REGISTRY_FILE"
}

# ── Name sanitization ─────────────────────────────────────────────────────────
# Returns sanitized name on stdout; exits 1 with error message if invalid.
sanitize_name() {
  local input="$1"

  # Lowercase
  local name
  name=$(echo "$input" | tr '[:upper:]' '[:lower:]')

  # Replace spaces/underscores with hyphens
  name=$(echo "$name" | tr ' _' '-')

  # Strip anything not alphanumeric or hyphen
  name=$(echo "$name" | tr -cd 'a-z0-9-')

  # Strip leading/trailing hyphens
  name=$(echo "$name" | sed 's/^-*//;s/-*$//')

  if [ -z "$name" ]; then
    log_error "Instance name cannot be empty after sanitization (input: '$input')"
    exit 1
  fi

  if [ ${#name} -gt 20 ]; then
    log_error "Instance name too long (max 20 chars after sanitization): '$name'"
    exit 1
  fi

  # Reserved names
  case "$name" in
    prod|production|odoo|nginx|db|web|dashboard|staging)
      log_error "Reserved name: '$name'. Choose a different instance name."
      exit 1
      ;;
  esac

  echo "$name"
}

# ── Dependency check ──────────────────────────────────────────────────────────
check_dependencies() {
  local missing=()
  for cmd in docker jq openssl; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done
  # docker compose (plugin)
  if ! docker compose version &>/dev/null; then
    missing+=("docker-compose-plugin")
  fi
  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing required tools: ${missing[*]}"
    log_error "Install them and try again."
    exit 1
  fi
}

# ── Confirmation prompt ───────────────────────────────────────────────────────
confirm_prompt() {
  local message="$1"
  echo -e "${_YELLOW}${_BOLD}⚠  $message${_NC}"
  read -r -p "Type 'yes' to confirm: " answer
  if [ "$answer" != "yes" ]; then
    log_info "Aborted."
    exit 0
  fi
}
