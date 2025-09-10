'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BookOpen, 
  Users, 
  Clock, 
  Play, 
  Plus,
  Search, 
  RefreshCw, 
  LogOut,
  Calendar,
  Award,
  FileText,
  Bell,
  Target,
  TrendingUp,
  User,
  Settings,
  ChevronRight,
  Video,
  Edit,
  Copy,
  Eye,
  Home,
  School,
  GraduationCap,
  UserPlus,
  ArrowRight,
  Code,
  Bookmark,
  CheckCircle
} from 'lucide-react'

interface User {
  id: string
  name: string
  role: string
  token: string
}

interface Classroom {
  _id: string
  classroomCode: string
  name: string
  subject: string
  description?: string
  teacherName: string
  enrollmentStatus: string
  enrolledAt: string
  attendanceStats: {
    totalLecturesAttended: number
    totalLecturesScheduled: number
    attendancePercentage: number
    lastAttended?: string
  }
  stats: {
    totalLectures: number
    totalStudents: number
    averageAttendance: number
  }
}

interface Lecture {
  _id: string
  roomId: string
  classroomId: string
  classroomCode: string
  classroomName: string
  classroomSubject: string
  lectureNumber: number
  subject: string
  topic: string
  description?: string
  scheduledDate: string
  duration: number
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  startTime?: string
  endTime?: string
  attendees: Array<{
    userId: string
    joinedAt: string
    attendancePercentage: number
  }>
  teacherId?: {
    _id: string
    name: string
  }
}

interface NewStudentDashboardProps {
  user: User
}

export default function NewStudentDashboard({ user }: NewStudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'classrooms' | 'lectures'>('overview')
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [allLectures, setAllLectures] = useState<Lecture[]>([])
  const [liveLectures, setLiveLectures] = useState<Lecture[]>([])
  const [upcomingLectures, setUpcomingLectures] = useState<Lecture[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isJoiningLecture, setIsJoiningLecture] = useState(false)
  
  // Modal states
  const [showJoinClassroom, setShowJoinClassroom] = useState(false)
  const [showClassroomDetails, setShowClassroomDetails] = useState(false)
  
  // Form states
  const [joinCode, setJoinCode] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    fetchStudentData()
  }, [user.id])

  const fetchStudentData = async () => {
    try {
      setRefreshing(true)
      await Promise.all([
        fetchEnrolledClassrooms(),
        fetchAllLectures()
      ])
    } catch (error) {
      console.error('Error fetching student data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchEnrolledClassrooms = async () => {
    try {
      const response = await fetch(`/api/classrooms/student/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setClassrooms(data.classrooms || [])
        }
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error)
    }
  }

  const fetchAllLectures = async () => {
    try {
      // For now, we'll fetch lectures from all enrolled classrooms
      const response = await fetch(`/api/classrooms/student/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.classrooms) {
          // Fetch lectures for each classroom
          const lecturePromises = data.classrooms.map(async (classroom: Classroom) => {
            try {
              const lectureResponse = await fetch(`/api/classrooms/${classroom._id}/lectures`)
              if (lectureResponse.ok) {
                const lectureData = await lectureResponse.json()
                return lectureData.success ? lectureData.lectures || [] : []
              }
              return []
            } catch (error) {
              console.error('Error fetching lectures for classroom:', classroom._id, error)
              return []
            }
          })

          const lectureResults = await Promise.all(lecturePromises)
          const allLecs = lectureResults.flat()
          
          setAllLectures(allLecs)
          setLiveLectures(allLecs.filter(l => l.status === 'live'))
          setUpcomingLectures(allLecs.filter(l => l.status === 'scheduled').sort((a, b) => 
            new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
          ))
        }
      }
    } catch (error) {
      console.error('Error fetching lectures:', error)
    }
  }

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!joinCode.trim()) {
      alert('❌ Please enter a classroom code')
      return
    }
    
    try {
      const response = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classroomCode: joinCode.trim().toUpperCase(),
          studentId: user.id,
          studentName: user.name
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setShowJoinClassroom(false)
          setJoinCode('')
          fetchStudentData()
          alert(`✅ ${data.message}`)
        }
      } else {
        const errorData = await response.json()
        alert(`❌ ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error joining classroom:', error)
      alert('❌ Failed to join classroom. Please try again.')
    }
  }

  const handleJoinLecture = async (lecture: Lecture) => {
    if (isJoiningLecture) {
      console.log('⚠️ Already joining a lecture, ignoring click')
      return
    }
    
    setIsJoiningLecture(true)
    
    try {
      const userId = localStorage.getItem('userId')
      const userToken = localStorage.getItem('userToken')
      
      if (!userId || !userToken) {
        alert('❌ Authentication error. Please login again.')
        router.push('/login')
        return
      }

      console.log('🔗 Attempting to join class:', {
        classId: lecture._id,
        userId: userId,
        roomId: lecture.roomId
      })

      // First, properly join the class to register as a participant for whiteboard access
      const joinResponse = await fetch(`http://localhost:8080/api/room-classes/${lecture._id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          userId: userId
        })
      })

      console.log('📡 Join API Response status:', joinResponse.status)
      
      if (!joinResponse.ok) {
        const errorText = await joinResponse.text()
        console.error('❌ Join API failed:', errorText)
        alert(`❌ Failed to join lecture: Server error`)
        return
      }
      
      const joinResult = await joinResponse.json()
      console.log('📊 Join API Result:', joinResult)
      console.log('🔍 Join API Result keys:', Object.keys(joinResult))
      console.log('🔍 sessionRoomId value:', joinResult.sessionRoomId)
      console.log('🔍 sessionRoomId type:', typeof joinResult.sessionRoomId)
      
      if (!joinResult.success) {
        console.error('Failed to join class:', joinResult.error)
        alert(`❌ Failed to join lecture: ${joinResult.error}`)
        return
      }

      console.log('✅ Successfully joined class:', joinResult.message)
      console.log('👥 Attendee count:', joinResult.attendeeCount)
      console.log('🏠 Session roomId:', joinResult.sessionRoomId)
      
      // Validate that we received the session roomId
      if (!joinResult.sessionRoomId) {
        console.error('❌ No session roomId received from join API')
        alert('❌ Failed to get room ID for whiteboard. Please try again.')
        return
      }
      
      // Store lecture info for whiteboard using the correct session roomId
      localStorage.setItem('currentRoomId', joinResult.sessionRoomId) // Always use session roomId
      localStorage.setItem('currentClassId', lecture._id)
      localStorage.setItem('currentClassroomId', lecture.classroomId)
      localStorage.setItem('currentLectureData', JSON.stringify(lecture))
      localStorage.setItem('studentMode', 'true')
      
      console.log('🔄 Navigating to whiteboard with data:', {
        sessionRoomId: joinResult.sessionRoomId,
        lectureRoomId: lecture.roomId,
        classId: lecture._id,
        userId: userId
      })
      
      // Small delay to ensure localStorage is written
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Navigate to student whiteboard/classroom
      router.push('/student-whiteboard')
      
    } catch (error) {
      console.error('Error joining lecture:', error)
      alert('❌ Failed to join lecture. Please try again.')
    } finally {
      setIsJoiningLecture(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Side - Student Name */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}!</h1>
                <p className="text-gray-600">Student Dashboard - Gyaandhara Platform</p>
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'overview' 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <Home className="w-4 h-4 inline mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('classrooms')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'classrooms' 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <School className="w-4 h-4 inline mr-2" />
                My Classrooms
              </button>
            </div>
            
            {/* Right Side - Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowJoinClassroom(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Join Class</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-white text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Live Lectures Alert */}
            {liveLectures.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-red-800 mb-4 flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
                  🔴 Live Lectures - Join Now!
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveLectures.map((lecture) => (
                    <div key={lecture._id} className="bg-white rounded-xl p-4 border border-red-200 shadow-md">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{lecture.topic}</h3>
                          <p className="text-sm text-blue-600">{lecture.classroomName}</p>
                          <p className="text-xs text-gray-600">{lecture.subject}</p>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                          🔴 LIVE
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-600 mb-3">
                        <span>👨‍🏫 {lecture.teacherId?.name}</span>
                        <span>⏱️ {lecture.duration} min</span>
                      </div>
                      
                      <button
                        onClick={() => handleJoinLecture(lecture)}
                        className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-all font-medium flex items-center justify-center space-x-2"
                      >
                        <Video className="w-4 h-4" />
                        <span>Join Live Class</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Enrolled Classes</h3>
                    <p className="text-3xl font-bold text-green-600">{classrooms.length}</p>
                  </div>
                  <School className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Live Lectures</h3>
                    <p className="text-3xl font-bold text-red-600">{liveLectures.length}</p>
                  </div>
                  <Video className="w-8 h-8 text-red-500" />
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Upcoming</h3>
                    <p className="text-3xl font-bold text-blue-600">{upcomingLectures.length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Attendance</h3>
                    <p className="text-3xl font-bold text-orange-600">
                      {Math.round(classrooms.reduce((sum, c) => sum + (c.attendanceStats?.attendancePercentage || 0), 0) / (classrooms.length || 1))}%
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Upcoming Lectures */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Upcoming Lectures</h2>
                <button
                  onClick={fetchStudentData}
                  disabled={refreshing}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              
              {upcomingLectures.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Upcoming Lectures</h3>
                  <p className="text-gray-500 mb-6">Join a classroom to see scheduled lectures</p>
                  <button
                    onClick={() => setShowJoinClassroom(true)}
                    className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Join a Classroom
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingLectures.slice(0, 6).map((lecture) => (
                    <div key={lecture._id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{lecture.topic}</h3>
                          <p className="text-sm text-blue-600">{lecture.classroomName}</p>
                          <p className="text-xs text-gray-600">👨‍🏫 {lecture.teacherId?.name}</p>
                        </div>
                        {getStatusBadge(lecture.status)}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-600 mb-3">
                        <span>📅 {new Date(lecture.scheduledDate).toLocaleDateString()}</span>
                        <span>⏱️ {lecture.duration} min</span>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-3">
                        🕒 {new Date(lecture.scheduledDate).toLocaleTimeString()}
                      </div>
                      
                      <button
                        disabled
                        className="w-full bg-gray-300 text-gray-500 py-2 px-3 rounded-lg text-sm font-medium cursor-not-allowed"
                      >
                        Waiting for teacher to start
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enrolled Classrooms */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">My Classrooms</h2>
                <button
                  onClick={() => setActiveTab('classrooms')}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              {classrooms.length === 0 ? (
                <div className="text-center py-12">
                  <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Classrooms Joined</h3>
                  <p className="text-gray-500 mb-6">Ask your teacher for a classroom code to get started!</p>
                  <button
                    onClick={() => setShowJoinClassroom(true)}
                    className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    Join Your First Classroom
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classrooms.slice(0, 6).map((classroom) => (
                    <div key={classroom._id} className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4 border border-green-100 hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 truncate">{classroom.name}</h3>
                          <p className="text-sm text-green-600">{classroom.subject}</p>
                          <p className="text-xs text-gray-500">👨‍🏫 {classroom.teacherName}</p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-600 mb-3">
                        <span>📚 {classroom.stats?.totalLectures || 0} lectures</span>
                        <span>📊 {classroom.attendanceStats?.attendancePercentage || 0}% attendance</span>
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedClassroom(classroom)
                          setShowClassroomDetails(true)
                        }}
                        className="w-full bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Classrooms Tab */}
        {activeTab === 'classrooms' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">My Classrooms</h2>
              <button
                onClick={fetchStudentData}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 border border-gray-200"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
            
            {classrooms.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-12 text-center shadow-lg border border-white/20">
                <School className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-xl font-medium text-gray-600 mb-3">No Classrooms Yet</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Ask your teacher for a classroom code to join your first class and start learning.
                </p>
                <button
                  onClick={() => setShowJoinClassroom(true)}
                  className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-8 py-3 rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
                >
                  Join Your First Classroom
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {classrooms.map((classroom) => (
                  <div key={classroom._id} className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/30 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-gray-900 mb-1">{classroom.name}</h3>
                        <p className="text-green-600 font-medium">{classroom.subject}</p>
                        <p className="text-sm text-gray-600 mt-1">👨‍🏫 {classroom.teacherName}</p>
                        {classroom.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{classroom.description}</p>
                        )}
                      </div>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    
                    {/* Classroom Code */}
                    <div className="bg-green-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600">Classroom Code</p>
                          <p className="font-bold text-green-800">{classroom.classroomCode}</p>
                        </div>
                        <Code className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{classroom.stats?.totalLectures || 0}</p>
                        <p className="text-xs text-gray-600">Lectures</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{classroom.attendanceStats?.attendancePercentage || 0}%</p>
                        <p className="text-xs text-gray-600">Attendance</p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setSelectedClassroom(classroom)
                          setShowClassroomDetails(true)
                        }}
                        className="w-full bg-green-500 text-white py-2.5 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Lectures</span>
                      </button>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Joined {new Date(classroom.enrolledAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Join Classroom Modal */}
      {showJoinClassroom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Join a Classroom</h2>
              <button
                onClick={() => setShowJoinClassroom(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleJoinClassroom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Classroom Code *</label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-center font-mono text-lg tracking-wider"
                  placeholder="Enter 6-digit code (e.g. ABC123)"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ask your teacher for the classroom code
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Join Classroom
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinClassroom(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Classroom Details Modal */}
      {showClassroomDetails && selectedClassroom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedClassroom.name}</h2>
                  <p className="text-green-600 font-medium">{selectedClassroom.subject}</p>
                  <p className="text-sm text-gray-600">👨‍🏫 {selectedClassroom.teacherName}</p>
                </div>
                <button
                  onClick={() => setShowClassroomDetails(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Classroom Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{selectedClassroom.attendanceStats?.totalLecturesAttended || 0}</p>
                  <p className="text-sm text-gray-600">Attended</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{selectedClassroom.stats?.totalLectures || 0}</p>
                  <p className="text-sm text-gray-600">Total Lectures</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{selectedClassroom.attendanceStats?.attendancePercentage || 0}%</p>
                  <p className="text-sm text-gray-600">Attendance Rate</p>
                </div>
              </div>

              {/* Lectures Section */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Available Lectures</h3>
                
                <div className="space-y-4">
                  {/* Live Lectures */}
                  {allLectures.filter(l => l.classroomId === selectedClassroom._id && l.status === 'live').map((lecture) => (
                    <div key={lecture._id} className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900 flex items-center">
                            🔴 {lecture.topic} 
                            <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                              LIVE NOW
                            </span>
                          </h4>
                          <p className="text-sm text-gray-600">Lecture {lecture.lectureNumber}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Started: {new Date(lecture.startTime || '').toLocaleTimeString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleJoinLecture(lecture)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center space-x-2"
                        >
                          <Video className="w-4 h-4" />
                          <span>Join Now</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Scheduled Lectures */}
                  {allLectures.filter(l => l.classroomId === selectedClassroom._id && l.status === 'scheduled').map((lecture) => (
                    <div key={lecture._id} className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900">{lecture.topic}</h4>
                          <p className="text-sm text-blue-600">Lecture {lecture.lectureNumber}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            📅 {new Date(lecture.scheduledDate).toLocaleDateString()} at {new Date(lecture.scheduledDate).toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-gray-500">⏱️ Duration: {lecture.duration} minutes</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          📅 Scheduled
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Completed Lectures */}
                  {allLectures.filter(l => l.classroomId === selectedClassroom._id && l.status === 'completed').slice(0, 3).map((lecture) => (
                    <div key={lecture._id} className="bg-green-50 border-l-4 border-green-400 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900">{lecture.topic}</h4>
                          <p className="text-sm text-green-600">Lecture {lecture.lectureNumber} - Completed</p>
                          <p className="text-xs text-gray-500 mt-1">
                            ✅ {new Date(lecture.endTime || '').toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(lecture.status)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {allLectures.filter(l => l.classroomId === selectedClassroom._id).length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No lectures scheduled yet</p>
                    <p className="text-sm text-gray-400">Check back later for new lectures</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
