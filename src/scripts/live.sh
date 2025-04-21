#!/bin/bash

# live.sh - simplified HLS stream for live usage
# No packaging, no format switch, just raw HLS with auto-cleanup

# --- Parse named arguments ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --url)        STREAM_URL="$2"; shift 2 ;;
        --user)       USER="$2"; shift 2 ;;
        --outputFile) OUTPUT_FILE="$2"; shift 2 ;;
        --loglevel)   LOGLEVEL="$2"; shift 2 ;;
        *) echo "Unknown parameter: $1" >&2; exit 1 ;;
    esac
done

# --- Validate required values ---
[[ -z "$STREAM_URL" ]] && echo "Missing stream URL" >&2 && exit 1
[[ -z "$USER" ]] && echo "Missing user name" >&2 && exit 1
[[ -z "$OUTPUT_FILE" ]] && echo "Missing output file name" >&2 && exit 1
LOGLEVEL="${LOGLEVEL:-error}"

HLS_PLAYLIST="${OUTPUT_FILE}.m3u8"
HLS_DIR="${OUTPUT_FILE}_hls"
LOG_FILE="${OUTPUT_FILE}.log"
STATUS_FILE="${OUTPUT_FILE}.status"

mkdir -p "$HLS_DIR"

STARTED_AT=$(date -Iseconds)

echo "STATUS=live" > "$STATUS_FILE"
echo "STARTED_AT=$STARTED_AT" >> "$STATUS_FILE"
echo "STREAM=$STREAM_URL" >> "$STATUS_FILE"
echo "USER=$USER" >> "$STATUS_FILE"
echo "OUTPUT_FILE=$OUTPUT_FILE" >> "$STATUS_FILE"
echo "HLS_PLAYLIST=$HLS_PLAYLIST" >> "$STATUS_FILE"
echo "LOG_FILE=$LOG_FILE" >> "$STATUS_FILE"

cleanup_and_exit() {
    echo "Stopping live stream at $(date -Iseconds)" >> "$LOG_FILE"
    echo "STATUS=stopped" >> "$STATUS_FILE"
    rm -rf "$HLS_PLAYLIST" "$HLS_DIR"
    exit 0
}
trap cleanup_and_exit SIGINT SIGTERM

ffmpeg -loglevel "$LOGLEVEL" \
    -i "$STREAM_URL" \
    -c:v libx264 -preset ultrafast -g 25 -sc_threshold 0 \
    -c:a aac -b:a 128k -ac 2 -ar 44100 \
    -f hls \
    -hls_time 4 \
    -hls_list_size 6 \
    -hls_flags delete_segments+append_list \
    -hls_segment_filename "${HLS_DIR}/segment_%03d.ts" \
    -hls_base_url "$(basename "$HLS_DIR")/" \
    "$HLS_PLAYLIST" >> "$LOG_FILE" 2>&1 &
PID=$!

echo "PID=$PID" >> "$STATUS_FILE"
echo "Live HLS stream started, PID=$PID" >> "$LOG_FILE"

wait $PID
