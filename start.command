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
    echo "   ⚠️  Label LIVE is not detected on local port 11180."
    if [ -d "/Applications/Label LIVE.app" ]; then
        echo "   🚀 Launching Label LIVE from /Applications..."
        open -a "Label LIVE"
        sleep 2
    else
        echo "   ℹ️  Please ensure Label LIVE is running with 'Local API' enabled."
    fi
fi

echo ""

# 2. Check build status
if [ ! -f "$DIR/dist/label-live-app/browser/index.html" ]; then
    echo "📦 First-time build setup required..."
    if ! command -v npm &> /dev/null; then
        echo "❌ Error: Node.js and npm are required for first-time build setup."
        echo "   Please install Node.js from https://nodejs.org/"
        echo ""
        read -p "Press [Enter] to exit..."
        exit 1
    fi
    if [ ! -d "$DIR/node_modules" ]; then
        echo "   Installing dependencies (npm install)..."
        npm install || { echo "❌ npm install failed"; read -p "Press [Enter] to exit..."; exit 1; }
    fi
    echo "   Compiling application (npm run build)..."
    npm run build || { echo "❌ npm run build failed"; read -p "Press [Enter] to exit..."; exit 1; }
fi

PORT=4200

# 3. Check if port is already running
if nc -z 127.0.0.1 $PORT 2>/dev/null; then
    echo "🌐 Server is already running on http://localhost:$PORT"
    open "http://localhost:$PORT"
    exit 0
fi

# 4. Launch central Python server
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required to run the local server."
    read -p "Press [Enter] to exit..."
    exit 1
fi

echo "⚡ Launching Plant Stake Labeler on http://localhost:$PORT..."
python3 "$DIR/server.py" $PORT &
SERVER_PID=$!

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

wait $SERVER_PID
