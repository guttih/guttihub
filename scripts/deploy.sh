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
  local source_env="$REPO_ROOT/.env.local"
  local target_env="$REPO_ROOT/.env.production"

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
  echo "PORT=6301"
} > "$target_env"

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
    echo -e "\nPORT=6301" >> "$target_env"
    echo "➕ Added PORT=6301 to .env.production"
fi

echo "📄 created .env.production ready for server"
echo "➕ Added PORT=6301 and redirection url to .env.production"
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
restart_pm2_app_on_server() {
  local DEPLOY_SERVER="$1"
  local APP_NAME="$2"

  echo "♻️ Restarting PM2 app '$APP_NAME' on $DEPLOY_SERVER..."

  ssh "$DEPLOY_SERVER" <<EOF
    source ~/.nvm/nvm.sh
    cd "$DEPLOY_DIR"

    echo "📦 Installing production deps..."
    npm install --omit=dev

    echo "🔁 Reloading app with PM2..."
    PORT=6301 NODE_ENV=production pm2 reload "$APP_NAME" || \
    PORT=6301 NODE_ENV=production pm2 start npm --name "$APP_NAME" -- run start

    pm2 save
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

echo "📁 Using asset path : $ASSET_PATH "
echo "📁 Using target path: $TARGET_PATH"

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
fi

echo "REPO_ROOT: $REPO_ROOT"
echo "DEPLOY_TARGET: $DEPLOY_TARGET"



# Create folder (in case it doesn't exist)
ssh guttih@guttih.com "mkdir -p $DEPLOY_TARGET"

# Upload files using scp

#with subdirs
scp -r \
  "$REPO_ROOT/.next" \
  "$REPO_ROOT/package.json" \
  "$REPO_ROOT/next.config.ts" \
  "$REPO_ROOT/src" \
  "$DEPLOY_TARGET"

# Copy the .env.production file to the server
scp "$REPO_ROOT/.env.production" "$DEPLOY_TARGET"

# Copy only top-level files from public/ (not subdirs like public/cache)
find "$REPO_ROOT/public" -maxdepth 1 -type f -exec scp {} "$DEPLOY_TARGET/public/" \;

# install npm if not installed without dev
echo "🎉 Updated version hase been copied to deployment dir"

# Restart the PM2 app on the server
echo "🔁 Restarting PM2 app on server..."
restart_pm2_app_on_server "$DEPLOY_SERVER" "$APP_NAME"
# ✅ Done
