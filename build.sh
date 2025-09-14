#!/bin/bash
# Render build script for Gyandhara Backend

echo "🚀 Starting Gyandhara Backend Build Process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Initialize admin user in production
echo "👑 Initializing admin user..."
npm run init-admin

echo "✅ Build completed successfully!"
echo "🎯 Ready to start server with: npm start"