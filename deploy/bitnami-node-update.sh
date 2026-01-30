#!/usr/bin/env bash
set -euo pipefail

BRANCH="${BRANCH:-main}"
BUILD_HEAP_MB="${BUILD_HEAP_MB:-1536}"
APP_DIR="/home/bitnami/sprint-craft"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

NODE_BIN=""
if [ -x /opt/bitnami/node/bin/node ]; then
  NODE_BIN="/opt/bitnami/node/bin/node"
elif [ -x /opt/bitnami/nodejs/bin/node ]; then
  NODE_BIN="/opt/bitnami/nodejs/bin/node"
else
  NODE_BIN="$(command -v node || true)"
fi

NPM_BIN=""
if [ -x /opt/bitnami/node/bin/npm ]; then
  NPM_BIN="/opt/bitnami/node/bin/npm"
elif [ -x /opt/bitnami/nodejs/bin/npm ]; then
  NPM_BIN="/opt/bitnami/nodejs/bin/npm"
else
  NPM_BIN="$(command -v npm || true)"
fi

if [ -z "$NODE_BIN" ] || [ -z "$NPM_BIN" ]; then
  echo "Node.js not found. Ensure Bitnami Node.js stack is installed."
  exit 1
fi

if [ ! -d "$APP_DIR" ]; then
  echo "Missing app directory: $APP_DIR"
  exit 1
fi

echo ">>> Stopping services"
$SUDO systemctl stop sprint-craft || true
$SUDO /opt/bitnami/ctlscript.sh stop apache || true

echo ">>> Updating source code"
cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo ">>> Installing npm dependencies"
"$NPM_BIN" install

echo ">>> Building client"
NODE_OPTIONS="--max_old_space_size=${BUILD_HEAP_MB}" "$NPM_BIN" run build

echo ">>> Building server"
"$NPM_BIN" run build:server

echo ">>> Restarting services"
$SUDO systemctl daemon-reload
$SUDO systemctl restart sprint-craft
$SUDO /opt/bitnami/ctlscript.sh restart apache

$SUDO systemctl status sprint-craft --no-pager || true
