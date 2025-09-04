'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { 
  BookOpen, 
  Users, 
  Clock, 
  Play, 
  Search, 
  RefreshCw, 
  LogOut,
  Calendar,
  Award,
  FileText,
  Bell,
  Target,
  TrendingUp,
  User
} from 'lucide-react'

interface User {
  id: string
  name: string
  role: string
  token: string
}

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

export default function StudentDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [liveClasses, setLiveClasses] = useState<RoomClass[]>([])
  const [joinedRooms, setJoinedRooms] = useState<any[]>([])
  const [availableClasses, setAvailableClasses] = useState<RoomClass[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showRoomDetails, setShowRoomDetails] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [joinLoading, setJoinLoading] = useState<string | null>(null)
  const [attendanceData, setAttendanceData] = useState<any>({})
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('userToken')
    const userRole = localStorage.getItem('userRole')
    const userName = localStorage.getItem('userName')
    const userId = localStorage.getItem('userId')

    if (!token || userRole !== 'student') {
      router.push('/')
      return
    }

    setUser({
      id: userId || '',
      name: userName || '',
      role: userRole || '',
      token: token || ''
    })
    setLoading(false)
    fetchDashboardData()
  }, [router])

  // Socket connection for real-time updates
  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    // Connect to socket
    socketRef.current = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')
    
    // Listen for class ended events
    socketRef.current.on('class-ended', (data) => {
      console.log('Class ended, refreshing dashboard...', data)
      fetchDashboardData() // Refresh dashboard data when class ends
    })

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)
      const userId = localStorage.getItem('userId')
      
      // Get available rooms first
      const roomsResponse = await fetch('/api/rooms/student/available')
      
      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json()
        
        if (roomsData.success && roomsData.rooms.length > 0) {
          const allClasses: RoomClass[] = []
          const userJoinedRoomsData: any[] = []
          const userLiveClasses: RoomClass[] = []
          
          for (const room of roomsData.rooms) {
            try {
              const classesResponse = await fetch(`/api/room-classes?roomId=${room.roomId}`)
              if (classesResponse.ok) {
                const classesData = await classesResponse.json()
                if (classesData.success && classesData.classes) {
                  const classesWithRoomInfo = classesData.classes.map((cls: RoomClass) => ({
                    ...cls,
                    teacher: room.teacher
                  }))
                  allClasses.push(...classesWithRoomInfo)
                  
                  // Check if user has joined any class in this room
                  const userJoinedClasses = classesWithRoomInfo.filter((cls: RoomClass) => 
                    cls.attendees.some(attendee => 
                      (attendee.userId === userId) || 
                      (typeof attendee.userId === 'object' && attendee.userId._id === userId) ||
                      (attendee.userId && attendee.userId.toString() === userId)
                    )
                  )
                  
                  if (userJoinedClasses.length > 0) {
                    userJoinedRoomsData.push({
                      ...room,
                      joinedClasses: userJoinedClasses,
                      totalClasses: classesWithRoomInfo.length,
                      liveClasses: userJoinedClasses.filter((cls: RoomClass) => cls.status === 'live'),
                      upcomingClasses: userJoinedClasses.filter((cls: RoomClass) => cls.status === 'scheduled'),
                      completedClasses: userJoinedClasses.filter((cls: RoomClass) => cls.status === 'completed')
                    })
                    
                    // Add live classes from joined rooms
                    const liveClassesFromRoom = userJoinedClasses.filter((cls: RoomClass) => cls.status === 'live')
                    userLiveClasses.push(...liveClassesFromRoom)
                  }
                }
              }
            } catch (error) {
              console.error(`Error fetching classes for room ${room.roomId}:`, error)
            }
          }
          
          setAvailableClasses(allClasses)
          setJoinedRooms(userJoinedRoomsData)
          setLiveClasses(userLiveClasses)
          
          // Fetch attendance data
          if (userId) {
            await fetchAttendanceData(userId)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const fetchAttendanceData = async (userId: string) => {
    try {
      const response = await fetch(`/api/student/attendance?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAttendanceData(data.attendance)
        }
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error)
    }
  }

  const handleJoinRoom = async (roomClass: RoomClass) => {
    setJoinLoading(roomClass._id)
    
    try {
      const userId = localStorage.getItem('userId')
      
      if (!userId) {
        alert('Please log in to join a class')
        return
      }
      
      const joinResponse = await fetch(`/api/room-classes/${roomClass._id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (joinResponse.ok) {
        localStorage.setItem('currentRoomId', roomClass.roomId)
        localStorage.setItem('currentClassId', roomClass._id)
        localStorage.setItem('currentClassData', JSON.stringify(roomClass))
        
        router.push('/student-classroom')
      } else {
        const errorData = await joinResponse.json()
        alert(`Failed to join class: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error joining class:', error)
      alert('Network error. Please try again.')
    } finally {
      setJoinLoading(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('userToken')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    localStorage.removeItem('userId')
    router.push('/')
  }

  const getStatusBadge = (status: string) => {
    const configs = {
      live: { bg: 'bg-red-100', text: 'text-red-800', icon: '🔴', label: 'Live Now' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '📅', label: 'Scheduled' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅', label: 'Completed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '❌', label: 'Cancelled' }
    }
    
    const config = configs[status as keyof typeof configs] || configs.scheduled
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.icon} {config.label}
      </span>
    )
  }

  const filteredClasses = availableClasses.filter(roomClass =>
    roomClass.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    roomClass.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    roomClass.teacher?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Section */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Side - Student Name */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}!</h1>
                <p className="text-gray-600">Student Dashboard - Gyaandhara Platform</p>
              </div>
            </div>
            
            {/* Right Side - Action Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/rooms')}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Play className="w-5 h-5 inline mr-2" />
                Join Room
              </button>
              <button
                onClick={handleLogout}
                className="bg-white text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
              >
                <LogOut className="w-5 h-5 inline mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Section - Left Side (3 columns) */}
          <div className="lg:col-span-3 space-y-8">
            {/* Live Classes Section */}
            {liveClasses.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-red-800 mb-4 flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
                  🔴 Live Classes - Join Now!
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveClasses.map((roomClass) => (
                    <div key={roomClass._id} className="bg-white rounded-xl p-4 border border-red-200 shadow-md">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{roomClass.subject}</h3>
                          <p className="text-sm text-gray-600">{roomClass.topic}</p>
                          <p className="text-xs text-red-600 font-medium">Room: {roomClass.roomId}</p>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                          🔴 LIVE
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleJoinRoom(roomClass)}
                        disabled={joinLoading === roomClass._id}
                        className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-all font-medium"
                      >
                        {joinLoading === roomClass._id ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Joining...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <Play className="w-4 h-4" />
                            <span>Join Live Class</span>
                          </div>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My Joined Rooms Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <BookOpen className="w-6 h-6 mr-2 text-blue-600" />
                My Joined Rooms
              </h2>
              
              {joinedRooms.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600">No joined rooms found</p>
                  <p className="text-sm text-gray-500">Join a room to see your enrolled classes here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {joinedRooms.map((room) => (
                    <div key={room.roomId} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{room.className}</h3>
                          <p className="text-sm text-gray-600">{room.subject}</p>
                          <p className="text-xs text-blue-600 font-medium">Room: {room.roomId}</p>
                        </div>
                        {room.liveClasses.length > 0 && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full animate-pulse">
                            🔴 LIVE
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-600 mb-3">
                        <span>Total: {room.totalClasses} classes</span>
                        <span>Joined: {room.joinedClasses.length}</span>
                        <span>Completed: {room.completedClasses.length}</span>
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedRoom(room)
                          setShowRoomDetails(true)
                        }}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-all text-sm font-medium"
                      >
                        View All Lectures ({room.joinedClasses.length})
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Some Details Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Bell className="w-6 h-6 mr-2 text-yellow-600" />
                Announcements & Updates
              </h2>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-medium text-yellow-800">Welcome to Gyaandhara Platform!</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Start your learning journey with interactive classes, real-time collaboration, and expert teachers.
                      </p>
                      <p className="text-xs text-yellow-600 mt-2">Posted today</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-medium text-blue-800">New Features Available</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Enhanced whiteboard tools, improved audio quality, and better mobile experience.
                      </p>
                      <p className="text-xs text-blue-600 mt-2">Posted 2 days ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Widgets Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Total Attendance Widget */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Attendance</h3>
                <Target className="w-6 h-6 text-green-600" />
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {attendanceData.overallPercentage || 0}%
                </div>
                <p className="text-sm text-gray-600">Overall Attendance</p>
                
                <div className="mt-4 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${attendanceData.overallPercentage || 0}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>0%</span>
                  <span>100%</span>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-50 p-2 rounded">
                    <div className="font-bold text-green-700">{attendanceData.classesAttended || 0}</div>
                    <div className="text-green-600">Attended</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <div className="font-bold text-red-700">{attendanceData.classesAbsent || 0}</div>
                    <div className="text-red-600">Absent</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quizzes Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Quizzes</h3>
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div>
                    <p className="font-medium text-purple-900">Math Quiz #3</p>
                    <p className="text-xs text-purple-600">Due: Tomorrow</p>
                  </div>
                  <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                    Take Quiz
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-700">Science Quiz #2</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <span className="text-green-600 text-sm font-medium">95%</span>
                </div>
              </div>
              
              <button className="w-full mt-4 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium">
                View All Quizzes
              </button>
            </div>

            {/* More Options Widget */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              
              <div className="space-y-3">
                <button className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700 font-medium">Assignments</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700 font-medium">Schedule</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700 font-medium">Notifications</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <Award className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700 font-medium">Achievements</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Available Classes Section */}
        <div className="mt-8 bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Search className="w-6 h-6 mr-2 text-blue-600" />
              Browse Available Classes
            </h2>
            
            <button
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by subject, topic, or teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              />
            </div>
          </div>

          {/* Classes Grid */}
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">No classes available</h3>
              <p className="text-gray-500">Check back later for new classes or adjust your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((roomClass) => (
                <div key={roomClass._id} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-blue-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {roomClass.subject} - Lecture {roomClass.lectureNumber}
                      </h3>
                      <p className="text-sm text-gray-600">{roomClass.topic}</p>
                    </div>
                    {getStatusBadge(roomClass.status)}
                  </div>

                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
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
                        <span>Students</span>
                      </span>
                      <span className="font-medium">{roomClass.attendees.length}</span>
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
                    onClick={() => handleJoinRoom(roomClass)}
                    disabled={joinLoading === roomClass._id || roomClass.status === 'completed' || roomClass.status === 'cancelled'}
                    className={`w-full py-3 rounded-xl font-medium transition-all duration-300 ${
                      roomClass.status === 'completed' || roomClass.status === 'cancelled'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {joinLoading === roomClass._id ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Joining...</span>
                      </div>
                    ) : roomClass.status === 'completed' ? (
                      '✅ Completed'
                    ) : roomClass.status === 'cancelled' ? (
                      '❌ Cancelled'
                    ) : roomClass.status === 'live' ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Play className="w-4 h-4" />
                        <span>Join Live</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <BookOpen className="w-4 h-4" />
                        <span>Join Class</span>
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Room Details Modal */}
      {showRoomDetails && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedRoom.className}</h2>
                  <p className="text-gray-600">{selectedRoom.subject} - Room: {selectedRoom.roomId}</p>
                </div>
                <button
                  onClick={() => setShowRoomDetails(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">All Lectures in this Room</h3>
              
              <div className="space-y-4">
                {selectedRoom.joinedClasses.map((roomClass: RoomClass) => (
                  <div key={roomClass._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">
                          Lecture {roomClass.lectureNumber}: {roomClass.topic}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">{roomClass.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>📅 {new Date(roomClass.scheduledDate).toLocaleDateString()}</span>
                          <span>👥 {roomClass.attendees.length} students</span>
                          <span>⏱️ {roomClass.duration} min</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        {getStatusBadge(roomClass.status)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        <span>Teacher: {roomClass.teacher?.name || 'Not assigned'}</span>
                      </div>
                      
                      <button
                        onClick={() => {
                          setShowRoomDetails(false)
                          handleJoinRoom(roomClass)
                        }}
                        disabled={joinLoading === roomClass._id || roomClass.status === 'completed' || roomClass.status === 'cancelled'}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          roomClass.status === 'completed' || roomClass.status === 'cancelled'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : roomClass.status === 'live'
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {joinLoading === roomClass._id ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            <span>Joining...</span>
                          </div>
                        ) : roomClass.status === 'completed' ? (
                          '✅ View Recording'
                        ) : roomClass.status === 'cancelled' ? (
                          '❌ Cancelled'
                        ) : roomClass.status === 'live' ? (
                          <div className="flex items-center space-x-2">
                            <Play className="w-3 h-3" />
                            <span>Join Live</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <BookOpen className="w-3 h-3" />
                            <span>Enter Class</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
