'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Clock, Play, BookOpen, Search, RefreshCw } from 'lucide-react'

interface RoomClass {
  _id: string
  roomId: string
  subject: string
  lectureNumber: number
  topic: string
  teacherId: string
  teacher?: {
    _id: string
    name: string
    email: string
  }
  scheduledDate: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  attendees: Array<{
    userId: string
    name: string
    joinedAt: string
  }>
  sessionId?: string
  startedAt?: string
  endedAt?: string
  duration?: number
  materials?: Array<{
    type: 'document' | 'link' | 'video'
    title: string
    url: string
    uploadedAt: string
  }>
  stats?: {
    totalAttendees: number
    averageAttendanceTime: number
    peakAttendance: number
  }
  createdAt: string
  updatedAt: string
}

const StudentDashboard = () => {
  const [availableClasses, setAvailableClasses] = useState<RoomClass[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [joinLoading, setJoinLoading] = useState<string | null>(null)
  const [liveClassNotification, setLiveClassNotification] = useState<RoomClass | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchAvailableClasses()
    
    // Set up interval to check for live classes every 10 seconds
    const interval = setInterval(() => {
      fetchAvailableClasses()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchAvailableClasses = async () => {
    try {
      setLoading(true)
      
      // Get available rooms first, then fetch classes for each room
      const roomsResponse = await fetch('/api/rooms/student/available')
      
      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json()
        
        if (roomsData.success && roomsData.rooms.length > 0) {
          // Fetch classes for all available rooms
          const allClasses: RoomClass[] = []
          
          for (const room of roomsData.rooms) {
            try {
              const classesResponse = await fetch(`/api/room-classes?roomId=${room.roomId}`)
              if (classesResponse.ok) {
                const classesData = await classesResponse.json()
                if (classesData.success && classesData.classes) {
                  // Add room and teacher info to each class
                  const classesWithRoomInfo = classesData.classes.map((cls: RoomClass) => ({
                    ...cls,
                    teacher: room.teacher
                  }))
                  allClasses.push(...classesWithRoomInfo)
                }
              }
            } catch (error) {
              console.error(`Error fetching classes for room ${room.roomId}:`, error)
            }
          }
          
          setAvailableClasses(allClasses)
          
          // Check for newly live classes and show notification
          const liveClasses = allClasses.filter(cls => cls.status === 'live')
          if (liveClasses.length > 0 && !liveClassNotification) {
            const newestLiveClass = liveClasses.sort((a, b) => 
              new Date(b.startedAt || b.scheduledDate).getTime() - new Date(a.startedAt || a.scheduledDate).getTime()
            )[0]
            setLiveClassNotification(newestLiveClass)
          }
        } else {
          setAvailableClasses([])
        }
      } else {
        console.error('Failed to fetch available rooms')
        setAvailableClasses([])
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      setAvailableClasses([])
    } finally {
      setLoading(false)
    }
  }

  const handleJoinClass = async (roomClass: RoomClass) => {
    setJoinLoading(roomClass._id)
    
    try {
      // Get current user info from localStorage
      const userId = localStorage.getItem('userId')
      const userName = localStorage.getItem('userName')
      
      if (!userId || !userName) {
        console.error('User not authenticated')
        alert('Please log in to join a class')
        return
      }
      
      console.log('🎯 Joining class:', roomClass._id, 'for user:', userId)
      
      // First, join the class (for attendance tracking)
      const joinResponse = await fetch(`/api/room-classes/${roomClass._id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
        }),
      })

      console.log('📡 Join response status:', joinResponse.status)
      
      if (joinResponse.ok) {
        const joinData = await joinResponse.json()
        console.log('✅ Successfully joined class:', joinData)
        
        // Show appropriate message for joining vs rejoining
        if (joinData.isRejoining) {
          console.log('🔄 Rejoined existing class session')
        }
        
        // Store class info and navigate to the classroom
        localStorage.setItem('currentRoomId', roomClass.roomId)
        localStorage.setItem('currentClassId', roomClass._id)
        localStorage.setItem('currentClassData', JSON.stringify(roomClass))
        
        // Clear the notification
        setLiveClassNotification(null)
        
        // Navigate to the student classroom with whiteboard
        router.push('/student-classroom')
      } else {
        const errorData = await joinResponse.json()
        console.error('❌ Failed to join class:', errorData)
        
        // More user-friendly error message
        const errorMessage = errorData.error || 'Unknown error'
        if (errorMessage.includes('already joined')) {
          alert('You have already joined this class. Redirecting to classroom...')
          // Still allow navigation since they want to rejoin
          localStorage.setItem('currentRoomId', roomClass.roomId)
          localStorage.setItem('currentClassId', roomClass._id)
          localStorage.setItem('currentClassData', JSON.stringify(roomClass))
          setLiveClassNotification(null)
          router.push('/student-classroom')
        } else {
          alert(`Failed to join class: ${errorMessage}`)
        }
      }
    } catch (error) {
      console.error('💥 Error joining class:', error)
      alert('Network error. Please check your connection and try again.')
    } finally {
      setJoinLoading(null)
    }
  }

  const getStatusBadge = (status: string, attendeeCount: number) => {
    const configs = {
      live: { bg: 'bg-green-100', text: 'text-green-800', icon: '🟢', label: 'Live Now' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '�', label: 'Scheduled' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '✅', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌', label: 'Cancelled' }
    }
    
    const config = configs[status as keyof typeof configs] || configs.scheduled
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
        {config.icon} {config.label}
      </span>
    )
  }

  const filteredClasses = availableClasses.filter(roomClass =>
    roomClass.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    roomClass.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    roomClass.teacher?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `Lecture ${roomClass.lectureNumber}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Live Class Notification */}
      {liveClassNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white p-4 rounded-2xl shadow-2xl animate-bounce">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <div>
              <p className="font-bold">🔴 Class is LIVE!</p>
              <p className="text-sm">{liveClassNotification.subject} - {liveClassNotification.topic}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleJoinClass(liveClassNotification)}
                className="bg-white text-green-500 px-3 py-1 rounded-lg font-bold text-sm hover:bg-gray-100"
              >
                Join Now
              </button>
              <button
                onClick={() => setLiveClassNotification(null)}
                className="text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
            Available Classes
          </h1>
          <p className="text-gray-600 text-lg">
            Join live classes and interactive learning sessions
          </p>
        </div>

        {/* Search */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by subject, topic, lecture number, or teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-colors bg-white/70"
              />
            </div>
            <button
              onClick={fetchAvailableClasses}
              disabled={loading}
              className="px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pulse">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-600 font-medium">Loading available classes...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No classes available</h3>
            <p className="text-gray-600 mb-6">Check back later for new classes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((roomClass) => (
              <div key={roomClass._id} className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:scale-105">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {roomClass.subject} - Lecture {roomClass.lectureNumber}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{roomClass.topic}</p>
                    <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
                      {roomClass.subject}
                    </span>
                  </div>
                  {getStatusBadge(roomClass.status, roomClass.attendees.length)}
                </div>

                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {roomClass.teacher?.name ? roomClass.teacher.name.charAt(0) : 'T'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {roomClass.teacher?.name || 'Teacher'}
                    </p>
                    <p className="text-xs text-gray-600">Instructor</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>Attendees</span>
                    </span>
                    <span className="font-medium">
                      {roomClass.attendees.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Scheduled</span>
                    </span>
                    <span className="text-gray-800">
                      {new Date(roomClass.scheduledDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinClass(roomClass)}
                  disabled={joinLoading === roomClass._id || roomClass.status === 'completed' || roomClass.status === 'cancelled'}
                  className={`w-full py-3 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                    roomClass.status === 'completed' || roomClass.status === 'cancelled'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600'
                  }`}
                >
                  {joinLoading === roomClass._id ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Joining...</span>
                    </div>
                  ) : roomClass.status === 'completed' ? (
                    '✅ Class Completed'
                  ) : roomClass.status === 'cancelled' ? (
                    '❌ Class Cancelled'
                  ) : roomClass.status === 'live' ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Play className="w-4 h-4" />
                      <span>Join Live Class</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <BookOpen className="w-4 h-4" />
                      <span>View Class</span>
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentDashboard
