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
  Edit
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
  stats?: {
    totalAttendees: number
    averageAttendance: number
  }
}

interface TeacherClassManagementProps {
  user: User
  roomId: string
  classId: string
}

export default function TeacherClassManagement({ user, roomId, classId }: TeacherClassManagementProps) {
  const [liveClasses, setLiveClasses] = useState<RoomClass[]>([])
  const [scheduledClasses, setScheduledClasses] = useState<RoomClass[]>([])
  const [completedClasses, setCompletedClasses] = useState<RoomClass[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateClass, setShowCreateClass] = useState(false)
  const [newClass, setNewClass] = useState({
    subject: '',
    topic: '',
    description: '',
    scheduledDate: '',
    duration: 60
  })
  const router = useRouter()

  useEffect(() => {
    fetchTeacherClasses()
  }, [user.id])

  const fetchTeacherClasses = async () => {
    try {
      setRefreshing(true)
      
      // Get teacher's classes
      const response = await fetch(`/api/room-classes/teacher/${user.id}/upcoming`)
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          const classes = data.classes || []
          setLiveClasses(classes.filter((cls: RoomClass) => cls.status === 'live'))
          setScheduledClasses(classes.filter((cls: RoomClass) => cls.status === 'scheduled'))
          setCompletedClasses(classes.filter((cls: RoomClass) => cls.status === 'completed'))
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/room-classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          teacherId: user.id,
          subject: newClass.subject,
          topic: newClass.topic,
          description: newClass.description,
          scheduledDate: new Date(newClass.scheduledDate).toISOString(),
          duration: newClass.duration
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setShowCreateClass(false)
        setNewClass({
          subject: '',
          topic: '',
          description: '',
          scheduledDate: '',
          duration: 60
        })
        fetchTeacherClasses() // Refresh the list
        alert('Class created successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to create class: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error creating class:', error)
      alert('Failed to create class. Please try again.')
    }
  }

  const handleStartClass = async (classData: RoomClass) => {
    try {
      // Start the class
      const response = await fetch(`/api/room-classes/${classData._id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Store class info for whiteboard
        localStorage.setItem('currentRoomId', classData.roomId)
        localStorage.setItem('currentClassId', classData._id)
        localStorage.setItem('currentTeachingClass', JSON.stringify(classData))
        
        // Navigate to whiteboard
        router.push('/teacher-whiteboard')
      } else {
        const errorData = await response.json()
        alert(`Failed to start class: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error starting class:', error)
      alert('Failed to start class. Please try again.')
    }
  }

  const handleJoinLiveClass = (classData: RoomClass) => {
    // Store class info for whiteboard
    localStorage.setItem('currentRoomId', classData.roomId)
    localStorage.setItem('currentClassId', classData._id)
    localStorage.setItem('currentTeachingClass', JSON.stringify(classData))
    
    // Navigate to whiteboard
    router.push('/teacher-whiteboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('userToken')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    localStorage.removeItem('userId')
    localStorage.removeItem('teacherRoomId')
    localStorage.removeItem('teacherClassId')
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Section */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Side - Teacher Name */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}!</h1>
                <p className="text-gray-600">Teacher Dashboard - Gyaandhara Platform</p>
                <p className="text-sm text-blue-600">Room ID: {roomId}</p>
              </div>
            </div>
            
            {/* Right Side - Action Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateClass(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create Class</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-white text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm flex items-center space-x-2"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
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
                  {liveClasses.map((classData) => (
                    <div key={classData._id} className="bg-white rounded-xl p-4 border border-red-200 shadow-md">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{classData.subject}</h3>
                          <p className="text-sm text-gray-600">{classData.topic}</p>
                          <p className="text-xs text-red-600 font-medium">Lecture {classData.lectureNumber}</p>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                          🔴 LIVE
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-600 mb-3">
                        <span>👥 {classData.attendees.length} students</span>
                        <span>🕒 Started {new Date(classData.startedAt || '').toLocaleTimeString()}</span>
                      </div>
                      
                      <button
                        onClick={() => handleJoinLiveClass(classData)}
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

            {/* Scheduled Classes Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Calendar className="w-6 h-6 mr-2 text-blue-600" />
                  Scheduled Classes
                </h2>
                
                <button
                  onClick={fetchTeacherClasses}
                  disabled={refreshing}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              
              {scheduledClasses.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600">No scheduled classes found</p>
                  <p className="text-sm text-gray-500">Create your first class to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scheduledClasses.map((classData) => (
                    <div key={classData._id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{classData.subject}</h3>
                          <p className="text-sm text-gray-600">{classData.topic}</p>
                          <p className="text-xs text-blue-600 font-medium">Lecture {classData.lectureNumber}</p>
                        </div>
                        {getStatusBadge(classData.status)}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-600 mb-3">
                        <span>📅 {new Date(classData.scheduledDate).toLocaleDateString()}</span>
                        <span>⏱️ {classData.duration} min</span>
                      </div>
                      
                      <button
                        onClick={() => handleStartClass(classData)}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-all text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>Start Class</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Classes Section */}
            {completedClasses.length > 0 && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Award className="w-6 h-6 mr-2 text-green-600" />
                  Recent Classes
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedClasses.slice(0, 4).map((classData) => (
                    <div key={classData._id} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{classData.subject}</h3>
                          <p className="text-sm text-gray-600">{classData.topic}</p>
                          <p className="text-xs text-green-600 font-medium">Lecture {classData.lectureNumber}</p>
                        </div>
                        {getStatusBadge(classData.status)}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-600">
                        <span>👥 {classData.attendees.length} attended</span>
                        <span>📊 {classData.stats?.averageAttendance || 0}% avg attendance</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Analytics Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats Widget */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Today's Stats</h3>
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{liveClasses.length}</div>
                  <p className="text-sm text-gray-600">Live Classes</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{scheduledClasses.length}</div>
                  <p className="text-sm text-gray-600">Scheduled</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{completedClasses.length}</div>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Widget */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
                <Settings className="w-6 h-6 text-indigo-600" />
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowCreateClass(true)}
                  className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg transition-colors text-left"
                >
                  <Plus className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700 font-medium">New Class</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700 font-medium">View Reports</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700 font-medium">Notifications</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create New Class</h2>
              <button
                onClick={() => setShowCreateClass(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  required
                  value={newClass.subject}
                  onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g. Mathematics, Physics, Chemistry"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                <input
                  type="text"
                  required
                  value={newClass.topic}
                  onChange={(e) => setNewClass({ ...newClass, topic: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g. Algebra Basics, Newton's Laws"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  rows={3}
                  placeholder="Brief description of what will be covered..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newClass.scheduledDate}
                  onChange={(e) => setNewClass({ ...newClass, scheduledDate: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <select
                  value={newClass.duration}
                  onChange={(e) => setNewClass({ ...newClass, duration: Number(e.target.value) })}
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
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Create Class
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateClass(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
