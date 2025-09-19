#!/bin/bash

# WebRTC Audio System Test Script

echo "🎵 Testing WebRTC Audio SFU System"
echo "=================================="

# Check if servers are running
echo "1. Checking server health..."
SERVER_HEALTH=$(curl -s http://localhost:3001/health)
if [ $? -eq 0 ]; then
    echo "✅ SFU Server is running"
    echo "   Workers: $(echo $SERVER_HEALTH | jq -r '.workers')"
    echo "   Rooms: $(echo $SERVER_HEALTH | jq -r '.rooms')"
else
    echo "❌ SFU Server is not running on port 3001"
    exit 1
fi

echo ""
echo "2. Checking client server..."
CLIENT_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002)
if [ "$CLIENT_CHECK" = "200" ]; then
    echo "✅ Client server is running on port 3002"
else
    echo "❌ Client server is not running on port 3002"
    exit 1
fi

echo ""
echo "3. Testing API endpoints..."

# Test router capabilities endpoint (should return 404 for non-existent room)
ROUTER_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/routerCapabilities/test-room)
if [ "$ROUTER_TEST" = "200" ] || [ "$ROUTER_TEST" = "404" ]; then
    echo "✅ Router capabilities endpoint is responsive"
else
    echo "❌ Router capabilities endpoint error: $ROUTER_TEST"
fi

echo ""
echo "4. System Information:"
echo "   🖥️  SFU Server: http://localhost:3001"
echo "   🌐 Client Interface: http://localhost:3002"
echo "   📊 Health Check: http://localhost:3001/health"
echo "   📋 API Info: http://localhost:3001/api/info"

echo ""
echo "🧪 Manual Testing Instructions:"
echo "================================"
echo "1. Open two browser windows/tabs:"
echo "   - Window 1: http://localhost:3002 (Teacher)"
echo "   - Window 2: http://localhost:3002 (Student)"
echo ""
echo "2. Teacher Setup:"
echo "   - Select 'Teacher' role"
echo "   - Enter room ID (e.g., 'test-room-1')"
echo "   - Click 'Join Room'"
echo "   - Click 'Start Audio' (allow microphone access)"
echo ""
echo "3. Student Setup:"
echo "   - Select 'Student' role"
echo "   - Enter same room ID"
echo "   - Click 'Join Room'"
echo "   - Audio should automatically start playing"
echo ""
echo "4. Verify:"
echo "   - Teacher audio level indicator shows activity"
echo "   - Student receives teacher audio"
echo "   - Mute/unmute controls work"
echo "   - Room info shows correct participant count"
echo ""
echo "🔧 Audio Configuration:"
echo "   - Codec: Opus"
echo "   - Bitrate: 160kbps"
echo "   - Channels: 1 (mono)"
echo "   - Sample Rate: 48kHz"
echo "   - Frame Size: 20ms (low latency)"
echo ""
echo "✅ System is ready for testing!"