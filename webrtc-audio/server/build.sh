#!/bin/bash

# Build script for Render native Node.js deployment
echo "🚀 Starting Gyandhara Audio SFU build process..."

# Display Node.js and npm versions
echo "📦 Node.js version: $(node --version)"
echo "📦 NPM version: $(npm --version)"

# Install dependencies with verbose logging
echo "📥 Installing dependencies..."
npm install --verbose --production=false

# Run any post-install tasks if needed
echo "🔧 Running post-install tasks..."
npm run postinstall 2>/dev/null || echo "No postinstall script found, continuing..."

# Display installed packages for mediasoup
echo "📋 Checking mediasoup installation..."
npm list mediasoup 2>/dev/null || echo "Mediasoup installation status unclear"

# Verify critical files exist
echo "🔍 Verifying installation..."
if [ -f "server.js" ]; then
    echo "✅ Server file found"
else
    echo "❌ Server file missing"
    exit 1
fi

if [ -d "node_modules/mediasoup" ]; then
    echo "✅ Mediasoup installed successfully"
else
    echo "❌ Mediasoup installation failed"
    exit 1
fi

echo "✅ Build completed successfully!"