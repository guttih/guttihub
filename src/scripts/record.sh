#!/bin/bash

# --------------------------------------
# 📼 Recording script
# Supports HLS and TS recording types
# Formats output into MP4
# Now with packaging + optimizing stages!
# --------------------------------------

set -euo pipefail

# --- Defaults ---
LOGLEVEL="error"
FORMAT="mp4"
RECORDING_TYPE="ts"

# --- Argument Parsing ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --baseUrl) BASE_URL="$2"; shift 2 ;;
    --cacheKey) CACHE_KEY="$2"; shift 2 ;;
    --url) STREAM_URL="$2"; shift 2 ;;
    --duration) DURATION="$2"; shift 2 ;;
    --user) USER="$2"; shift 2 ;;
    --outputFile) OUTPUT_FILE="$2"; shift 2 ;;
    --format) FORMAT="$2"; shift 2 ;;
    --loglevel) LOGLEVEL="$2"; shift 2 ;;
    --recordingType) RECORDING_TYPE="$2"; shift 2 ;;
    *) echo "❌ Unknown parameter $1" >&2; exit 1 ;;
  esac
done

# --- Validation ---
[[ -z "${BASE_URL:-}" ]] && echo "❌ Missing --url" >&2 && exit 1
[[ -z "${CACHE_KEY:-}" ]] && echo "❌ Missing --url" >&2 && exit 1
[[ -z "${STREAM_URL:-}" ]] && echo "❌ Missing --url" && exit 1
[[ -z "${DURATION:-}" ]] && echo "❌ Missing --duration" && exit 1
[[ -z "${USER:-}" ]] && echo "❌ Missing --user" && exit 1
[[ -z "${OUTPUT_FILE:-}" ]] && echo "❌ Missing --outputFile" && exit 1

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
OUTPUT_FILE="$(realpath "$OUTPUT_FILE")"
LOG_FILE="${OUTPUT_FILE}.log"
STATUS_FILE="${OUTPUT_FILE}.status"
TS_FILE="${OUTPUT_FILE%.mp4}.ts"
HLS_PLAYLIST="${OUTPUT_FILE%.mp4}.m3u8"
HLS_DIR="${OUTPUT_FILE%.mp4}_hls"

# --- Timestamps ---
STARTED_AT=$(date -Iseconds)
ESTIMATED_STOP=$(date -d "$STARTED_AT + $DURATION seconds" -Iseconds 2>/dev/null || date -v+${DURATION}S -Iseconds)

# --- Timeouts ---
SCALED_BUFFER=$((DURATION / 20))
[[ $SCALED_BUFFER -gt 600 ]] && SCALED_BUFFER=600
BUFFER=$((300 + SCALED_BUFFER))
TIMEOUT=$((DURATION + BUFFER))

# --- Initial Status ---
cat >"$STATUS_FILE" <<EOF
STATUS=recording
STARTED_AT=$STARTED_AT
EXPECTED_STOP=$ESTIMATED_STOP
STREAM=$STREAM_URL
USER=$USER
DURATION=$DURATION
TIMEOUT=$TIMEOUT
OUTPUT_FILE=$OUTPUT_FILE
TS_FILE=$TS_FILE
HLS_PLAYLIST=$HLS_PLAYLIST
LOG_FILE=$LOG_FILE
EOF

# --- Prepare HLS Folder if Needed ---
if [[ "$RECORDING_TYPE" == "hls" ]]; then
  echo "DEBUG: mkdir -p $HLS_DIR" >> "$LOG_FILE"
  mkdir -p "$HLS_DIR"
  ls -la "$HLS_DIR" >> "$LOG_FILE"
fi

# --- Finalization ---
finalize_recording() {
  INPUT_FILE=""

  if [[ "$RECORDING_TYPE" == "hls" && -f "$HLS_PLAYLIST" ]]; then
    echo "⏳ Waiting for HLS playlist to finalize..." >>"$LOG_FILE"
    for i in {1..30}; do
      if grep -q "#EXT-X-ENDLIST" "$HLS_PLAYLIST"; then
        echo "✅ Playlist finalized after $i seconds." >>"$LOG_FILE"
        break
      fi
      sleep 1
    done

    if ! grep -q "#EXT-X-ENDLIST" "$HLS_PLAYLIST"; then
      echo "❌ Playlist never finalized." >>"$LOG_FILE"
      echo "STATUS=error" >>"$STATUS_FILE"
      echo "ERROR=Playlist did not finalize with #EXT-X-ENDLIST" >>"$STATUS_FILE"
      return
    fi

    INPUT_FILE="$HLS_PLAYLIST"
  elif [[ -f "$TS_FILE" ]]; then
    INPUT_FILE="$TS_FILE"
  fi

  if [[ -z "$INPUT_FILE" ]]; then
    echo "STATUS=error" >>"$STATUS_FILE"
    echo "ERROR=No input file found for packaging" >>"$STATUS_FILE"
    return
  fi

  echo "STATUS=packaging" >>"$STATUS_FILE"

  if [[ "$RECORDING_TYPE" == "hls" ]]; then
    if ! (
      cd "$(dirname "$HLS_PLAYLIST")" && \
      ffmpeg -loglevel "$LOGLEVEL" -fflags +genpts \
        -i "$(basename "$HLS_PLAYLIST")" \
        -c copy "$OUTPUT_FILE" >>"$LOG_FILE" 2>&1
    ); then
      echo "STATUS=error" >>"$STATUS_FILE"
      echo "ERROR=Final transmux failed" >>"$STATUS_FILE"
      return
    fi
  else
    if ! ffmpeg -loglevel "$LOGLEVEL" -fflags +genpts \
      -i "$INPUT_FILE" -c copy "$OUTPUT_FILE" >>"$LOG_FILE" 2>&1; then
      echo "STATUS=error" >>"$STATUS_FILE"
      echo "ERROR=Final transmux failed" >>"$STATUS_FILE"
      return
    fi
  fi

  echo "STATUS=optimizing" >>"$STATUS_FILE"

  if ffmpeg -loglevel "$LOGLEVEL" -fflags +genpts \
        -i "$OUTPUT_FILE" \
        -c:v libx264 -preset veryfast -crf 23 \
        -c:a aac -b:a 128k \
        "${OUTPUT_FILE}.opt.mp4" >>"$LOG_FILE" 2>&1; then
    mv "${OUTPUT_FILE}.opt.mp4" "$OUTPUT_FILE"
    echo "STATUS=done" >>"$STATUS_FILE"
    [[ "$RECORDING_TYPE" == "hls" ]] && rm -rf "$HLS_PLAYLIST" "$HLS_DIR"
    [[ "$RECORDING_TYPE" == "ts" && -f "$TS_FILE" ]] && rm "$TS_FILE"
  else
    echo "STATUS=error" >>"$STATUS_FILE"
    echo "ERROR=Optimization failed" >>"$STATUS_FILE"
  fi
}

send_cleanup_report() {
  if [[ -n "${BASE_URL:-}" ]]; then
    if curl -s --fail -X POST "$BASE_URL/api/job/has-ended/$CACHE_KEY" \
         -H "Content-Type: application/json" \
         -d "{\"cacheKey\":\"$CACHE_KEY\"}" >/dev/null; then
      echo "✅ Cleanup report sent."
    else
      echo "❌ Cleanup report failed (exit $?)"
    fi
  fi
}

# --- Signal Traps ---
cleanup_and_exit() {
  ACTUAL_STOP=$(date -Iseconds)
  echo "ACTUAL_STOP=$ACTUAL_STOP" >>"$STATUS_FILE"
  echo "INTERRUPTED=1" >>"$STATUS_FILE"
  finalize_recording
  send_cleanup_report
  exit 0
}

trap cleanup_and_exit SIGINT SIGTERM

# --- Start Recording ---
if [[ "$RECORDING_TYPE" == "hls" ]]; then
  timeout "${TIMEOUT}"s ffmpeg -loglevel "$LOGLEVEL" \
    -i "$STREAM_URL" \
    -t "$DURATION" \
    -c:v libx264 -preset ultrafast -g 25 -sc_threshold 0 \
    -c:a aac -b:a 128k -ac 2 -ar 44100 \
    -f hls \
    -hls_time 4 \
    -hls_list_size 0 \
    -hls_flags append_list \
    -hls_segment_filename "${HLS_DIR}/segment_%03d.ts" \
    -hls_base_url "$(basename "$HLS_DIR")/" \
    "$HLS_PLAYLIST" >>"$LOG_FILE" 2>&1 &
else
  timeout "${TIMEOUT}"s ffmpeg -loglevel "$LOGLEVEL" -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 10 -rw_timeout 30000000 \
    -i "$STREAM_URL" -t "$DURATION" -c copy -f mpegts "$TS_FILE" >>"$LOG_FILE" 2>&1 &
fi

PID=$!
echo "PID=$PID" >>"$STATUS_FILE"
echo "🕓 Waiting for FFmpeg process (PID=$PID)..." >>"$LOG_FILE"

wait $PID
EXIT_CODE=$?
ACTUAL_STOP=$(date -Iseconds)
echo "ACTUAL_STOP=$ACTUAL_STOP" >>"$STATUS_FILE"
echo "FFMPEG_EXIT=$EXIT_CODE" >>"$STATUS_FILE"

if [[ $EXIT_CODE -eq 124 || $EXIT_CODE -eq 130 || $EXIT_CODE -eq 255 ]]; then
  echo "INTERRUPTED=1" >>"$STATUS_FILE"
fi

finalize_recording || echo "finalize_recording FAILED"
send_cleanup_report
