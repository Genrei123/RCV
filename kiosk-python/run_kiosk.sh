#!/bin/bash
# =========================================================================
# RCV Kiosk Launcher
# =========================================================================
# Starts the kiosk application with auto-restart on crash.
# The kiosk will keep restarting until:
#   - A graceful exit occurs (exit code 0)
#   - A "close_app" command is received from the Debug Tool (exit code 42)
#   - Too many rapid crashes happen (safety limit)
#
# Usage:
#   ./run_kiosk.sh
# =========================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================="
echo "  RCV Kiosk Launcher"
echo "========================================="
echo "Directory: $SCRIPT_DIR"
echo ""

# ---- Check Python ----
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found"
    exit 1
fi

# ---- Activate virtual environment if it exists ----
if [ -d "$SCRIPT_DIR/venv" ]; then
    echo "📦 Activating virtual environment..."
    source "$SCRIPT_DIR/venv/bin/activate"
fi

# ---- Quick dependency check ----
echo "🔍 Checking core dependencies..."
python3 -c "import cv2, PIL, pyzbar" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Some core dependencies are missing."
    echo "   Run ./install.sh to install them."
fi

# ---- Load environment variables ----
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "📝 Loading environment variables..."
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
else
    echo "⚠️  Warning: .env file not found"
fi

# ---- Create data directory if needed ----
mkdir -p "$HOME/kiosk_data/ocr_scans"

# ---- Auto-restart loop ----
MAX_RAPID_CRASHES=5
RAPID_CRASH_WINDOW=60  # seconds
crash_times=()

while true; do
    echo ""
    echo "✨ Launching RCV Kiosk... ($(date))"
    echo ""

    start_time=$(date +%s)

    python3 main.py
    exit_code=$?

    end_time=$(date +%s)
    runtime=$((end_time - start_time))

    echo ""
    echo "⚠️  Kiosk exited with code $exit_code after ${runtime}s ($(date))"

    # Exit code 0 = graceful shutdown, do not restart
    if [ $exit_code -eq 0 ]; then
        echo "👋 Kiosk stopped gracefully. Not restarting."
        break
    fi

    # Exit code 42 = close_app command from debug tool (maintenance mode)
    if [ $exit_code -eq 42 ]; then
        echo "🔧 Kiosk closed for maintenance (exit code 42). Not restarting."
        break
    fi

    # Track rapid crashes to prevent infinite restart loops
    crash_times+=("$end_time")

    # Keep only crashes within the time window
    recent_crashes=()
    for t in "${crash_times[@]}"; do
        if [ $((end_time - t)) -le $RAPID_CRASH_WINDOW ]; then
            recent_crashes+=("$t")
        fi
    done
    crash_times=("${recent_crashes[@]}")

    if [ ${#crash_times[@]} -ge $MAX_RAPID_CRASHES ]; then
        echo "❌ Too many rapid crashes (${#crash_times[@]} in ${RAPID_CRASH_WINDOW}s). Stopping."
        echo "   Check logs and fix the issue, then restart with: ./run_kiosk.sh"
        break
    fi

    echo "🔄 Restarting kiosk in 3 seconds... (crash ${#crash_times[@]}/$MAX_RAPID_CRASHES)"
    sleep 3
done

echo ""
echo "👋 Kiosk launcher finished."
