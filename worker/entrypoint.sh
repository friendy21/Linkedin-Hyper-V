#!/bin/bash
set -e

# Start virtual display — Chrome runs headed here without a real monitor
Xvfb :99 -screen 0 1366x768x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

export DISPLAY=:99
sleep 2  # Wait for Xvfb to initialise

echo "[entrypoint] Xvfb started on DISPLAY=:99"

# Trap SIGTERM to clean up Xvfb on container stop
trap "kill $XVFB_PID 2>/dev/null; exit 0" SIGTERM SIGINT

exec node src/index.js
