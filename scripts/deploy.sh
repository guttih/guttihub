#!/usr/bin/env bash
set -e

# Resolve repo root based on script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_SERVER="guttih@guttih.com"
DEPLOY_DIR="/var/www/guttihub"
DEPLOY_TARGET="$DEPLOY_SERVER:$DEPLOY_DIR"

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
# cp "$ASSET_PATH" "$TARGET_PATH"
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

# Copy only top-level files from public/ (not subdirs like public/cache)
find "$REPO_ROOT/public" -maxdepth 1 -type f -exec scp {} "$DEPLOY_TARGET/public/" \;

# install npm if not installed without dev
echo "🎉 Updated version hase been copied to deployment dir"

echo "If build and copy are successful, and starting the server fails,"
echo " please try running running the following commands manually"
echo " ssh $DEPLOY_SERVER"
echo " cd $DEPLOY_DIR && npm install --omit=dev && PORT=6301 npm run start"


# ✅ Done
