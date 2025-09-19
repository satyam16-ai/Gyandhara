'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '../contexts/ThemeContext'
import ThemeToggle from './ThemeToggle'
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
  Trash2,
  Copy,
  Eye,
  Home,
  School,
  GraduationCap,
  UserPlus,
  ArrowRight
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
  enrolledStudents: Array<{
    userId: string
    studentName: string
    enrolledAt: string
    status: string
  }>
  stats: {
    totalLectures: number
    totalStudents: number
    totalHours: number
    averageAttendance: number
  }
  createdAt: string
  lectures?: Lecture[]
}

interface Lecture {
  _id: string
  roomId: string
  classroomId: string
  classroomCode: string
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
  stats?: {
    totalAttendees: number
    averageAttendance: number
  }
}

interface NewTeacherDashboardProps {
  user: User
}

export default function NewTeacherDashboard({ user }: NewTeacherDashboardProps) {
  const { isDarkMode } = useTheme()
  const [activeTab, setActiveTab] = useState<'overview' | 'classrooms' | 'lectures'>('overview')
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Modal states
  const [showCreateClassroom, setShowCreateClassroom] = useState(false)
  const [showCreateLecture, setShowCreateLecture] = useState(false)
  const [showClassroomDetails, setShowClassroomDetails] = useState(false)
  
  // Form states
  const [newClassroom, setNewClassroom] = useState({
    name: '',
    subject: '',
    description: ''
  })
  
  const [newLecture, setNewLecture] = useState({
    topic: '',
    description: '',
    scheduledDate: '',
    duration: 60
  })
  
  const router = useRouter()

  useEffect(() => {
    fetchTeacherClassrooms()
  }, [user.id])

  const fetchTeacherClassrooms = async () => {
    try {
      setRefreshing(true)
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/classrooms/teacher/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setClassrooms(data.classrooms || [])
        }
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/classrooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newClassroom.name,
          subject: newClassroom.subject,
          description: newClassroom.description,
          teacherId: user.id,
          teacherName: user.name
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setShowCreateClassroom(false)
          setNewClassroom({ name: '', subject: '', description: '' })
          fetchTeacherClassrooms()
          alert(`✅ Classroom created! Code: ${data.classroom.classroomCode}`)
        }
      } else {
        const errorData = await response.json()
        alert(`❌ Failed to create classroom: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error creating classroom:', error)
      alert('❌ Failed to create classroom. Please try again.')
    }
  }

  const handleCreateLecture = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedClassroom) return
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/classrooms/${selectedClassroom._id}/lectures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: newLecture.topic,
          description: newLecture.description,
          scheduledDate: new Date(newLecture.scheduledDate).toISOString(),
          duration: newLecture.duration,
          teacherId: user.id
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setShowCreateLecture(false)
          setNewLecture({ topic: '', description: '', scheduledDate: '', duration: 60 })
          fetchClassroomDetails(selectedClassroom._id)
          alert(`✅ Lecture "${data.lecture.topic}" created successfully!`)
        }
      } else {
        const errorData = await response.json()
        alert(`❌ Failed to create lecture: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error creating lecture:', error)
      alert('❌ Failed to create lecture. Please try again.')
    }
  }

  const fetchClassroomDetails = async (classroomId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/classrooms/${classroomId}/details`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSelectedClassroom(data.classroom)
        }
      }
    } catch (error) {
      console.error('Error fetching classroom details:', error)
    }
  }

  const handleViewClassroom = (classroom: Classroom) => {
    setSelectedClassroom(classroom)
    fetchClassroomDetails(classroom._id)
    setShowClassroomDetails(true)
  }

  const handleStartLecture = async (lecture: Lecture) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/room-classes/${lecture._id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const responseData = await response.json()
        const updatedLecture = responseData.class
        const sessionData = responseData.session
        
        console.log('🚀 Lecture started successfully:', updatedLecture)
        console.log('📡 Session data:', sessionData)
        console.log('🔍 Session roomId details:', {
          sessionRoomId: sessionData?.roomId,
          sessionRoomIdLength: sessionData?.roomId?.length,
          lectureRoomId: lecture.roomId,
          lectureRoomIdLength: lecture.roomId.length,
          updatedLectureRoomId: updatedLecture.roomId,
          updatedLectureRoomIdLength: updatedLecture.roomId?.length
        })
        
        // Ensure we have a session with the correct roomId
        if (!sessionData || !sessionData.roomId) {
          console.error('❌ Session data missing or no roomId:', sessionData)
          alert('❌ Failed to get session room ID. Please try starting the lecture again.')
          return
        }
        
        // Validate that we got the short roomId format
        if (sessionData.roomId.length > 10) {
          console.error('❌ Received long roomId format, expecting short format:', {
            receivedRoomId: sessionData.roomId,
            length: sessionData.roomId.length
          })
          alert('❌ Invalid room ID format received. Please try starting the lecture again.')
          return
        }
        
        // Build URL parameters for whiteboard
        const whiteboardParams = new URLSearchParams({
          roomId: sessionData.roomId,
          classId: updatedLecture._id,
          teacherName: user.name,
          lectureTitle: lecture.topic,
          subject: lecture.subject || selectedClassroom?.subject || 'Subject',
          bandwidthMode: 'normal'
        })
        
        console.log('� Building URL parameters:', {
          roomId: sessionData.roomId,
          roomIdLength: sessionData.roomId.length,
          classId: updatedLecture._id,
          teacherName: user.name,
          lectureTitle: lecture.topic,
          subject: lecture.subject || selectedClassroom?.subject || 'Subject'
        })
        
        console.log('🔄 Navigating to teacher whiteboard with URL params:', whiteboardParams.toString())
        
        // Navigate to whiteboard with URL parameters (no localStorage dependency)
        router.push(`/teacher-whiteboard?${whiteboardParams.toString()}`)
      } else {
        const errorData = await response.json()
        console.error('❌ Start lecture API failed:', errorData)
        alert(`❌ Failed to start lecture: ${errorData.error}`)
      }
    } catch (error) {
      console.error('💥 Error starting lecture:', error)
      alert('❌ Failed to start lecture. Please try again.')
    }
  }

  const handleJoinLiveLecture = async (lecture: Lecture) => {
    try {
      const userToken = localStorage.getItem('userToken')
      
      if (!userToken) {
        alert('❌ Authentication error. Please login again.')
        return
      }
      
      // Call API to get current session data (to get the correct short roomId)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/room-classes/${lecture._id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        }
      })

      if (response.ok) {
        const responseData = await response.json()
        const sessionRoomId = responseData.sessionRoomId
        
        console.log('🔄 Joined live lecture:', lecture)
        console.log('📡 Response data:', responseData)
        console.log('🆔 Session room ID:', sessionRoomId)
        
        // Ensure we have a session with the correct roomId
        if (!sessionRoomId) {
          console.error('❌ Session room ID missing from response:', responseData)
          alert('❌ Failed to get session room ID. Please try again.')
          return
        }
        
        // Validate that we got the short roomId format
        if (sessionRoomId.length > 10) {
          console.error('❌ Received long roomId format, expecting short format:', {
            receivedRoomId: sessionRoomId,
            length: sessionRoomId.length
          })
          alert('❌ Invalid room ID format received. Please try again.')
          return
        }
        
        // Build URL parameters for whiteboard
        const whiteboardParams = new URLSearchParams({
          roomId: sessionRoomId,
          classId: lecture._id,
          teacherName: user.name,
          lectureTitle: lecture.topic,
          subject: lecture.subject || selectedClassroom?.subject || 'Subject',
          bandwidthMode: 'normal'
        })
        
        console.log('� Building URL parameters for join:', {
          roomId: sessionRoomId,
          roomIdLength: sessionRoomId.length,
          classId: lecture._id,
          teacherName: user.name,
          lectureTitle: lecture.topic,
          subject: lecture.subject || selectedClassroom?.subject || 'Subject'
        })
        
        console.log('🔄 Navigating to teacher whiteboard with URL params:', whiteboardParams.toString())
        
        // Navigate to whiteboard with URL parameters (no localStorage dependency)
        router.push(`/teacher-whiteboard?${whiteboardParams.toString()}`)
      } else {
        const errorData = await response.json()
        console.error('❌ Join lecture API failed:', errorData)
        alert(`❌ Failed to join lecture: ${errorData.error}`)
      }
    } catch (error) {
      console.error('💥 Error joining lecture:', error)
      alert('❌ Failed to join lecture. Please try again.')
    }
  }

  const copyClassroomCode = (code: string) => {
    navigator.clipboard.writeText(code)
    alert(`📋 Classroom code ${code} copied to clipboard!`)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-black dark:via-gray-900 dark:to-black transition-colors duration-300">
      {/* Header Section - Mobile Optimized */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg border-b border-white/20 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            {/* Top Row - Teacher Name & Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Welcome, {user.name}!</h1>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Teacher Dashboard - Gyaandhara Platform</p>
                </div>
              </div>
              
              {/* Mobile Theme Toggle */}
              <div className="lg:hidden">
                <ThemeToggle />
              </div>
            </div>
            
            {/* Middle Row - Navigation Tabs (Mobile: Horizontal Scroll) */}
            <div className="flex overflow-x-auto space-x-2 pb-2 lg:pb-0 lg:space-x-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-shrink-0 px-3 py-2 sm:px-4 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'overview' 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Home className="w-4 h-4 inline mr-1 sm:mr-2" />
                <span className="text-sm sm:text-base">Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('classrooms')}
                className={`flex-shrink-0 px-3 py-2 sm:px-4 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'classrooms' 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <School className="w-4 h-4 inline mr-1 sm:mr-2" />
                <span className="text-sm sm:text-base">Classrooms</span>
              </button>
            </div>
            
            {/* Bottom Row - Action Buttons */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 lg:items-center">
              {/* Desktop Theme Toggle */}
              <div className="hidden lg:block">
                <ThemeToggle />
              </div>
              
              <button
                onClick={() => setShowCreateClassroom(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 sm:px-4 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4" />
                <span>New Classroom</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-2 sm:px-4 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 shadow-sm flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Stats Cards - Mobile: 2x2 grid, Desktop: 4 columns */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total Classrooms</h3>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{classrooms.length}</p>
                  </div>
                  <School className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total Students</h3>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">
                      {classrooms.reduce((sum, c) => sum + c.stats.totalStudents, 0)}
                    </p>
                  </div>
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total Lectures</h3>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600">
                      {classrooms.reduce((sum, c) => sum + c.stats.totalLectures, 0)}
                    </p>
                  </div>
                  <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Avg Attendance</h3>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">
                      {Math.round(classrooms.reduce((sum, c) => sum + c.stats.averageAttendance, 0) / (classrooms.length || 1))}%
                    </p>
                  </div>
                  <Target className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Recent Classrooms */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-xl lg:rounded-2xl p-4 sm:p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Your Classrooms</h2>
                <button
                  onClick={() => setActiveTab('classrooms')}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center space-x-1 text-sm sm:text-base"
                >
                  <span>View All</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              {classrooms.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <School className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">No Classrooms Yet</h3>
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">Create your first classroom to start teaching!</p>
                  <button
                    onClick={() => setShowCreateClassroom(true)}
                    className="bg-blue-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm sm:text-base"
                  >
                    Create First Classroom
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {classrooms.slice(0, 6).map((classroom) => (
                    <div key={classroom._id} className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-100 dark:border-blue-800/50 hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm sm:text-base">{classroom.name}</h3>
                          <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">{classroom.subject}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Code: {classroom.classroomCode}</p>
                        </div>
                        <button
                          onClick={() => copyClassroomCode(classroom.classroomCode)}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded flex-shrink-0"
                          title="Copy code"
                        >
                          <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 mb-3">
                        <span>👥 {classroom.stats.totalStudents} students</span>
                        <span>📚 {classroom.stats.totalLectures} lectures</span>
                      </div>
                      
                      <button
                        onClick={() => handleViewClassroom(classroom)}
                        className="w-full bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
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
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Classrooms</h2>
              <button
                onClick={fetchTeacherClassrooms}
                disabled={refreshing}
                className="flex items-center justify-center space-x-2 px-3 py-2 sm:px-4 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 border border-gray-200 dark:border-gray-600 text-sm sm:text-base"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
            
            {classrooms.length === 0 ? (
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-xl lg:rounded-2xl p-6 sm:p-8 lg:p-12 text-center shadow-lg border border-white/20 dark:border-gray-700/50">
                <School className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4 sm:mb-6" />
                <h3 className="text-lg sm:text-xl font-medium text-gray-600 dark:text-gray-300 mb-2 sm:mb-3">No Classrooms Yet</h3>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 sm:mb-8 max-w-md mx-auto">
                  Create your first classroom to organize your lectures and manage students effectively.
                </p>
                <button
                  onClick={() => setShowCreateClassroom(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 sm:px-8 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium text-sm sm:text-base"
                >
                  Create Your First Classroom
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {classrooms.map((classroom) => (
                  <div key={classroom._id} className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-xl lg:rounded-2xl p-4 sm:p-6 shadow-lg border border-white/30 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white mb-1 truncate">{classroom.name}</h3>
                        <p className="text-blue-600 dark:text-blue-400 font-medium text-sm sm:text-base">{classroom.subject}</p>
                        {classroom.description && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{classroom.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Classroom Code */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mb-3 sm:mb-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Classroom Code</p>
                          <p className="font-bold text-blue-800 dark:text-blue-300 text-sm sm:text-base truncate">{classroom.classroomCode}</p>
                        </div>
                        <button
                          onClick={() => copyClassroomCode(classroom.classroomCode)}
                          className="p-2 bg-blue-100 dark:bg-blue-800/50 hover:bg-blue-200 dark:hover:bg-blue-700/50 rounded-lg transition-colors flex-shrink-0"
                          title="Copy code"
                        >
                          <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="text-center">
                        <p className="text-xl sm:text-2xl font-bold text-green-600">{classroom.stats.totalStudents}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Students</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">{classroom.stats.totalLectures}</p>
                        <p className="text-xs text-gray-600">Lectures</p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => handleViewClassroom(classroom)}
                        className="w-full bg-blue-500 text-white py-2.5 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View & Manage</span>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setSelectedClassroom(classroom)
                            setShowCreateLecture(true)
                          }}
                          className="bg-green-100 text-green-700 py-2 px-3 rounded-lg hover:bg-green-200 transition-colors font-medium text-sm flex items-center justify-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Lecture</span>
                        </button>
                        <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex items-center justify-center space-x-1">
                          <Settings className="w-3 h-3" />
                          <span>Settings</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Created {new Date(classroom.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Classroom Modal */}
      {showCreateClassroom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Classroom</h2>
              <button
                onClick={() => setShowCreateClassroom(false)}
                className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateClassroom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Classroom Name *</label>
                <input
                  type="text"
                  required
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                  placeholder="e.g. Physics Grade 12, Mathematics Advanced"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  required
                  value={newClassroom.subject}
                  onChange={(e) => setNewClassroom({ ...newClassroom, subject: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g. Physics, Mathematics, Chemistry"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom({ ...newClassroom, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  rows={3}
                  placeholder="Brief description of the classroom..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Create Classroom
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateClassroom(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Lecture Modal */}
      {showCreateLecture && selectedClassroom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create New Lecture</h2>
                <p className="text-sm text-gray-600">in {selectedClassroom.name}</p>
              </div>
              <button
                onClick={() => setShowCreateLecture(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateLecture} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lecture Topic *</label>
                <input
                  type="text"
                  required
                  value={newLecture.topic}
                  onChange={(e) => setNewLecture({ ...newLecture, topic: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g. Newton's Laws of Motion, Algebra Basics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={newLecture.description}
                  onChange={(e) => setNewLecture({ ...newLecture, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  rows={3}
                  placeholder="What will be covered in this lecture..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={newLecture.scheduledDate}
                  onChange={(e) => setNewLecture({ ...newLecture, scheduledDate: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <select
                  value={newLecture.duration}
                  onChange={(e) => setNewLecture({ ...newLecture, duration: Number(e.target.value) })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Create Lecture
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateLecture(false)}
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
                  <p className="text-blue-600 font-medium">{selectedClassroom.subject}</p>
                  <p className="text-sm text-gray-600">Code: {selectedClassroom.classroomCode}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowCreateLecture(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Lecture</span>
                  </button>
                  <button
                    onClick={() => setShowClassroomDetails(false)}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Classroom Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{selectedClassroom.stats.totalStudents}</p>
                  <p className="text-sm text-gray-600">Students</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{selectedClassroom.stats.totalLectures}</p>
                  <p className="text-sm text-gray-600">Lectures</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{selectedClassroom.stats.averageAttendance}%</p>
                  <p className="text-sm text-gray-600">Avg Attendance</p>
                </div>
              </div>

              {/* Lectures Section */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Lectures</h3>
                
                {!selectedClassroom.lectures || selectedClassroom.lectures.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-600 mb-2">No Lectures Yet</h4>
                    <p className="text-gray-500 mb-6">Create your first lecture to get started!</p>
                    <button
                      onClick={() => setShowCreateLecture(true)}
                      className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                      Create First Lecture
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Live Lectures */}
                    {selectedClassroom.lectures.filter(l => l.status === 'live').map((lecture) => (
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
                            onClick={() => handleJoinLiveLecture(lecture)}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center space-x-2"
                          >
                            <Video className="w-4 h-4" />
                            <span>Join Live</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Scheduled Lectures */}
                    {selectedClassroom.lectures.filter(l => l.status === 'scheduled').map((lecture) => (
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
                          <button
                            onClick={() => handleStartLecture(lecture)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center space-x-2"
                          >
                            <Play className="w-4 h-4" />
                            <span>Start Lecture</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Completed Lectures */}
                    {selectedClassroom.lectures.filter(l => l.status === 'completed').slice(0, 3).map((lecture) => (
                      <div key={lecture._id} className="bg-green-50 border-l-4 border-green-400 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-gray-900">{lecture.topic}</h4>
                            <p className="text-sm text-green-600">Lecture {lecture.lectureNumber} - Completed</p>
                            <p className="text-xs text-gray-500 mt-1">
                              ✅ {new Date(lecture.endTime || '').toLocaleDateString()} 
                              • 👥 {lecture.attendees.length} attended
                            </p>
                          </div>
                          {getStatusBadge(lecture.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Enrolled Students Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Enrolled Students ({selectedClassroom.stats.totalStudents})</h3>
                
                {selectedClassroom.enrolledStudents.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No students enrolled yet</p>
                    <p className="text-sm text-gray-400">Share the classroom code: <strong>{selectedClassroom.classroomCode}</strong></p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {selectedClassroom.enrolledStudents
                      .filter(student => student.status === 'active')
                      .map((student, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{student.studentName}</p>
                            <p className="text-xs text-gray-500">
                              Joined: {new Date(student.enrolledAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
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
