#!/bin/bash

# --- Default values ---
LOGLEVEL="error"
FORMAT="mp4"


# --- Parse named arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) STREAM_URL="$2"; shift 2 ;;          # stream URL
    --duration) DURATION="$2"; shift 2 ;;       # duration in seconds
    --user) USER="$2"; shift 2 ;;               # user name
    --outputFile) OUTPUT_FILE="$2"; shift 2 ;;  # output file name
    --format) FORMAT="$2"; shift 2 ;;           # output format (mp4)
    --loglevel) LOGLEVEL="$2"; shift 2 ;;       # log level (error, info, verbose)
    *) echo "ERROR: Unknown parameter $1" >&2; exit 1 ;;
  esac
done

# --- Validate ---
if [[ -z "$STREAM_URL" || -z "$DURATION" || -z "$USER" || -z "$OUTPUT_FILE" || -z "$FORMAT" || "$LOGLEVEL" ]]; then
  echo "ERROR: Missing one or more required parameters." >&2
  exit 1
fi

if [[ "$FORMAT" != "mp4" ]]; then
  echo "STATUS=error" > "${OUTPUT_FILE}.status"
  echo "ERROR=Unsupported format '$FORMAT'" >> "${OUTPUT_FILE}.status"
  echo "ERROR: Unsupported format '$FORMAT'" >&2
  exit 1
fi

# --- Derived paths ---
LOG_FILE="${OUTPUT_FILE}.log"
STATUS_FILE="${OUTPUT_FILE}.status"

STARTED_AT=$(date -Iseconds)
ESTIMATED_STOP=$(date -d "$STARTED_AT + $DURATION seconds" -Iseconds 2>/dev/null || date -v+${DURATION}S -Iseconds)

# Always give at least 5 minutes (300s) + scaled buffer
SCALED_BUFFER=$(( DURATION / 20 ))
[[ $SCALED_BUFFER -gt 600 ]] && SCALED_BUFFER=600
BUFFER=$(( 300 + SCALED_BUFFER ))  # base + scaled
TIMEOUT=$(( DURATION + BUFFER ))

# --- Log initial status ---
{
  echo "STATUS=recording"
  echo "STARTED_AT=$STARTED_AT"
  echo "EXPECTED_STOP=$ESTIMATED_STOP"
  echo "STREAM=$STREAM_URL"
  echo "USER=$USER"
  echo "DURATION=$DURATION"
  echo "TIMEOUT=$TIMEOUT"
  echo "OUTPUT_FILE=$OUTPUT_FILE"
  echo "LOG_FILE=$LOG_FILE"
} > "$STATUS_FILE"

# --- Launch ffmpeg with timeout and track PID ---
(
  timeout "${TIMEOUT}"s ffmpeg -loglevel "$LOGLEVEL" \
    -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 10 -rw_timeout 30000000 \
    -i "$STREAM_URL" \
    -t "$DURATION" \
    -c:v libx264 -crf 20 -preset slow \
    -c:a aac -b:a 192k \
    "$OUTPUT_FILE" >> "$LOG_FILE" 2>&1
) &
PID=$!
echo "PID=$PID" >> "$STATUS_FILE"

wait $PID
EXIT_CODE=$?
ACTUAL_STOP=$(date -Iseconds)

echo "ACTUAL_STOP=$ACTUAL_STOP" >> "$STATUS_FILE"
echo "FFMPEG_EXIT=$EXIT_CODE" >> "$STATUS_FILE"

# --- Final status update ---
if [[ -f "$OUTPUT_FILE" && $EXIT_CODE -eq 0 ]]; then
  echo "STATUS=done" >> "$STATUS_FILE"
else
  echo "STATUS=error" >> "$STATUS_FILE"
fi