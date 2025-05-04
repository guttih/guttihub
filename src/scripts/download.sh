#!/bin/bash

# 📅 Download Script
# Download files reliably with status tracking and clean stop support.

set -euo pipefail

# --- Default ---
LOGLEVEL="error"

# --- Argument Parsing ---
while [[ $# -gt 0 ]]; do
    case "$1" in
    --baseUrl)
        BASE_URL="$2"
        shift 2
        ;;
    --cacheKey)
        CACHE_KEY="$2"
        shift 2
        ;;
    --url)
        URL="$2"
        shift 2
        ;;
    --outputFile)
        OUTPUT_FILE="$2"
        shift 2
        ;;
    --user)
        USER="$2"
        shift 2
        ;;
    --loglevel)
        LOGLEVEL="$2"
        shift 2
        ;;
    *)
        echo "❌ Unknown parameter $1" >&2
        exit 1
        ;;
    esac
done

# --- Validation ---
[[ -z "${BASE_URL:-}" ]] && echo "❌ Missing --baseUrl" >&2 && exit 1
[[ -z "${CACHE_KEY:-}" ]] && echo "❌ Missing --cacheKey" >&2 && exit 1
[[ -z "${URL:-}" ]] && echo "❌ Missing --url" >&2 && exit 1
[[ -z "${OUTPUT_FILE:-}" ]] && echo "❌ Missing --outputFile" >&2 && exit 1
[[ -z "${USER:-}" ]] && echo "❌ Missing --user" >&2 && exit 1

sanitize_path_param() {
    local val="$1"
    val="${val#\"}"
    val="${val%\"}"
    echo "$(realpath "$val")"
}

strip_surrounding_quotes() {
    local val="$1"
    val="${val#\"}"
    val="${val%\"}"
    echo "$val"
}

USER="$(strip_surrounding_quotes "$USER")"
OUTPUT_FILE="$(sanitize_path_param "$OUTPUT_FILE")"

# --- Paths ---
TMP_OUTPUT_FILE="${OUTPUT_FILE}.part"
LOG_FILE="${OUTPUT_FILE}.log"
STATUS_FILE="${OUTPUT_FILE}.status"

# --- Timestamps ---
STARTED_AT=$(date -Iseconds)

# --- Initial Status ---
cat >"$STATUS_FILE" <<EOF
STATUS=downloading
STARTED_AT=$STARTED_AT
URL=$URL
OUTPUT_FILE=$OUTPUT_FILE
USER=$USER
LOG_FILE=$LOG_FILE
EOF

# --- Fetch content length safely ---
get_content_length() {
    local target_url="$1"
    curl --max-time 2 --connect-timeout 5 -L -s -D - -o /dev/null -A "Mozilla/5.0" "$target_url" |
        awk '/Content-Length/ { print $2 }' | tr -d '\r'
}

{
    echo "Fetching content length from $URL..." >>"$LOG_FILE"
    CONTENT_LENGTH=$(get_content_length "$URL")
    CONTENT_LENGTH=${CONTENT_LENGTH:-0}

    echo "CONTENT_LENGTH=$CONTENT_LENGTH" >>"$STATUS_FILE"
    echo "Content length is $CONTENT_LENGTH bytes" >>"$LOG_FILE"

    if [ "$CONTENT_LENGTH" -eq 0 ]; then
        echo "⚠️ Warning: Content length is zero — CDN may have delayed response." >>"$LOG_FILE"
    fi
} || {
    echo "❌ Failed to fetch content length — continuing anyway" >>"$LOG_FILE"
}

send_cleanup_report() {
    if [[ -n "${BASE_URL:-}" ]]; then
        if ! curl -s --fail -X POST "$BASE_URL/api/job/has-ended/$CACHE_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"cacheKey\":\"$CACHE_KEY\"}"; then
            echo "Cleanup POST failed for $CACHE_KEY" >>"$LOG_FILE"
        fi
    fi
}

# --- Cleanup Logic ---
cleanup() {
    ACTUAL_STOP=$(date -Iseconds)
    echo "ACTUAL_STOP=$ACTUAL_STOP" >>"$STATUS_FILE"

    if [[ -f "$TMP_OUTPUT_FILE" ]]; then
        echo "Removing incomplete temp file..." >>"$LOG_FILE"
        rm -f "$TMP_OUTPUT_FILE"
    fi

    echo "STATUS=error" >>"$STATUS_FILE"
    echo "Download interrupted or failed." >>"$LOG_FILE"
    send_cleanup_report
}

trap cleanup SIGINT SIGTERM

# --- Start Download ---
echo "Starting download from $URL..." >>"$LOG_FILE"

# spawn curl into background
(
    curl --fail --location --progress-bar "$URL" --output "$TMP_OUTPUT_FILE"
) >>"$LOG_FILE" 2>&1 &

PID=$!
echo "PID=$PID" >>"$STATUS_FILE"
echo "Curl PID $PID started at $STARTED_AT" >>"$LOG_FILE"

# --- Wait for download ---
wait $PID
EXIT_CODE=$?

ACTUAL_STOP=$(date -Iseconds)
echo "ACTUAL_STOP=$ACTUAL_STOP" >>"$STATUS_FILE"

# --- Handle Exit ---
if [[ $EXIT_CODE -eq 0 ]]; then
    # Successful download
    mv "$TMP_OUTPUT_FILE" "$OUTPUT_FILE"
    echo "STATUS=done" >>"$STATUS_FILE"
    echo "Download completed successfully." >>"$LOG_FILE"
else
    # Error occurred
    echo "STATUS=error" >>"$STATUS_FILE"
    echo "Download failed with exit code $EXIT_CODE." >>"$LOG_FILE"
    [[ -f "$TMP_OUTPUT_FILE" ]] && rm -f "$TMP_OUTPUT_FILE"
    send_cleanup_report
    exit $EXIT_CODE
fi

send_cleanup_report
exit 0
