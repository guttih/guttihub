#!/usr/bin/env bash
set -e

# Resolve repo root based on script location
APP_NAME="guttihub"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_SERVER="guttih@guttih.com"
DEPLOY_DIR="/var/www/guttihub"
DEPLOY_TARGET="$DEPLOY_SERVER:$DEPLOY_DIR"

#Function: verify_and_copy_env_file()
#
#Brief: Verifies the existence of the .env.local file and checks for required variables.
#        If the file is missing or variables are not set, it exits with an error.
#        If everything is fine, it copies the .env.local file to .env.production.
#
verify_and_copy_env_file() {
    source_env="$REPO_ROOT/.env.local"
    target_env="$REPO_ROOT/.env.production"

    echo "🔍 Verifying environment file: $source_env"

    if [ ! -f "$source_env" ]; then
        echo "❌ $source_env not found! Please create it before deploying."
        exit 1
    fi

    # Extract GOOGLE_* values and write new .env.production
    {
        grep "^GOOGLE_CLIENT_ID=" "$source_env"
        grep "^GOOGLE_CLIENT_SECRET=" "$source_env"
        echo "NEXTAUTH_URL=https://tv.guttih.com"
        echo "NEXTAUTH_SECRET=$(grep '^NEXTAUTH_SECRET=' "$source_env" | cut -d '=' -f2)"
        echo "BASE_URL=https://tv.guttih.com"
        echo "PORT=6301"
    } >"$target_env"

    local required_vars=("GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$source_env"; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "❌ $source_env is missing required variables:"
        for var in "${missing_vars[@]}"; do
            echo "   - $var"
        done
        exit 1
    fi

    # Append PORT if not already present
    if ! grep -q "^PORT=" "$target_env"; then
        echo -e "\nPORT=6301" >>"$target_env"
        echo "➕ Added PORT=6301 to .env.production"
    fi

    echo "📄 created .env.production ready for server"
    echo "➕ Added PORT=6301 and redirection url to .env.production"
}

# Function: setup_system_dependencies_on_server()
#
# Brief: Ensures required system tools (ffmpeg, curl, at, jq) are installed on the deployment server.
#        If any are missing, it performs an apt update and installs the missing ones.
#        Also ensures the 'atd' service is enabled and running.
#
# Parameters:
#   $1: The server to connect to (e.g., user@server)
#
# Usage: setup_system_dependencies_on_server <server>
# Example: setup_system_dependencies_on_server "user@server"
#
# Note: This is intended to be run prior to app deployment/restart, especially on a fresh server.
setup_system_dependencies_on_server() {
    local DEPLOY_SERVER="$1"

    echo "🔍 Ensuring system dependencies (ffmpeg, curl, at, jq) are installed on $DEPLOY_SERVER..."

    ssh -o LogLevel=ERROR "$DEPLOY_SERVER" /bin/bash <<'EOF'
set -e
missing=0
for bin in ffmpeg curl at jq; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "❌ Missing: $bin"
    missing=1
  fi
done

if [ $missing -eq 1 ]; then
  echo "📦 Installing missing dependencies..."
  sudo apt update -y
  sudo apt install -y ffmpeg curl at jq
  sudo systemctl enable --now atd
  echo "✅ System dependencies installed and atd running."
else
  echo "✅ All required system dependencies already present."
fi
exit 0
EOF
}

# Function: restart_pm2_app_on_server()
#
# Brief: Restarts the PM2 app on the specified server.
#        If the app is not running, it starts it.
#        It also installs production dependencies.
#
# Parameters:
#   $1: The server to connect to (e.g., user@server)
#   $2: The name of the PM2 app to restart
#
# Usage: restart_pm2_app_on_server <server> <app_name>
# Example: restart_pm2_app_on_server "user@server" "my_app"
# Note: This function assumes that PM2 is already installed and configured on the server.
# We had to use `npm ci --omit=dev --legacy-peer-deps` instead of `npm install --omit=dev` because of the /react-hls-player dependency.
restart_pm2_app_on_server() {
    local DEPLOY_SERVER="$1"
    local APP_NAME="$2"

    echo "♻️ Restarting PM2 app '$APP_NAME' on $DEPLOY_SERVER..."

    ssh "$DEPLOY_SERVER" <<EOF
    source ~/.nvm/nvm.sh
    cd "$DEPLOY_DIR"
    echo "📦 Installing production deps..."
    npm install --omit=dev

    # npm ci --omit=dev --legacy-peer-deps

    echo "🔁 Reloading app with PM2..."
    pm2 reload ecosystem.config.js --env production || \
    pm2 start ecosystem.config.js --env production

    pm2 save

    echo "🧪 PM2 process list:"
    pm2 list

EOF
}

####### Script Start #######

verify_and_copy_env_file

if [[ -z "$DEPLOY_TARGET" ]]; then
    echo "❌ DEPLOY_TARGET is not set. Aborting to avoid unsafe operations."
    exit 1
fi

echo "📁 Using repo root    : $REPO_ROOT"
echo "📦 Using deploy server: $DEPLOY_SERVER"
cd "$REPO_ROOT"

# Define source and target paths
ASSET_PATH="$REPO_ROOT/scripts/deployAssets/services.json"
TARGET_PATH="$REPO_ROOT/src/config/services.json"

echo "📁 Using asset path   : $ASSET_PATH "
echo "📁 Using target path  : $TARGET_PATH"

# Check if services.json exists
if [ ! -f "$ASSET_PATH" ]; then
    echo "❌ Error: Missing $ASSET_PATH"
    echo "Please create it using the following format:"
    cat <<EOF
{
  "services": [
    {
      "id": "demo-service",
      "name": "Example IPTV",
      "server": "http://example.com",
      "refreshUrl": "http://example.com/get.php?username=USERNAME&password=PASSWORD&type=m3u_plus&output=ts",
      "viewingBaseUrl": "http://example.com/USERNAME/PASSWORD",
      "username": "USERNAME",
      "password": "PASSWORD",
      "contentCategories": ["movies", "series", ""]
    }
  ]
}
EOF
    exit 1
fi

# Copy the file into place
cp "$ASSET_PATH" "$TARGET_PATH"
echo "📄 Copied services.json into src/config/"

# skip if skip-build is passed
if [[ "$1" == "--skip-build" ]]; then
    echo "⚠️ Skipping build step as --skip-build was passed."
else
    # Build the production app
    echo "🏗 Building production app..."
    cd "$REPO_ROOT"
    npm run build
    ssh "$DEPLOY_SERVER" "rm -rf $DEPLOY_DIR/.next $DEPLOY_DIR/src $DEPLOY_DIR/node_modules"
fi

echo "REPO_ROOT: $REPO_ROOT"
echo "DEPLOY_TARGET: $DEPLOY_TARGET"

# Create folder (in case it doesn't exist)
ssh "$DEPLOY_SERVER" "mkdir -p $DEPLOY_DIR"

# Upload files using scp

#with subdirs
scp -r \
    "$REPO_ROOT/.next" \
    "$REPO_ROOT/package.json" \
    "$REPO_ROOT/next.config.ts" \
    "$REPO_ROOT/src" \
    "$REPO_ROOT/ecosystem.config.js" \
    "$REPO_ROOT/tailwind.config.js" \
    "$DEPLOY_TARGET/"

# Copy the .env.production file to the server
scp "$REPO_ROOT/.env.production" "$DEPLOY_TARGET"

ssh "$DEPLOY_SERVER" "mkdir -p $DEPLOY_DIR/public/icons"

# Copy only top-level files from public/ (not subdirs like public/cache)
find "$REPO_ROOT/public" -maxdepth 1 -type f -exec scp {} "$DEPLOY_TARGET/public/" \;
# Copy only public/icons contents (not other subdirs)
scp "$REPO_ROOT/public/icons/"* "$DEPLOY_TARGET/public/icons/"

# install npm if not installed without dev
echo "🎉 Updated version has been copied to deployment dir"

# 🛠️ Ensures required system tools (ffmpeg, curl, at, jq) are installed
setup_system_dependencies_on_server "$DEPLOY_SERVER"

# 🔁 Restart the PM2 app on the server
echo "🔁 Restarting PM2 app on server..."
restart_pm2_app_on_server "$DEPLOY_SERVER" "$APP_NAME"

echo -e "\n✅ Deployment complete. App '$APP_NAME' should now be running."
