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
STARTED_AT=$(date -Iseconds)
ESTIMATED_STOP=$(date -d "$STARTED_AT + $DURATION seconds" -Iseconds 2>/dev/null || date -v+${DURATION}S -Iseconds)

# --- Calculate timeout with buffer ---
SCALED_BUFFER=$(( DURATION / 20 ))
[[ $SCALED_BUFFER -gt 600 ]] && SCALED_BUFFER=600
BUFFER=$(( 300 + SCALED_BUFFER ))
TIMEOUT=$(( DURATION + BUFFER ))

# --- Initialize status ---
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

# --- Trap for graceful SIGINT handling ---
trap 'echo "Caught SIGINT, forwarding to FFmpeg..."; kill -INT "$FFMPEG_PID"; wait "$FFMPEG_PID"; echo "SIGINT handled."; exit 0' INT

# --- Launch FFmpeg in background ---
ffmpeg -loglevel "$LOGLEVEL" \
    -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 10 -rw_timeout 30000000 \
    -i "$STREAM_URL" \
    -t "$DURATION" \
    -c:v libx264 -crf 20 -preset slow \
    -c:a aac -b:a 192k \
    "$OUTPUT_FILE" >> "$LOG_FILE" 2>&1 &

FFMPEG_PID=$!
echo "PID=$FFMPEG_PID" >> "$STATUS_FILE"

# --- Wait for FFmpeg to finish ---
wait "$FFMPEG_PID"
EXIT_CODE=$?
ACTUAL_STOP=$(date -Iseconds)

# --- Finalize status ---
{
    echo "ACTUAL_STOP=$ACTUAL_STOP"
    if [[ ! -f "$OUTPUT_FILE" ]]; then
        echo "STATUS=error"
    elif [[ $EXIT_CODE -eq 0 ]]; then
        echo "STATUS=done"
    elif [[ $EXIT_CODE -eq 130 || $EXIT_CODE -eq 255 ]]; then
        echo "STATUS=stopped"
    elif [[ $EXIT_CODE -eq 124 ]]; then
        echo "STATUS=timeout"
    else
        echo "STATUS=error"
    fi

} >> "$STATUS_FILE"
