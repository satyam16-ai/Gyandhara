'use client'

import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

export default function WhiteboardSyncTest() {
  const [teacherSocket, setTeacherSocket] = useState<Socket | null>(null)
  const [studentSocket, setStudentSocket] = useState<Socket | null>(null)
  const [teacherLogs, setTeacherLogs] = useState<string[]>([])
  const [studentLogs, setStudentLogs] = useState<string[]>([])
  const [teacherRoomId, setTeacherRoomId] = useState('TEST123')
  const [studentRoomId, setStudentRoomId] = useState('TEST123')
  const [teacherUserId, setTeacherUserId] = useState('68c5b86f3b5805327f358c36')
  const [studentUserId, setStudentUserId] = useState('68c5b86f3b5805327f358c46')
  const [drawEnabled, setDrawEnabled] = useState(false)

  const log = (panel: 'teacher' | 'student', message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    
    if (panel === 'teacher') {
      setTeacherLogs(prev => [...prev, logMessage])
    } else {
      setStudentLogs(prev => [...prev, logMessage])
    }
  }

  const connectTeacher = () => {
    log('teacher', '🎓 Connecting as teacher...')
    
    const socket = io('http://localhost:8080')
    setTeacherSocket(socket)
    
    socket.on('connect', () => {
      log('teacher', '✅ Connected to server')
      socket.emit('join-room', {
        roomId: teacherRoomId,
        userId: teacherUserId,
        userToken: 'test-token'
      })
    })
    
    socket.on('room-joined', (data) => {
      log('teacher', `🏠 Joined room: ${data.roomId}`)
      log('teacher', `👤 User role: ${data.user.role} (isTeacher: ${data.user.isTeacher})`)
      setDrawEnabled(true)
    })
    
    socket.on('error', (error) => {
      log('teacher', `❌ Error: ${error.message}`)
    })
    
    socket.on('disconnect', () => {
      log('teacher', '❌ Disconnected')
      setDrawEnabled(false)
    })
  }

  const connectStudent = () => {
    log('student', '👨‍🎓 Connecting as student...')
    
    const socket = io('http://localhost:8080')
    setStudentSocket(socket)
    
    socket.on('connect', () => {
      log('student', '✅ Connected to server')
      socket.emit('join-room', {
        roomId: studentRoomId,
        userId: studentUserId,
        userToken: 'test-token'
      })
    })
    
    socket.on('room-joined', (data) => {
      log('student', `🏠 Joined room: ${data.roomId}`)
      log('student', `👤 User role: ${data.user.role} (isTeacher: ${data.user.isTeacher})`)
      log('student', `📚 Existing drawings: ${data.currentState.drawingElements?.length || 0}`)
    })
    
    socket.on('drawing-element-update', (data) => {
      log('student', `🎨 Received drawing: ${data.action} - ${data.element?.type} (ID: ${data.element?.id})`)
    })
    
    socket.on('drawing-elements-update', (data) => {
      log('student', `🎨 Bulk update: ${data.action}`)
    })
    
    socket.on('error', (error) => {
      log('student', `❌ Error: ${error.message}`)
    })
    
    socket.on('disconnect', () => {
      log('student', '❌ Disconnected')
    })
  }

  const drawSomething = () => {
    if (!teacherSocket) {
      log('teacher', '❌ Not connected')
      return
    }
    
    const drawingElement = {
      id: 'test-' + Date.now(),
      type: 'freehand',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      points: [100, 100, 150, 150],
      timestamp: Date.now(),
      options: {
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent'
      }
    }
    
    log('teacher', `📝 Sending drawing element: ${drawingElement.id}`)
    teacherSocket.emit('drawing-element', drawingElement)
  }

  const clearBoard = () => {
    if (!teacherSocket) {
      log('teacher', '❌ Not connected')
      return
    }
    
    log('teacher', '🧹 Clearing board...')
    teacherSocket.emit('drawing-elements-update', {
      action: 'clear'
    })
  }

  useEffect(() => {
    return () => {
      teacherSocket?.disconnect()
      studentSocket?.disconnect()
    }
  }, [teacherSocket, studentSocket])

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Whiteboard Sync Test</h1>
      
      <div className="flex gap-6 max-w-6xl mx-auto">
        {/* Teacher Panel */}
        <div className="flex-1 border-2 border-green-500 rounded-lg p-4 bg-white">
          <h3 className="text-xl font-semibold mb-4 text-green-600">Teacher Panel</h3>
          
          <div className="space-y-3 mb-4">
            <input
              type="text"
              value={teacherRoomId}
              onChange={(e) => setTeacherRoomId(e.target.value)}
              placeholder="Room ID (e.g., ABCD1234)"
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              value={teacherUserId}
              onChange={(e) => setTeacherUserId(e.target.value)}
              placeholder="Teacher User ID"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="space-x-2 mb-4">
            <button
              onClick={connectTeacher}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Connect as Teacher
            </button>
            <button
              onClick={drawSomething}
              disabled={!drawEnabled}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              Draw Something
            </button>
            <button
              onClick={clearBoard}
              disabled={!drawEnabled}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              Clear Board
            </button>
          </div>
          
          <div className="bg-gray-50 p-3 h-80 overflow-y-auto text-xs border rounded">
            {teacherLogs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
        
        {/* Student Panel */}
        <div className="flex-1 border-2 border-blue-500 rounded-lg p-4 bg-white">
          <h3 className="text-xl font-semibold mb-4 text-blue-600">Student Panel</h3>
          
          <div className="space-y-3 mb-4">
            <input
              type="text"
              value={studentRoomId}
              onChange={(e) => setStudentRoomId(e.target.value)}
              placeholder="Room ID (e.g., ABCD1234)"
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              value={studentUserId}
              onChange={(e) => setStudentUserId(e.target.value)}
              placeholder="Student User ID"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="space-x-2 mb-4">
            <button
              onClick={connectStudent}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Connect as Student
            </button>
          </div>
          
          <div className="bg-gray-50 p-3 h-80 overflow-y-auto text-xs border rounded">
            {studentLogs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}