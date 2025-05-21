#!/bin/bash

REQUIRED_CMDS=("at" "curl" "ffmpeg" "jq")
MISSING=()

echo "🔍 Checking system dependencies..."

for cmd in "${REQUIRED_CMDS[@]}"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "❌ $cmd is not installed."
        MISSING+=("$cmd")
    else
        echo "✅ $cmd is installed."
    fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
    echo -e "\n🚨 Missing dependencies:"
    for cmd in "${MISSING[@]}"; do
        echo "  - $cmd"
    done
    exit 1
else
    echo -e "\n🎉 All required system tools are installed."
    exit 0
fi
