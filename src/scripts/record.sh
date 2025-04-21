#!/bin/bash

# --- Default values ---
LOGLEVEL="error"
FORMAT="mp4"
RECORDING_TYPE="ts"

# --- Parse named arguments ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --url)           STREAM_URL="$2"    ; shift 2 ;;  # stream URL
        --duration)      DURATION="$2"      ; shift 2 ;;  # duration in seconds
        --user)          USER="$2"          ; shift 2 ;;  # user name
        --outputFile)    OUTPUT_FILE="$2"   ; shift 2 ;;  # output file name
        --format)        FORMAT="$2"        ; shift 2 ;;  # output format (mp4) default is mp4
        --loglevel)      LOGLEVEL="$2"      ; shift 2 ;;  # log level [error|info|verbose] default is error
        --recordingType) RECORDING_TYPE="$2"; shift 2 ;;  # Recording type [ts|hls] default is ts
        *) echo "ERROR: Unknown parameter $1" >&2; exit 1 ;;
    esac
done

# --- Validate required values ---
[[ -z "$STREAM_URL"     ]] && echo "ERROR: Missing stream URL" >&2 && exit 1
[[ -z "$DURATION"       ]] && echo "ERROR: Missing duration" >&2 && exit 1
[[ -z "$USER"           ]] && echo "ERROR: Missing user name" >&2 && exit 1
[[ -z "$OUTPUT_FILE"    ]] && echo "ERROR: Missing output file name" >&2 && exit 1
[[ -z "$FORMAT"         ]] && echo "ERROR: Missing output format" >&2 && exit 1
[[ -z "$LOGLEVEL"       ]] && echo "ERROR: Missing log level" >&2 && exit 1
[[ -z "$RECORDING_TYPE" ]] && echo "ERROR: Missing recording type" >&2 && exit 1

if [[ "$FORMAT" != "mp4" ]]; then
    echo "STATUS=error" >"${OUTPUT_FILE}.status"
    echo "ERROR=Unsupported format '$FORMAT'" >>"${OUTPUT_FILE}.status"
    exit 1
fi

# --- Derived paths ---
LOG_FILE="${OUTPUT_FILE}.log"
STATUS_FILE="${OUTPUT_FILE}.status"
TS_FILE="${OUTPUT_FILE%.mp4}.ts"
HLS_PLAYLIST="${OUTPUT_FILE%.mp4}.m3u8"
HLS_DIR="${OUTPUT_FILE%.mp4}_hls"
if [[ "$RECORDING_TYPE" == "hls" ]]; then
    echo "DEBUG: mkdir -p $HLS_DIR" >> "$LOG_FILE"
    mkdir -p "$HLS_DIR"
    ls -la "$HLS_DIR" >> "$LOG_FILE"
fi



STARTED_AT=$(date -Iseconds)
ESTIMATED_STOP=$(date -d "$STARTED_AT + $DURATION seconds" -Iseconds 2>/dev/null || date -v+${DURATION}S -Iseconds)

SCALED_BUFFER=$((DURATION / 20))
[[ $SCALED_BUFFER -gt 600 ]] && SCALED_BUFFER=600
BUFFER=$((300 + SCALED_BUFFER))
TIMEOUT=$((DURATION + BUFFER))

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
    echo "HLS_PLAYLIST=$HLS_PLAYLIST"
    echo "LOG_FILE=$LOG_FILE"
} >"$STATUS_FILE"

# --- Handle SIGINT / SIGTERM ---
cleanup_and_exit() {
    ACTUAL_STOP=$(date -Iseconds)
    echo "ACTUAL_STOP=$ACTUAL_STOP" >>"$STATUS_FILE"
    echo "INTERRUPTED=1" >>"$STATUS_FILE"

    if [[ "$RECORDING_TYPE" == "hls" && -f "$HLS_PLAYLIST" ]]; then
        echo "STATUS=packaging" >>"$STATUS_FILE"
        (
            cd "$(dirname "$HLS_PLAYLIST")" && \
            ffmpeg -loglevel "$LOGLEVEL" -fflags +genpts \
                -i "$(basename "$HLS_PLAYLIST")" \
                -c copy "$(realpath "$OUTPUT_FILE")"
            ) >>"$LOG_FILE" 2>&1
        [[ $? -eq 0 ]] && echo "STATUS=stopped" >>"$STATUS_FILE" && rm -rf "$HLS_PLAYLIST" "$HLS_DIR"
    elif [[ -f "$TS_FILE" ]]; then
        echo "STATUS=packaging" >>"$STATUS_FILE"
        ffmpeg -loglevel "$LOGLEVEL" -fflags +genpts -i "$TS_FILE" -c copy "$OUTPUT_FILE" >>"$LOG_FILE" 2>&1
        [[ $? -eq 0 ]] && echo "STATUS=stopped" >>"$STATUS_FILE" && rm "$TS_FILE"
    else
        echo "STATUS=error" >>"$STATUS_FILE"
        echo "ERROR=No input file found for transmuxing" >>"$STATUS_FILE"
    fi

    exit 0
}
trap cleanup_and_exit SIGINT SIGTERM

# --- Start recording ---
if [[ "$RECORDING_TYPE" == "hls" ]]; then
    (
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
            "$HLS_PLAYLIST" >>"$LOG_FILE" 2>&1
    ) &
else
    (
        timeout "${TIMEOUT}"s ffmpeg -loglevel "$LOGLEVEL" -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 10 -rw_timeout 30000000 -i "$STREAM_URL" -t "$DURATION" -c copy -f mpegts "$TS_FILE" >>"$LOG_FILE" 2>&1
    ) &
fi

PID=$!
echo "PID=$PID" >>"$STATUS_FILE"
echo "🕓 Waiting for FFmpeg process (PID=$PID) to complete..." >>"$LOG_FILE"

wait $PID
EXIT_CODE=$?
ACTUAL_STOP=$(date -Iseconds)
echo "ACTUAL_STOP=$ACTUAL_STOP" >>"$STATUS_FILE"
echo "FFMPEG_EXIT=$EXIT_CODE" >>"$STATUS_FILE"

if [[ $EXIT_CODE -eq 124 || $EXIT_CODE -eq 130 || $EXIT_CODE -eq 255 ]]; then
    echo "INTERRUPTED=1" >>"$STATUS_FILE"
fi

# --- Post-processing ---
INPUT_FILE=""
if [[ "$RECORDING_TYPE" == "hls" && -f "$HLS_PLAYLIST" ]]; then
    INPUT_FILE="$HLS_PLAYLIST"
    echo "⏳ Waiting for HLS playlist to finalize..." >> "$LOG_FILE"
    for i in {1..30}; do
        if grep -q "#EXT-X-ENDLIST" "$HLS_PLAYLIST"; then
            echo "✅ HLS playlist finalized after $i seconds." >> "$LOG_FILE"
            break
        fi
        echo "⌛ $i: Playlist not finalized yet..." >> "$LOG_FILE"
        sleep 1
    done

    if ! grep -q "#EXT-X-ENDLIST" "$HLS_PLAYLIST"; then
        echo "❌ Playlist never finalized. Aborting packaging." >> "$LOG_FILE"
        echo "STATUS=error" >> "$STATUS_FILE"
        echo "ERROR=Playlist did not finalize with #EXT-X-ENDLIST" >> "$STATUS_FILE"
        exit 1
    fi



elif [[ -f "$TS_FILE" ]]; then
    INPUT_FILE="$TS_FILE"
fi

if [[ -n "$INPUT_FILE" ]]; then
    echo "STATUS=packaging" >>"$STATUS_FILE"
    
    if [[ "$RECORDING_TYPE" == "hls" ]]; then
        # Change to the HLS playlist directory for correct relative segment resolution
        (
          cd "$(dirname "$HLS_PLAYLIST")" && \
          ffmpeg -loglevel "$LOGLEVEL" -fflags +genpts \
            -i "$(basename "$HLS_PLAYLIST")" \
            -c copy "$(realpath "$OUTPUT_FILE")" >>"$LOG_FILE" 2>&1
        )
    else
        # Standard transmux for .ts recording
        ffmpeg -loglevel "$LOGLEVEL" -fflags +genpts \
          -i "$INPUT_FILE" -c copy "$OUTPUT_FILE" >>"$LOG_FILE" 2>&1
    fi

    if [[ $? -eq 0 ]]; then
        echo "STATUS=done" >>"$STATUS_FILE"
        [[ "$RECORDING_TYPE" == "hls" ]] && rm -rf "$HLS_PLAYLIST" "$HLS_DIR"
        [[ -f "$TS_FILE" ]] && rm "$TS_FILE"
    else
        echo "STATUS=error" >>"$STATUS_FILE"
        echo "ERROR=Final transmux failed" >>"$STATUS_FILE"
    fi
else
    echo "STATUS=error" >>"$STATUS_FILE"
    echo "ERROR=No input file for packaging" >>"$STATUS_FILE"
fi

