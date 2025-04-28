#!/bin/bash

# 📥 Download Script
# Download files reliably with status tracking and clean stop support.

set -euo pipefail

# --- Default ---
LOGLEVEL="error"

# --- Argument Parsing ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --url) URL="$2"; shift 2 ;;
        --outputFile) OUTPUT_FILE="$2"; shift 2 ;;
        --user) USER="$2"; shift 2 ;;
        --loglevel) LOGLEVEL="$2"; shift 2 ;;
        *) echo "❌ Unknown parameter $1" >&2; exit 1 ;;
    esac
done

# --- Validation ---
[[ -z "${URL:-}" ]] && echo "❌ Missing --url" >&2 && exit 1
[[ -z "${OUTPUT_FILE:-}" ]] && echo "❌ Missing --outputFile" >&2 && exit 1
[[ -z "${USER:-}" ]] && echo "❌ Missing --user" >&2 && exit 1

# --- Paths ---
OUTPUT_FILE="$(realpath "$OUTPUT_FILE")"
TMP_OUTPUT_FILE="${OUTPUT_FILE}.part"
LOG_FILE="${OUTPUT_FILE}.log"
STATUS_FILE="${OUTPUT_FILE}.status"

# --- Timestamps ---
STARTED_AT=$(date -Iseconds)

# --- Initial Status ---
cat > "$STATUS_FILE" <<EOF
STATUS=downloading
STARTED_AT=$STARTED_AT
URL=$URL
OUTPUT_FILE=$OUTPUT_FILE
USER=$USER
LOG_FILE=$LOG_FILE
EOF

# --- Cleanup Logic ---
cleanup() {
    ACTUAL_STOP=$(date -Iseconds)
    echo "ACTUAL_STOP=$ACTUAL_STOP" >> "$STATUS_FILE"

    if [[ -f "$TMP_OUTPUT_FILE" ]]; then
        echo "Removing incomplete temp file..." >> "$LOG_FILE"
        rm -f "$TMP_OUTPUT_FILE"
    fi

    echo "STATUS=error" >> "$STATUS_FILE"
    echo "Download interrupted or failed." >> "$LOG_FILE"
}

trap cleanup SIGINT SIGTERM

# --- Start Download ---
echo "Starting download from $URL..." >> "$LOG_FILE"

# spawn curl into background
(
    curl --fail --location --progress-bar "$URL" --output "$TMP_OUTPUT_FILE"
) >> "$LOG_FILE" 2>&1 &
PID=$!

echo "PID=$PID" >> "$STATUS_FILE"
echo "Curl PID $PID started at $STARTED_AT" >> "$LOG_FILE"

# --- Wait for download ---
wait $PID
EXIT_CODE=$?

ACTUAL_STOP=$(date -Iseconds)
echo "ACTUAL_STOP=$ACTUAL_STOP" >> "$STATUS_FILE"

# --- Handle Exit ---
if [[ $EXIT_CODE -eq 0 ]]; then
    # Successful download
    mv "$TMP_OUTPUT_FILE" "$OUTPUT_FILE"
    echo "STATUS=done" >> "$STATUS_FILE"
    echo "Download completed successfully." >> "$LOG_FILE"
else
    # Error occurred
    echo "STATUS=error" >> "$STATUS_FILE"
    echo "Download failed with exit code $EXIT_CODE." >> "$LOG_FILE"
    [[ -f "$TMP_OUTPUT_FILE" ]] && rm -f "$TMP_OUTPUT_FILE"
    exit $EXIT_CODE
fi

exit 0
