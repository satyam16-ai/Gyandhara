#!/bin/bash

# VoiceBoard Educational Platform - System Cleanup and Restart Script
# This script cleans up old processes and starts the system fresh

echo "🧹 VoiceBoard Educational Platform - System Cleanup and Restart"
echo "================================================================="

# Kill any existing processes
echo "🔄 Stopping existing processes..."
pkill -f "next dev" || true
pkill -f "node server" || true
pkill -f "nodemon" || true

# Clean up node modules if needed
echo "📦 Cleaning dependencies..."
rm -rf node_modules/.cache || true

# Start MongoDB if not running
echo "🍃 Checking MongoDB status..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "Starting MongoDB..."
    sudo systemctl start mongod || mongod --dbpath /data/db &
else
    echo "MongoDB is already running"
fi

# Wait a moment for MongoDB to fully start
sleep 2

echo ""
echo "✅ Cleanup completed!"
echo ""
echo "🚀 Starting VoiceBoard System:"
echo "  - Backend Server: http://localhost:8080"
echo "  - Frontend App: http://localhost:3000"
echo ""
echo "📋 New Architecture Features:"
echo "  ✅ Classroom → Lecture → Student Joining → Whiteboard Broadcasting"
echo "  ✅ Teacher Dashboard with Classroom Management"
echo "  ✅ Student Dashboard with Classroom Enrollment"
echo "  ✅ Real-time Lecture Broadcasting"
echo "  ✅ Role-based Authentication (Separate Teacher/Student Login)"
echo ""

# Start backend server in background
echo "🖥️  Starting backend server..."
cd /home/satyam/Desktop/Projects/std
nohup node server/index.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Give backend time to start
sleep 3

# Start frontend
echo "🎨 Starting frontend application..."
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "🎯 System Status:"
echo "  Backend PID: $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "🌐 Access URLs:"
echo "  📚 Teacher Login: http://localhost:3000/teacher-login"
echo "  🎓 Student Login: http://localhost:3000/student-login"  
echo "  ⚡ Admin Dashboard: http://localhost:3000/admin-login"
echo ""
echo "👤 Test Credentials:"
echo "  📚 Teacher: username=teacher, password=teacher123"
echo "  🎓 Student: username=student, password=student123"
echo "  ⚡ Admin: username=admin, password=admin123"
echo ""
echo "✨ Ready to use VoiceBoard Educational Platform!"
echo "Press Ctrl+C to stop all processes"

# Keep script running and wait for interrupt
wait
