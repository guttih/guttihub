#!/bin/bash

# --- Parse named arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) STREAM_URL="$2"; shift 2 ;;
    --start) START_TIME="$2"; shift 2 ;;
    --duration) DURATION="$2"; shift 2 ;;
    --user) USER="$2"; shift 2 ;;
    --output) OUTPUT_DIR="$2"; shift 2 ;;
    --format) FORMAT="$2"; shift 2 ;;
    *) echo "ERROR: Unknown parameter $1" >&2; exit 1 ;;
  esac
done

# --- Validate ---
if [[ -z "$STREAM_URL" || -z "$START_TIME" || -z "$DURATION" || -z "$USER" || -z "$OUTPUT_DIR" || -z "$FORMAT" ]]; then
  echo "ERROR: Missing one or more required parameters." >&2
  exit 1
fi

# --- Compose the command to run ---
RECORD_CMD="bash $(dirname "$0")/record.sh \
  --url \"$STREAM_URL\" \
  --duration \"$DURATION\" \
  --user \"$USER\" \
  --outputFile \"$OUTPUT_FILE\" \
  --format \"$FORMAT\""


# --- Schedule the command with 'at' ---
echo "$RECORD_CMD" | at "$START_TIME" 2> /tmp/at_error.txt

if [[ $? -ne 0 ]]; then
  cat /tmp/at_error.txt
  echo "ERROR: Failed to schedule recording"
  exit 1
fi

# --- Output success message for backend parsing ---
echo "OK: Scheduled recording for $USER at $START_TIME"