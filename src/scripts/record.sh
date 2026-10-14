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
PARENT_PID="$$"

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
        STREAM_URL="$2"
        shift 2
        ;;
    --duration)
        DURATION="$2"
        shift 2
        ;;
    --user)
        USER="$2"
        shift 2
        ;;
    --outputFile)
        OUTPUT_FILE="$2"
        shift 2
        ;;
    --format)
        FORMAT="$2"
        shift 2
        ;;
    --loglevel)
        LOGLEVEL="$2"
        shift 2
        ;;
    --recordingType)
        RECORDING_TYPE="$2"
        shift 2
        ;;
    *)
        echo "❌ Unknown parameter $1" >&2
        exit 1
        ;;
    esac
done

# --- Validation ---
[[ -z "${BASE_URL:-}" ]] && echo "❌ Missing --url" >&2 && exit 1
[[ -z "${CACHE_KEY:-}" ]] && echo "❌ Missing --url" >&2 && exit 1
[[ -z "${STREAM_URL:-}" ]] && echo "❌ Missing --url" && exit 1
[[ -z "${DURATION:-}" ]] && echo "❌ Missing --duration" && exit 1
[[ -z "${USER:-}" ]] && echo "❌ Missing --user" && exit 1
[[ -z "${OUTPUT_FILE:-}" ]] && echo "❌ Missing --outputFile" && exit 1

export BASE_URL="$BASE_URL"
export CACHE_KEY="$CACHE_KEY"
# after parsing args
BASE_URL="${BASE_URL:-}"
CACHE_KEY="${CACHE_KEY:-}"
export BASE_URL CACHE_KEY

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

# Durations are wall-clock seconds. Every retry shares this deadline.
[[ "$DURATION" =~ ^[1-9][0-9]*$ && ${#DURATION} -le 7 ]] || { echo "Invalid duration" >&2; exit 1; }
[[ "$RECORDING_TYPE" == hls || "$RECORDING_TYPE" == ts ]] || exit 1
STARTED_AT=$(date -Iseconds)
DEADLINE=$((SECONDS + DURATION))
ESTIMATED_STOP=$(date -d "@$(( $(date +%s) + DURATION ))" -Iseconds)
TIMEOUT=$DURATION
# Packaging gets at least an hour; optimization gets at least six hours.
PACKAGE_LIMIT=$((DURATION + 3600))
OPTIMIZE_LIMIT=$((DURATION * 4 + 21600))
PARTS_DIR="${OUTPUT_FILE%.mp4}_parts"
mkdir -p "$PARTS_DIR"
CONCAT_FILE="$PARTS_DIR/inputs.txt"
: > "$CONCAT_FILE"
PID=""
STOP_REQUESTED=0

cat >"$STATUS_FILE" <<EOF
STATUS=recording
STARTED_AT=$STARTED_AT
EXPECTED_STOP=$ESTIMATED_STOP
CACHE_KEY=$CACHE_KEY
STREAM=$STREAM_URL
USER=$USER
DURATION=$DURATION
TIMEOUT=$TIMEOUT
OUTPUT_FILE=$OUTPUT_FILE
TS_FILE=$TS_FILE
HLS_PLAYLIST=$HLS_PLAYLIST
LOG_FILE=$LOG_FILE
PID=$PARENT_PID
EOF

# timeout owns a separate process group. Do not use --foreground: its
# kill-after must reach FFmpeg and its descendants, not just the launcher.
run_bounded() {
    local limit="$1"
    shift
    local code=0
    setsid timeout --signal=INT --kill-after=10 "${limit}s" "$@" >>"$LOG_FILE" 2>&1 &
    PID=$!
    echo "FFMPEG_PID=$PID" >>"$STATUS_FILE"
    wait "$PID" || code=$?
    # A trapped signal can interrupt wait before the child exits.
    if [[ $STOP_REQUESTED -eq 1 ]]; then
        wait "$PID" 2>/dev/null || true
    fi
    PID=""
    return "$code"
}

request_stop() {
    STOP_REQUESTED=1
    echo "INTERRUPTED=1" >>"$STATUS_FILE"
    if [[ -n "$PID" ]]; then
        # timeout handles INT and starts its own forced-kill grace period.
        kill -INT "$PID" 2>/dev/null || true
    fi
}
trap request_stop INT TERM

send_cleanup_report() {
    if curl --connect-timeout 5 --max-time 20 -s --fail -X POST \
        "$BASE_URL/api/job/has-ended/$CACHE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"cacheKey\":\"$CACHE_KEY\"}" >/dev/null; then
        echo "Cleanup report sent" >>"$LOG_FILE"
    else
        echo "Cleanup report failed" >>"$LOG_FILE"
    fi
}

# Only HTTP inputs accept these options. Outer retries also cover other
# protocols and FFmpeg versions which do not support an optional setting.
RECONNECT_ARGS=()
if [[ "$STREAM_URL" == http://* || "$STREAM_URL" == https://* ]]; then
    RECONNECT_ARGS=(-reconnect 1 -reconnect_streamed 1 -reconnect_at_eof 1
        -reconnect_on_network_error 1 -reconnect_on_http_error 408,429,5xx
        -reconnect_delay_max 5 -rw_timeout 15000000)
fi

attempt=0
while [[ $STOP_REQUESTED -eq 0 && $SECONDS -lt $DEADLINE ]]; do
    attempt=$((attempt + 1))
    remaining=$((DEADLINE - SECONDS))
    echo "CAPTURE_ATTEMPT=$attempt" >>"$STATUS_FILE"
    # Relative paths simplify concat escaping, even when output paths contain quotes.
    part="attempt_$attempt"
    capture_args=()
    if [[ "$RECORDING_TYPE" == hls ]]; then
        mkdir -p "$PARTS_DIR/$part"
        input="$PARTS_DIR/$part.m3u8"
        echo "HLS_PLAYLIST=$input" >>"$STATUS_FILE"
        capture_args=(-c:v libx264 -preset ultrafast -g 25 -sc_threshold 0
            -c:a aac -b:a 128k -ac 2 -ar 44100 -f hls -hls_time 4
            -hls_list_size 0 -hls_segment_filename "$PARTS_DIR/$part/segment_%06d.ts"
            -hls_base_url "$part/" "$input")
    else
        input="$PARTS_DIR/$part.ts"
        echo "TS_FILE=$input" >>"$STATUS_FILE"
        capture_args=(-c copy -f mpegts "$input")
    fi
    code=0
    run_bounded "$remaining" ffmpeg -nostdin -loglevel "$LOGLEVEL" \
        "${RECONNECT_ARGS[@]}" -i "$STREAM_URL" -t "$remaining" \
        "${capture_args[@]}" || code=$?
    echo "FFMPEG_EXIT=$code" >>"$STATUS_FILE"
    if [[ -s "$input" ]]; then
        if [[ "$RECORDING_TYPE" == hls ]]; then
            # A forced kill may leave a valid playlist open. Seal the local
            # snapshot so packaging never waits for more live segments.
            if grep -q '^#EXTINF:' "$input"; then
                grep -q '^#EXT-X-ENDLIST' "$input" || echo '#EXT-X-ENDLIST' >>"$input"
                printf "file '%s'\n" "$(basename "$input")" >>"$CONCAT_FILE"
            fi
        else
            printf "file '%s'\n" "$(basename "$input")" >>"$CONCAT_FILE"
        fi
    fi
    [[ $STOP_REQUESTED -eq 1 || $SECONDS -ge $DEADLINE ]] && break
    echo "Capture ended early (exit $code); retrying without resetting deadline" >>"$LOG_FILE"
    remaining=$((DEADLINE - SECONDS))
    [[ $remaining -gt 2 ]] && remaining=2
    sleep "$remaining" || true
done

echo "ACTUAL_STOP=$(date -Iseconds)" >>"$STATUS_FILE"

finalize_recording() {
    if [[ ! -s "$CONCAT_FILE" ]]; then
        echo "ERROR=No captured media available" >>"$STATUS_FILE"
        return 1
    fi
    echo "STATUS=packaging" >>"$STATUS_FILE"
    if ! run_bounded "$PACKAGE_LIMIT" ffmpeg -nostdin -loglevel "$LOGLEVEL" \
        -y -fflags +genpts -f concat -safe 0 -protocol_whitelist file,crypto,data \
        -i "$CONCAT_FILE" -c copy -movflags +faststart "${OUTPUT_FILE}.packaged.mp4"; then
        echo "ERROR=Packaging failed or timed out; capture parts retained" >>"$STATUS_FILE"
        return 1
    fi
    mv "${OUTPUT_FILE}.packaged.mp4" "$OUTPUT_FILE"
    echo "STATUS=optimizing" >>"$STATUS_FILE"
    if run_bounded "$OPTIMIZE_LIMIT" ffmpeg -nostdin -loglevel "$LOGLEVEL" \
        -y -i "$OUTPUT_FILE" -c:v libx264 -preset veryfast -crf 23 \
        -c:a aac -b:a 128k -movflags +faststart "${OUTPUT_FILE}.opt.mp4"; then
        mv "${OUTPUT_FILE}.opt.mp4" "$OUTPUT_FILE"
    else
        echo "WARNING=Optimization failed or timed out; keeping packaged MP4" >>"$STATUS_FILE"
        rm -f "${OUTPUT_FILE}.opt.mp4"
    fi
    # Remove only this job's temporary capture parts after successful packaging.
    rm -rf -- "$PARTS_DIR"
    if [[ $STOP_REQUESTED -eq 1 ]]; then
        echo "STATUS=stopped" >>"$STATUS_FILE"
    else
        echo "STATUS=done" >>"$STATUS_FILE"
    fi
}

# Stop requests during capture must not also cancel subsequent packaging.
trap ':' INT TERM
if ! finalize_recording; then
    echo "STATUS=error" >>"$STATUS_FILE"
fi
send_cleanup_report
