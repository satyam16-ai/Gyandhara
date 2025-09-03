'use client'

import { useState, useEffect } from 'react'
import WhiteBoard from '@/components/WhiteBoard'
import AudioControls from '@/components/AudioControls'
import StudentList from '@/components/StudentList'
import BandwidthMonitor from '@/components/BandwidthMonitor'
import { WhiteboardProvider, useWhiteboard } from '../contexts/WhiteboardContext'

interface TeacherDashboardProps {
  roomId?: string
  classId?: string
  userId?: string
  userToken?: string
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  roomId,
  classId,
  userId,
  userToken
}) => {
  return (
    <WhiteboardProvider>
      <TeacherDashboardContent 
        roomId={roomId}
        classId={classId}
        userId={userId}
        userToken={userToken}
      />
    </WhiteboardProvider>
  )
}

const TeacherDashboardContent: React.FC<TeacherDashboardProps> = ({
  roomId,
  classId,
  userId,
  userToken
}) => {
  const { connect, disconnect, isConnected, connectedUsers, socket } = useWhiteboard()
  const [isTeaching, setIsTeaching] = useState(false)
  const [students, setStudents] = useState<Array<{
    id: string
    name: string
    isOnline: boolean
    handRaised: boolean
    bandwidthMode: 'ultra-low' | 'low' | 'normal'
  }>>([])
  const [bandwidthSettings, setBandwidthSettings] = useState({
    mode: 'normal' as 'ultra-low' | 'low' | 'normal',
    maxAudioBitrate: 64,
    strokeSimplification: false,
    autoCompress: true
  })
  const [showEndClassConfirm, setShowEndClassConfirm] = useState(false)

  // Update students when connected users change
  useEffect(() => {
    const studentUsers = connectedUsers.filter(user => user.role === 'student')
    setStudents(studentUsers.map(user => ({
      id: user.id,
      name: user.name,
      isOnline: true,
      handRaised: false,
      bandwidthMode: 'normal'
    })))
  }, [connectedUsers])

  const handleStartClass = async () => {
    setIsTeaching(true)
    
    // Connect to whiteboard when class starts
    if (roomId && userId && userToken) {
      setTimeout(() => {
        connect(roomId, userId, userToken, true)
      }, 500)
    }
  }

  const handleStopClass = async () => {
    try {
      const currentClassId = localStorage.getItem('currentClassId')
      const userId = localStorage.getItem('userId')
      
      if (currentClassId && userId) {
        console.log('🛑 Stopping class:', currentClassId)
        
        // Call the API to end the class
        const response = await fetch(`/api/room-classes/${currentClassId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('✅ Class ended successfully:', result)
          
          // Notify students via whiteboard context before disconnecting
          if (socket && isConnected) {
            socket.emit('teacher-ended-class', {
              classId: currentClassId,
              message: 'The teacher has ended this class session.'
            })
          }
          
          // Clear local storage
          localStorage.removeItem('currentClassId')
          localStorage.removeItem('currentTeachingClass')
          localStorage.removeItem('teacherRoomId')
          localStorage.removeItem('teacherClassId')
          
          // Disconnect from whiteboard
          disconnect()
          
          // Update local state
          setIsTeaching(false)
          
          // Redirect to teacher dashboard after successful class end
          setTimeout(() => {
            window.location.href = '/teacher-dashboard'
          }, 1000)
        } else {
          const errorData = await response.json()
          console.error('❌ Failed to end class:', errorData)
          alert(`Failed to end class: ${errorData.error || 'Unknown error'}`)
        }
      } else {
        // If no class ID, just disconnect and stop
        disconnect()
        setIsTeaching(false)
        
        // Clear any remaining storage
        localStorage.removeItem('currentTeachingClass')
        localStorage.removeItem('teacherRoomId')
        localStorage.removeItem('teacherClassId')
        
        alert('Teaching session stopped')
      }
    } catch (error) {
      console.error('💥 Error stopping class:', error)
      alert('Failed to stop class. Please try again.')
    }
  }

  // Auto-connect if already teaching and whiteboard context is available
  useEffect(() => {
    if (isTeaching && !isConnected && roomId && userId && userToken) {
      console.log('🔄 Auto-reconnecting to whiteboard...', { roomId, userId })
      connect(roomId, userId, userToken, true) // true for teacher
    }
  }, [isTeaching, isConnected, roomId, userId, userToken, connect])

  // Auto-start teaching if coming from an active class
  useEffect(() => {
    const currentTeachingClass = localStorage.getItem('currentTeachingClass')
    if (currentTeachingClass && !isTeaching && roomId && userId && userToken) {
      console.log('🎓 Auto-starting teaching session for active class...')
      setIsTeaching(true)
      
      // Auto-connect to whiteboard
      setTimeout(() => {
        connect(roomId, userId, userToken, true)
        
        // Focus on whiteboard
        setTimeout(() => {
          const whiteboardElement = document.querySelector('[data-whiteboard]')
          if (whiteboardElement) {
            whiteboardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 1000)
      }, 500)
    }
  }, [roomId, userId, userToken, isTeaching, connect])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Left Panel - Whiteboard */}
          <div className="flex-1 p-4">
            {/* Start/Stop controls overlay */}
            <div className="absolute top-4 right-4 z-10 flex items-center space-x-4">
              <BandwidthMonitor settings={bandwidthSettings} />
              
              {!isTeaching ? (
                <button
                  onClick={handleStartClass}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg"
                >
                  🎓 Start Teaching
                </button>
              ) : (
                <button
                  onClick={() => setShowEndClassConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg"
                >
                  ⏹️ End Class
                </button>
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow-sm h-full" data-whiteboard>
              <WhiteBoard
                isTeacher={true}
                bandwidthMode={bandwidthSettings.mode}
                roomId={roomId}
                classId={classId}
              />
            </div>
          </div>

          {/* Right Panel - Controls & Student List */}
          <div className="w-80 p-4 space-y-4">
            {/* Real-time Status */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Live Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Whiteboard</span>
                  <span className={`flex items-center text-sm ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Teaching</span>
                  <span className={`text-sm font-medium ${isTeaching ? 'text-green-600' : 'text-gray-400'}`}>
                    {isTeaching ? 'Active' : 'Stopped'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Students</span>
                  <span className="text-sm font-medium">{students.length} connected</span>
                </div>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Voice Controls</h3>
              <AudioControls
                isTeaching={isTeaching}
                bandwidthMode={bandwidthSettings.mode}
              />
            </div>

            {/* Bandwidth Settings */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Bandwidth Mode</h3>
              <select
                value={bandwidthSettings.mode}
                onChange={(e) => setBandwidthSettings(prev => ({
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
                Automatically adjusts based on student connections
              </p>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-lg shadow-sm p-4 flex-1">
              <h3 className="font-semibold text-gray-800 mb-3">
                Students ({students.length})
              </h3>
              <StudentList students={students} />
            </div>
          </div>
        </div>

        {/* End Class Confirmation Popup */}
        {showEndClassConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center">
              <div className="text-4xl mb-4">⏹️</div>
              <h3 className="text-xl font-bold mb-3">End Class?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to end this class? All students will be disconnected and returned to the classroom selection.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowEndClassConfirm(false)
                    handleStopClass()
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Yes, End Class
                </button>
                <button
                  onClick={() => setShowEndClassConfirm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

export default TeacherDashboard
