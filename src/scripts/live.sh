#!/bin/bash

# --- Parse named arguments ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --baseUrl) BASE_URL="$2"; shift 2 ;;
        --cacheKey) CACHE_KEY="$2"; shift 2 ;;
        --url) STREAM_URL="$2"; shift 2 ;;
        --user) USER="$2"; shift 2 ;;
        --outputFile) OUTPUT_FILE="$2"; shift 2 ;;
        --loglevel) LOGLEVEL="$2"; shift 2 ;;
        *) echo "Unknown parameter: $1" >&2; exit 1 ;;
    esac
done

# --- Validate required values ---
[[ -z "${BASE_URL:-}" ]] && echo "❌ Missing --url" >&2 && exit 1
[[ -z "${CACHE_KEY:-}" ]] && echo "❌ Missing --url" >&2 && exit 1
[[ -z "${STREAM_URL}" ]] && echo "Missing --url" >&2 && exit 1
[[ -z "${STREAM_URL}" ]] && echo "Missing stream URL" >&2 && exit 1
[[ -z "${USER}" ]] && echo "Missing user name" >&2 && exit 1
[[ -z "${OUTPUT_FILE}" ]] && echo "Missing output file name" >&2 && exit 1
LOGLEVEL="${LOGLEVEL:-error}"

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

send_cleanup_report() {
  if [[ -n "${BASE_URL:-}" ]]; then
    echo -n "Sending cleanup report to $BASE_URL/api/job/has-ended/$CACHE_KEY"
    if curl -s --fail -X POST "$BASE_URL/api/job/has-ended/$CACHE_KEY" \
         -H "Content-Type: application/json" \
         -d "{\"cacheKey\":\"$CACHE_KEY\"}"; then
      echo " ✅ OK"
    else
      echo " ❌ FAIL (exit $?)"
    fi
  fi
}

# --- Cleanup logic ---
cleanup() {
    ACTUAL_STOP=$(date -Iseconds)
    echo "Stopping live stream at $ACTUAL_STOP" >> "$LOG_FILE"
    echo "ACTUAL_STOP=$ACTUAL_STOP" >> "$STATUS_FILE"
    echo "STATUS=stopped" >> "$STATUS_FILE"

    [[ -f "$HLS_PLAYLIST" ]] && rm "$HLS_PLAYLIST"
    [[ -d "$HLS_DIR" ]] && rm -rf "$HLS_DIR"

    send_cleanup_report
}

trap cleanup SIGINT SIGTERM

# --- Start FFmpeg ---
ffmpeg -loglevel info \
    -i "$STREAM_URL" \
    -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 10 \
    -user_agent "Mozilla/5.0" \
    -c:v libx264 -preset veryfast -g 25 -sc_threshold 0 -tune zerolatency \
    -c:a aac -b:a 128k -ac 2 -ar 44100 \
    -f hls \
    -hls_time 4 \
    -hls_list_size 5 \
    -hls_flags delete_segments+append_list+omit_endlist+program_date_time \
    -method PUT \
    -hls_segment_filename "${HLS_DIR}/segment_%03d.ts" \
    "$HLS_PLAYLIST" 2>&1 &
PID=$!

echo "PID=$PID" >> "$STATUS_FILE"
echo "FFmpeg PID $PID started at $STARTED_AT" >> "$LOG_FILE"

wait $PID
EXIT_CODE=$?

cleanup

exit "$EXIT_CODE"
