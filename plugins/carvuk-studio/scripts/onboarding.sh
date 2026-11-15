#!/usr/bin/env bash
# Prepara una Mac para Carvuk Studio sin permisos de administrador.
# Instala Node 22 y pnpm dentro de ~/.carvuk-studio y escribe env.sh para usarlos.
set -euo pipefail

STUDIO_HOME="${CARVUK_STUDIO_HOME:-$HOME/.carvuk-studio}"
NODE_MAJOR="22"
PNPM_VERSION="9.15.2"
NODE_DIST="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x"
MIN_FREE_GB=5
DOWNLOAD_DIR=""

cleanup() { [[ -n "$DOWNLOAD_DIR" ]] && rm -rf "$DOWNLOAD_DIR"; return 0; }
trap cleanup EXIT

step() { printf 'STEP %s\n' "$1"; }
ok() { printf 'OK %s\n' "$1"; }
warn() { printf 'WARN %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1"; exit "${2:-1}"; }

detect_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"
  case "$os" in
    Darwin) os="darwin" ;;
    Linux) os="linux" ;;
    *) fail "Sistema no soportado: $os. Carvuk Studio funciona en Mac." ;;
  esac
  case "$arch" in
    arm64 | aarch64) arch="arm64" ;;
    x86_64) arch="x64" ;;
    *) fail "Procesador no soportado: $arch." ;;
  esac
  printf '%s-%s' "$os" "$arch"
}

check_git() {
  step "git"
  if [[ "$(uname -s)" == "Darwin" ]] && ! xcode-select -p >/dev/null 2>&1; then
    xcode-select --install >/dev/null 2>&1 || true
    fail "Se abrió la instalación de las herramientas de desarrollo de Apple. Acéptala, espera que termine y vuelve a correr el onboarding." 2
  fi
  command -v git >/dev/null 2>&1 || fail "No encontré git."
  ok "$(git --version)"
}

check_disk() {
  step "espacio"
  local free_gb
  free_gb="$(df -Pk "$HOME" | awk 'NR==2 { printf "%d", $4 / 1048576 }')"
  if (( free_gb < MIN_FREE_GB )); then
    warn "Quedan ${free_gb} GB libres; se recomiendan ${MIN_FREE_GB} GB."
  else
    ok "${free_gb} GB libres"
  fi
}

installed_node_version() {
  local node_bin="$STUDIO_HOME/node/bin/node"
  [[ -x "$node_bin" ]] && "$node_bin" --version || true
}

install_node() {
  step "node"
  local current platform shasums tarball expected actual
  current="$(installed_node_version)"
  if [[ "$current" == v${NODE_MAJOR}.* ]]; then
    ok "node $current"
    return
  fi
  platform="$(detect_platform)"
  DOWNLOAD_DIR="$(mktemp -d)"
  shasums="$(curl -fsSL "$NODE_DIST/SHASUMS256.txt")" || fail "No pude descargar la lista de versiones de Node."
  tarball="$(printf '%s\n' "$shasums" | awk -v p="$platform" '$2 ~ "^node-v[0-9.]+-" p "\\.tar\\.gz$" { print $2; exit }')"
  expected="$(printf '%s\n' "$shasums" | awk -v f="$tarball" '$2 == f { print $1 }')"
  [[ -n "$tarball" && -n "$expected" ]] || fail "No encontré Node ${NODE_MAJOR} para $platform."
  curl -fsSL "$NODE_DIST/$tarball" -o "$DOWNLOAD_DIR/$tarball" || fail "No pude descargar $tarball."
  if command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$DOWNLOAD_DIR/$tarball" | awk '{ print $1 }')"
  else
    actual="$(sha256sum "$DOWNLOAD_DIR/$tarball" | awk '{ print $1 }')"
  fi
  [[ "$actual" == "$expected" ]] || fail "La descarga de Node no coincide con su checksum."
  rm -rf "$STUDIO_HOME/node"
  mkdir -p "$STUDIO_HOME/node"
  tar -xzf "$DOWNLOAD_DIR/$tarball" -C "$STUDIO_HOME/node" --strip-components=1
  ok "node $(installed_node_version)"
}

install_pnpm() {
  step "pnpm"
  mkdir -p "$STUDIO_HOME/bin"
  export PATH="$STUDIO_HOME/bin:$STUDIO_HOME/node/bin:$PATH"
  export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
  corepack enable --install-directory "$STUDIO_HOME/bin" pnpm
  corepack prepare "pnpm@${PNPM_VERSION}" --activate >/dev/null
  ok "pnpm $(pnpm --version)"
}

write_env() {
  step "env"
  cat >"$STUDIO_HOME/env.sh" <<EOF
export PATH="$STUDIO_HOME/bin:$STUDIO_HOME/node/bin:\$PATH"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export NEXT_TELEMETRY_DISABLED=1
EOF
  ok "$STUDIO_HOME/env.sh"
}

check_browser() {
  step "chrome"
  if [[ -d "/Applications/Google Chrome.app" ]]; then
    ok "Google Chrome"
  else
    warn "No encontré Google Chrome. Hace falta para sacar pantallazos de los prototipos."
  fi
}

main() {
  mkdir -p "$STUDIO_HOME"
  chmod 700 "$STUDIO_HOME"
  check_git
  check_disk
  install_node
  install_pnpm
  write_env
  check_browser
  printf 'DONE herramientas listas\n'
}

main "$@"
