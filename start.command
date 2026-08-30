#!/usr/bin/env bash

# Resolve project directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=================================================="
echo "   🌿 Plant Stake Labeler - macOS Launcher"
echo "=================================================="
echo ""

# 1. Check Label LIVE status
echo "🔍 Checking Label LIVE..."
if nc -z 127.0.0.1 11180 2>/dev/null; then
    echo "   ✅ Label LIVE Local API is active on port 11180."
else
    echo "   ⚠️  Label LIVE is not detected on port 11180."
    if [ -d "/Applications/Label LIVE.app" ]; then
        echo "   🚀 Launching Label LIVE from /Applications..."
        open -a "Label LIVE"
        sleep 2
    else
        echo "   ℹ️  Please ensure Label LIVE is running with 'Local API' enabled in Settings."
    fi
fi

echo ""

# 2. Check if build directory exists
PORT=4200

# Check if port 4200 is already in use
if nc -z 127.0.0.1 $PORT 2>/dev/null; then
    echo "🌐 Server is already running on http://localhost:$PORT"
    open "http://localhost:$PORT"
    exit 0
fi

if [ -f "$DIR/dist/label-live-app/browser/index.html" ]; then
    echo "⚡ Launching central application server (with cross-device config sync)..."
    python3 "$DIR/server.py" $PORT &
    SERVER_PID=$!
else
    echo "📦 First-time build setup..."
    if [ ! -d "$DIR/node_modules" ]; then
        echo "   Installing dependencies (npm install)..."
        npm install
    fi
    echo "   Compiling application..."
    npm run build
    python3 "$DIR/server.py" $PORT &
    SERVER_PID=$!
fi

# Trap SIGINT/SIGTERM to cleanly kill the server on exit
cleanup() {
    echo ""
    echo "🛑 Stopping Plant Stake Labeler server..."
    kill $SERVER_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

sleep 1

echo "🌐 Opening http://localhost:$PORT in your default browser..."
open "http://localhost:$PORT"

echo ""
echo "=================================================="
echo "   ✅ Application is running at http://localhost:$PORT"
echo "   Press [Ctrl + C] in this window to stop."
echo "=================================================="
echo ""

# Wait for background server process
wait $SERVER_PID
