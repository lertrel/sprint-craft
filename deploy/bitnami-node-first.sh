#!/usr/bin/env bash
set -euo pipefail

ORG="${ORG:-YOUR_ORG}"
BRANCH="${BRANCH:-main}"
DOMAIN="${DOMAIN:-example.com}"
BUILD_HEAP_MB="${BUILD_HEAP_MB:-1536}"

if [ "$ORG" = "YOUR_ORG" ]; then
  echo "Set ORG to your GitHub org/user, e.g. ORG=my-org"
  exit 1
fi

REPO_URL="https://github.com/${ORG}/sprint-craft.git"
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

echo ">>> Installing OS dependencies"
$SUDO apt-get update -y
$SUDO apt-get install -y git

echo ">>> Cloning repository"
cd /home/bitnami
if [ -d "$APP_DIR" ]; then
  echo "Directory already exists: $APP_DIR"
  exit 1
fi

git clone "$REPO_URL" sprint-craft
cd "$APP_DIR"
git checkout "$BRANCH"

echo ">>> Installing npm dependencies"
"$NPM_BIN" install

echo ">>> Building client"
NODE_OPTIONS="--max_old_space_size=${BUILD_HEAP_MB}" "$NPM_BIN" run build

echo ">>> Building server"
"$NPM_BIN" run build:server

echo ">>> Writing systemd unit"
SERVICE_FILE="/etc/systemd/system/sprint-craft.service"
$SUDO tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Sprint Craft Server
After=network.target

[Service]
Type=simple
User=bitnami
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=2567
Environment=HOST=0.0.0.0
ExecStart=${NODE_BIN} ${APP_DIR}/server/dist/server/src/main.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

$SUDO systemctl daemon-reload
$SUDO systemctl enable sprint-craft
$SUDO systemctl restart sprint-craft

echo ">>> Configuring Apache vhost"
APACHE_BASE=""
if [ -d /opt/bitnami/apache2 ]; then
  APACHE_BASE="/opt/bitnami/apache2"
elif [ -d /opt/bitnami/apache ]; then
  APACHE_BASE="/opt/bitnami/apache"
else
  echo "Apache not found under /opt/bitnami."
  exit 1
fi

APACHE_CONF="${APACHE_BASE}/conf/httpd.conf"
VHOST_DIR="${APACHE_BASE}/conf/vhosts"
VHOST_FILE="${VHOST_DIR}/sprint-craft.conf"

$SUDO mkdir -p "$VHOST_DIR"

enable_module() {
  local module_name="$1"
  local module_path="$2"

  if grep -qE "^\s*LoadModule ${module_name}\b" "$APACHE_CONF"; then
    $SUDO sed -i "s/^#\s*LoadModule ${module_name}\b/LoadModule ${module_name}/" "$APACHE_CONF"
  else
    echo "LoadModule ${module_name} ${module_path}" | $SUDO tee -a "$APACHE_CONF" > /dev/null
  fi
}

enable_module proxy_module modules/mod_proxy.so
enable_module proxy_http_module modules/mod_proxy_http.so
enable_module proxy_wstunnel_module modules/mod_proxy_wstunnel.so
enable_module rewrite_module modules/mod_rewrite.so
enable_module ssl_module modules/mod_ssl.so

if ! grep -q 'conf/vhosts/\*.conf' "$APACHE_CONF"; then
  echo 'Include "conf/vhosts/*.conf"' | $SUDO tee -a "$APACHE_CONF" > /dev/null
fi

$SUDO tee "$VHOST_FILE" > /dev/null <<EOF
<VirtualHost *:80>
  ServerName ${DOMAIN}

  DocumentRoot "${APP_DIR}/dist"
  <Directory "${APP_DIR}/dist">
    Require all granted
  </Directory>

  ProxyPreserveHost On
  ProxyRequests Off

  ProxyPass        /matchmake/  http://127.0.0.1:2567/matchmake/
  ProxyPassReverse /matchmake/  http://127.0.0.1:2567/matchmake/

  RewriteEngine On
  RewriteCond %{HTTP:Upgrade} =websocket [NC]
  RewriteRule /(.*) ws://127.0.0.1:2567/\$1 [P,L]
</VirtualHost>
EOF

$SUDO /opt/bitnami/ctlscript.sh restart apache

echo ">>> Done"
echo "Next steps:"
echo "- Point DNS to this instance"
echo "- Run: sudo /opt/bitnami/bncert-tool  (to enable HTTPS/WSS)"
