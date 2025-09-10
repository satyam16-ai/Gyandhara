'use client'

import React, { useState, useEffect } from 'react'
import WebRTCAudioBroadcast from '../../src/components/WebRTCAudioBroadcast'
import { io } from 'socket.io-client'

export default function WebRTCTest() {
  const [socket, setSocket] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Connect to real Socket.IO server for WebRTC signaling
    const socketIO = io('http://localhost:8080', {
      transports: ['websocket']
    })

    socketIO.on('connect', () => {
      console.log('📡 Connected to signaling server')
      setIsConnected(true)
    })

    socketIO.on('disconnect', () => {
      console.log('📡 Disconnected from signaling server')
      setIsConnected(false)
    })

    setSocket(socketIO)

    return () => {
      socketIO.disconnect()
    }
  }, [])

  if (!socket) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <p>Initializing WebRTC test...</p>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🎙️ WebRTC Audio Broadcast Test
          </h1>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            {isConnected ? 'Connected to Signaling Server' : 'Disconnected'}
          </div>
          
          <div className="mt-4 text-gray-600 max-w-3xl mx-auto">
            <p className="mb-4">
              This page tests the WebRTC-based audio broadcast system with:
            </p>
            <ul className="list-disc list-inside text-left space-y-2">
              <li><strong>Real-time WebRTC connections</strong> with Opus codec for high-quality, low-latency audio</li>
              <li><strong>Unidirectional streaming</strong> from teacher to students only</li>
              <li><strong>Socket.IO signaling</strong> for SDP offer/answer exchange and ICE candidate handling</li>
              <li><strong>Adaptive bitrates</strong> based on bandwidth mode (16k-48kbps)</li>
              <li><strong>Connection state monitoring</strong> with automatic reconnection attempts</li>
              <li><strong>Audio level visualization</strong> for teacher microphone input</li>
            </ul>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Teacher Interface */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
              <h2 className="text-xl font-semibold text-gray-800">Teacher Interface</h2>
            </div>
            <WebRTCAudioBroadcast
              socket={socket}
              isTeacher={true}
              roomId="webrtc-test-room"
              userId="teacher-webrtc-1"
              userName="Test Teacher"
              bandwidthMode="normal"
              className="mb-4"
            />
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Click "Start Broadcasting" to begin audio stream</p>
              <p>• Audio level shows microphone input volume</p>
              <p>• Connected students counter shows active listeners</p>
              <p>• Uses real WebRTC peer connections</p>
            </div>
          </div>

          {/* Student Interface */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
              <h2 className="text-xl font-semibold text-gray-800">Student Interface</h2>
            </div>
            <WebRTCAudioBroadcast
              socket={socket}
              isTeacher={false}
              roomId="webrtc-test-room"
              userId="student-webrtc-1"
              userName="Test Student"
              bandwidthMode="normal"
              className="mb-4"
            />
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Automatically connects to teacher's broadcast</p>
              <p>• Shows connection status (connecting/connected)</p>
              <p>• Toggle audio on/off to control playback</p>
              <p>• Receives high-quality Opus audio stream</p>
            </div>
          </div>
        </div>

        {/* Multiple Students Test */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-4 h-4 rounded-full bg-purple-500 mr-2"></div>
            <h2 className="text-xl font-semibold text-gray-800">Additional Students</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {[2, 3, 4].map(num => (
              <div key={num} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">Student {num}</h3>
                <WebRTCAudioBroadcast
                  socket={socket}
                  isTeacher={false}
                  roomId="webrtc-test-room"
                  userId={`student-webrtc-${num}`}
                  userName={`Test Student ${num}`}
                  bandwidthMode={num === 2 ? 'ultra-low' : num === 3 ? 'low' : 'normal'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Technical Information */}
        <div className="mt-8 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🔧 Technical Details</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium mb-2 text-blue-300">WebRTC Configuration</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• Opus codec with configurable bitrates</li>
                <li>• STUN servers for NAT traversal</li>
                <li>• Unidirectional audio (sendonly/recvonly)</li>
                <li>• Connection state monitoring</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-green-300">Bandwidth Modes</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• Ultra-low: 16kbps, 16kHz sampling</li>
                <li>• Low: 24kbps, 24kHz sampling</li>
                <li>• Normal: 48kbps, 48kHz sampling</li>
                <li>• Automatic adaptation based on network</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">📋 Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700">
            <li>Ensure your backend server is running on port 8080</li>
            <li>Allow microphone access when prompted</li>
            <li>Start broadcasting from the Teacher interface</li>
            <li>Students should automatically connect and receive audio</li>
            <li>Check browser console for WebRTC connection logs</li>
            <li>Test different bandwidth modes and network conditions</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
