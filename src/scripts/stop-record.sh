#!/bin/bash

# stop-record.sh
# Sends SIGINT to a running FFmpeg process.
# Supports identifying the process by output file OR by PID directly.

print_help() {
    cat <<EOF
Usage:
    ./stop-record.sh --outputFile <file> [--pid <pid>]

Description:
    Gracefully stops a recording by sending SIGINT to a running FFmpeg process.

Options:
    --outputFile <file>   Path to the output file (e.g., tmp/recording.mp4)
                          The script will look for a matching <file>.status to find the PID.
    --pid <pid>           Directly specify the PID to stop (overrides --outputFile lookup)
    -h, --help            Show this help message and exit

Examples:
    ./stop-record.sh --outputFile tmp/recording-1.mp4
    ./stop-record.sh --pid 12345

Note:
    The PID must still be running, and ideally should belong to an FFmpeg process.
    If both --pid and --outputFile are provided, --pid takes precedence.
EOF
}

# --- Parse args ---
PID=""
OUTPUT_FILE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --outputFile) OUTPUT_FILE="$2"; shift 2 ;;
        --pid) PID="$2"; shift 2 ;;
        -h|--help) print_help; exit 0 ;;
        *) echo "Unknown option: $1" >&2; print_help; exit 1 ;;
    esac
done

# --- Determine PID ---
if [[ -n "$PID" ]]; then
    echo "Using provided PID: $PID"
elif [[ -n "$OUTPUT_FILE" ]]; then
    STATUS_FILE="${OUTPUT_FILE}.status"
    if [[ ! -f "$STATUS_FILE" ]]; then
        echo "ERROR: Status file not found: $STATUS_FILE" >&2
        exit 1
    fi

    PID=$(grep '^PID=' "$STATUS_FILE" | cut -d= -f2)
    if [[ -z "$PID" ]]; then
      echo "ERROR: Could not extract PID from status file." >&2
      exit 1
    fi
    echo "Extracted PID $PID from $STATUS_FILE"
else
    echo "ERROR: You must provide either --pid or --outputFile" >&2
    print_help
    exit 1
fi

# --- Validate and send SIGINT ---
if kill -0 "$PID" 2>/dev/null; then
    echo "Sending SIGINT to PID $PID..."
    kill -INT "$PID"
    echo "Signal sent. FFmpeg should finalize and exit."
else
    echo "ERROR: Process $PID is not running or inaccessible." >&2
    exit 1
fi
