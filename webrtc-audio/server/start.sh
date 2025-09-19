#!/bin/bash

# WebRTC Audio SFU Server Startup Script
echo "🎵 Starting WebRTC Audio SFU Server..."

# Navigate to server directory
cd "$(dirname "$0")"

# Check if required files exist
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found in current directory"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in current directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Kill any existing process on port 3001
echo "🧹 Cleaning up existing processes on port 3001..."
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null || true

# Start the server
echo "🚀 Starting server on port 3001..."
node server.js