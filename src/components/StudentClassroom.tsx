'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Clock, LogOut, Mic, MicOff, Hand, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react'
import FullWhiteBoard from './FullWhiteBoard'
import RealtimeChat from './RealtimeChat'
import StudentList from './StudentList'
import BandwidthMonitor from './BandwidthMonitor'
import { WhiteboardProvider, useWhiteboard } from '../contexts/WhiteboardContext'

interface User {
  id: string
  name: string
  role: string
  token: string
}

interface ClassData {
  _id: string
  roomId: string
  subject: string
  lectureNumber: number
  topic: string
  teacher: {
    _id: string
    name: string
    email: string
  }
  status: string
  attendees: Array<{
    userId: string
    name: string
    joinedAt: string
  }>
}

interface StudentClassroomProps {
  user: User
  classData: ClassData
  onLeaveClass: () => void
}

// Student Classroom Content Component
function StudentClassroomContent({ user, classData, onLeaveClass }: StudentClassroomProps) {
  const [bandwidthSettings, setBandwidthSettings] = useState({
    mode: 'normal' as 'ultra-low' | 'low' | 'normal',
    maxVideoQuality: '720p',
    audioQuality: 'medium',
    maxAudioBitrate: 64,
    strokeSimplification: false,
    autoCompress: true
  })
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showStudentList, setShowStudentList] = useState(true)
  const [students, setStudents] = useState(
    classData.attendees.map(attendee => ({
      id: attendee.userId,
      name: attendee.name,
      isOnline: true,
      handRaised: false,
      bandwidthMode: 'normal' as 'ultra-low' | 'low' | 'normal'
    }))
  )
  const [classStartTime] = useState(new Date())
  const [elapsedTime, setElapsedTime] = useState(0)

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - classStartTime.getTime()) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(timer)
  }, [classStartTime])
  
  const { isConnected, connect, disconnect } = useWhiteboard()

  // Connect to whiteboard when component mounts
  useEffect(() => {
    if (user.id && user.token && classData.roomId) {
      connect(classData.roomId, user.id, user.token, false) // false for student (not teacher)
    }

    return () => {
      disconnect()
    }
  }, [user.id, user.token, classData.roomId, connect, disconnect])

  const handleRaiseHand = () => {
    setHandRaised(!handRaised)
    // TODO: Send hand raise status to server
  }

  const handleToggleAudio = () => {
    setIsAudioMuted(!isAudioMuted)
  }

  const formatElapsedTime = () => {
    const minutes = Math.floor(elapsedTime / 60)
    const seconds = elapsedTime % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {classData.subject} - Lecture {classData.lectureNumber}
              </h1>
              <p className="text-gray-600">{classData.topic}</p>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-sm text-blue-600">Room: {classData.roomId}</p>
                <p className="text-sm text-gray-500">Teacher: {classData.teacher.name}</p>
                {isConnected && (
                  <span className="flex items-center text-green-600 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    Whiteboard Live
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Class Timer */}
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-mono">{formatElapsedTime()}</span>
            </div>

            <BandwidthMonitor settings={bandwidthSettings} />

            {/* Leave Class Button */}
            <button
              onClick={onLeaveClass}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Class</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Whiteboard */}
        <div className="flex-1">
          <FullWhiteBoard
            isTeacher={false}
            bandwidthMode={bandwidthSettings.mode}
            roomId={classData.roomId}
            classId={classData._id}
            teacherName={classData.teacher?.name || 'Teacher'}
            lectureTitle={`Lecture ${classData.lectureNumber}`}
            subject={classData.subject}
            userId={user.id}
            userName={user.name || 'Student'}
          />
        </div>

        {/* Right Panel - Controls & Info */}
        <div className="w-80 p-4 space-y-4 overflow-y-auto">
          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Live Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Whiteboard</span>
                <span className={`flex items-center text-sm ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  {isConnected ? 'Connected' : 'Connecting...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Class Status</span>
                <span className="text-sm font-medium text-green-600">Live</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Participants</span>
                <span className="text-sm font-medium">{students.length} students</span>
              </div>
            </div>
          </div>

          {/* Student Controls */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Student Controls</h3>
            <div className="space-y-3">
              {/* Audio Control */}
              <button
                onClick={handleToggleAudio}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  isAudioMuted 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isAudioMuted ? 'Microphone Off' : 'Microphone On'}</span>
              </button>

              {/* Hand Raise */}
              <button
                onClick={handleRaiseHand}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  handRaised 
                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Hand className="w-4 h-4" />
                <span>{handRaised ? 'Hand Raised' : 'Raise Hand'}</span>
              </button>

              {/* Chat Toggle */}
              <button
                onClick={() => setShowChat(!showChat)}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  showChat 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{showChat ? 'Hide Chat' : 'Show Chat'}</span>
              </button>
            </div>
          </div>

          {/* Audio Status */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Audio Status</h3>
            <div className="flex items-center space-x-2">
              <Mic className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">Listening to teacher</span>
            </div>
          </div>

          {/* Bandwidth Settings */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Connection Quality</h3>
            <select
              value={bandwidthSettings.mode}
              onChange={(e) => setBandwidthSettings((prev: any) => ({
                ...prev,
                mode: e.target.value as 'ultra-low' | 'low' | 'normal'
              }))}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="ultra-low">Ultra Low (Text + Audio)</option>
              <option value="low">Low (Basic Canvas)</option>
              <option value="normal">Normal (Full Features)</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Adjust based on your internet speed
            </p>
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Chat</h3>
              <p className="text-gray-600 text-sm">Chat functionality will be available in the whiteboard.</p>
              {/* 
              <RealtimeChat
                socket={socket}
                currentUserId={user.id}
                currentUserName={user.name || 'Student'}
                isTeacher={false}
                connectedUsers={students}
                isVisible={true}
                onToggleVisibility={() => setShowChat(false)}
              />
              */}
            </div>
          )}

          {/* Student List */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">
                Participants ({students.length})
              </h3>
              <button
                onClick={() => setShowStudentList(!showStudentList)}
                className="text-gray-500 hover:text-gray-700"
              >
                {showStudentList ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
            {showStudentList && (
              <StudentList students={students} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Main StudentClassroom Component with WhiteboardProvider
export default function StudentClassroom(props: StudentClassroomProps) {
  return (
    <WhiteboardProvider>
      <StudentClassroomContent {...props} />
    </WhiteboardProvider>
  )
}
