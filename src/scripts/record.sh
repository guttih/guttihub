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
        --loglevel) LOGLEVEL="$2"; shift 2 ;;       # log level [error|info|verbose]
      *) echo "ERROR: Unknown parameter $1" >&2; exit 1 ;;
    esac
done

# --- Validate required values ---
[[ -z "$STREAM_URL" ]]   && echo "ERROR: Missing stream URL" >&2 && exit 1
[[ -z "$DURATION" ]]     && echo "ERROR: Missing duration" >&2 && exit 1
[[ -z "$USER" ]]         && echo "ERROR: Missing user name" >&2 && exit 1
[[ -z "$OUTPUT_FILE" ]]  && echo "ERROR: Missing output file name" >&2 && exit 1
[[ -z "$FORMAT" ]]       && echo "ERROR: Missing output format" >&2 && exit 1
[[ -z "$LOGLEVEL" ]]     && echo "ERROR: Missing log level" >&2 && exit 1

if [[ "$FORMAT" != "mp4" ]]; then
    echo "STATUS=error" > "${OUTPUT_FILE}.status"
    echo "ERROR=Unsupported format '$FORMAT'" >> "${OUTPUT_FILE}.status"
    echo "ERROR: Unsupported format '$FORMAT'" >&2
    exit 1
fi

# --- Derived paths ---
LOG_FILE="${OUTPUT_FILE}.log"
STATUS_FILE="${OUTPUT_FILE}.status"
TS_FILE="${OUTPUT_FILE%.mp4}.ts"

STARTED_AT=$(date -Iseconds)
ESTIMATED_STOP=$(date -d "$STARTED_AT + $DURATION seconds" -Iseconds 2>/dev/null || date -v+${DURATION}S -Iseconds)

SCALED_BUFFER=$(( DURATION / 20 ))
[[ $SCALED_BUFFER -gt 600 ]] && SCALED_BUFFER=600
BUFFER=$(( 300 + SCALED_BUFFER ))
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
  echo "TS_FILE=$TS_FILE"
  echo "LOG_FILE=$LOG_FILE"
} > "$STATUS_FILE"

# --- Handle SIGINT / SIGTERM ---
cleanup_and_exit() {
  echo "🚨 Entered cleanup_and_exit trap at $(date -Iseconds)" >> "$LOG_FILE"
  echo "🧪 Checking for TS file: $TS_FILE" >> "$LOG_FILE"
  ls -lh "$TS_FILE" >> "$LOG_FILE" 2>/dev/null || echo "🧪 TS file does not exist" >> "$LOG_FILE"

  ACTUAL_STOP=$(date -Iseconds)
  echo "ACTUAL_STOP=$ACTUAL_STOP" >> "$STATUS_FILE"
  echo "INTERRUPTED=1" >> "$STATUS_FILE"
  INTERRUPTED=1

  if [[ -f "$TS_FILE" ]]; then
    echo "🔄 Attempting transmux after signal..." >> "$LOG_FILE"
    echo "STATUS=packaging" >> "$STATUS_FILE"
    (
      ffmpeg -loglevel "$LOGLEVEL" -fflags +genpts \
        -i "$TS_FILE" \
        -c copy \
        "$OUTPUT_FILE" >> "$LOG_FILE" 2>&1
    ) &
    TRANSMUX_PID=$!
    echo "TRANSMUX_PID=$TRANSMUX_PID" >> "$STATUS_FILE"
    wait $TRANSMUX_PID

    if [[ $? -eq 0 ]]; then
      echo "STATUS=stopped" >> "$STATUS_FILE"
      echo "✅ Graceful exit after packaging interrupted recording." >> "$LOG_FILE"
      echo "🧽 Wiping TS file: $TS_FILE" >> "$LOG_FILE"
      rm "$TS_FILE"
      exit 0
    else
      echo "STATUS=error" >> "$STATUS_FILE"
      echo "ERROR=Transmuxing failed after interrupt" >> "$STATUS_FILE"
      echo "🧨 Trap exiting with failure, transmux failed." >> "$LOG_FILE"
      exit 1
    fi
  else
    echo "STATUS=error" >> "$STATUS_FILE"
    echo "ERROR=No TS file found after interrupt." >> "$STATUS_FILE"
    echo "🧨 Trap exiting with failure, TS file not found." >> "$LOG_FILE"
    exit 1
  fi
}
trap cleanup_and_exit SIGINT SIGTERM

# --- Record raw .ts stream (copy mode) ---
echo "📼 Starting ffmpeg for raw TS recording..." >> "$LOG_FILE"
echo "CMD: timeout ${TIMEOUT}s ffmpeg -loglevel $LOGLEVEL -i $STREAM_URL -t $DURATION -c copy -f mpegts $TS_FILE" >> "$LOG_FILE"
(
  timeout "${TIMEOUT}"s ffmpeg -loglevel "$LOGLEVEL" \
    -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 10 -rw_timeout 30000000 \
    -i "$STREAM_URL" \
    -t "$DURATION" \
    -c copy -f mpegts "$TS_FILE" >> "$LOG_FILE" 2>&1
) &
PID=$!
echo "PID=$PID" >> "$STATUS_FILE"
echo "🕓 Waiting for raw FFmpeg process (PID=$PID) to complete..." >> "$LOG_FILE"

wait $PID
EXIT_CODE=$?
ACTUAL_STOP=$(date -Iseconds)
echo "ACTUAL_STOP=$ACTUAL_STOP" >> "$STATUS_FILE"
echo "FFMPEG_EXIT=$EXIT_CODE" >> "$STATUS_FILE"
echo "🛑 Raw FFmpeg exited with code $EXIT_CODE" >> "$LOG_FILE"

if [[ $EXIT_CODE -eq 124 || $EXIT_CODE -eq 130 || $EXIT_CODE -eq 255 ]]; then
  echo "INTERRUPTED=1" >> "$STATUS_FILE"
  INTERRUPTED=1
fi

# --- Skip final remux if already handled in trap ---
if grep -q '^STATUS=stopped' "$STATUS_FILE"; then
  echo "🟡 Skipping final remux - already handled by trap." >> "$LOG_FILE"
  exit 0
fi

# --- Try to remux .ts to .mp4 without re-encoding ---
if [[ -f "$TS_FILE" ]]; then
  echo "🔄 Starting transmux to mp4..." >> "$LOG_FILE"
  echo "STATUS=packaging" >> "$STATUS_FILE"
  (
    ffmpeg -loglevel "$LOGLEVEL" -fflags +genpts \
      -i "$TS_FILE" \
      -c copy \
      "$OUTPUT_FILE" >> "$LOG_FILE" 2>&1
  ) &
  TRANSMUX_PID=$!
  echo "TRANSMUX_PID=$TRANSMUX_PID" >> "$STATUS_FILE"
  wait $TRANSMUX_PID
  if [[ $? -eq 0 ]]; then
    if [[ "$INTERRUPTED" -eq 1 ]]; then
      echo "STATUS=stopped" >> "$STATUS_FILE"
    else
      echo "STATUS=done" >> "$STATUS_FILE"
    fi
    echo "🧽 Wiping TS file: $TS_FILE" >> "$LOG_FILE"
    rm "$TS_FILE"
  else
    echo "STATUS=error" >> "$STATUS_FILE"
    echo "ERROR=Transmuxing failed" >> "$STATUS_FILE"
  fi
else
  echo "STATUS=error" >> "$STATUS_FILE"
  echo "ERROR=TS file not found after recording" >> "$STATUS_FILE"
  echo "🧨 Skipping transmux: TS file not found." >> "$LOG_FILE"
fi
