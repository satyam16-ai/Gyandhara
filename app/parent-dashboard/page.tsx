'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '../../src/contexts/ThemeContext'
import ThemeToggle from '../../src/components/ThemeToggle'
import { 
  User, 
  BookOpen, 
  BarChart3, 
  Calendar, 
  MessageCircle, 
  Award, 
  Clock, 
  TrendingUp, 
  Users, 
  Bell,
  LogOut,
  Settings,
  Heart,
  Star,
  Activity,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone
} from 'lucide-react'

interface StudentInfo {
  id: string
  name: string
  email: string
  class: string
  enrollmentDate: string
  status: 'active' | 'inactive'
}

interface ProgressData {
  subject: string
  progress: number
  grade: string
  lastUpdated: string
}

interface AttendanceRecord {
  date: string
  status: 'present' | 'absent' | 'late'
  subject: string
}

export default function ParentDashboard() {
  const { isDarkMode } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [progressData, setProgressData] = useState<ProgressData[]>([])
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      // Add a delay to ensure localStorage from login has been set
      setTimeout(() => {
        loadDashboardData()
      }, 250)
    }
  }, [mounted])

  const loadDashboardData = async () => {
    try {
      // Only check auth after component is mounted and window is available
      if (typeof window === 'undefined' || !mounted) {
        return
      }

      // Add a small delay to ensure localStorage is fully accessible
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check authentication
      const token = localStorage.getItem('authToken')
      const role = localStorage.getItem('userRole')
      
      console.log('Auth check - Token:', !!token, 'Role:', role) // Debug log
      
      if (!token || role !== 'parent') {
        console.log('Authentication failed, redirecting to login') // Debug log
        router.push('/parent-login')
        return
      }

      console.log('Authentication successful, loading dashboard data') // Debug log

      const storedUserInfo = localStorage.getItem('userInfo')
      if (storedUserInfo) {
        setUserInfo(JSON.parse(storedUserInfo))
      }

      // Mock data for now - in real implementation, fetch from API
      setStudentInfo({
        id: 'STU001',
        name: 'Rahul Sharma',
        email: 'rahul.sharma@student.com',
        class: 'Class 10-A',
        enrollmentDate: '2024-01-15',
        status: 'active'
      })

      setProgressData([
        { subject: 'Mathematics', progress: 85, grade: 'A-', lastUpdated: '2024-01-20' },
        { subject: 'Science', progress: 92, grade: 'A+', lastUpdated: '2024-01-19' },
        { subject: 'English', progress: 78, grade: 'B+', lastUpdated: '2024-01-18' },
        { subject: 'Social Studies', progress: 88, grade: 'A', lastUpdated: '2024-01-17' },
        { subject: 'Computer Science', progress: 95, grade: 'A+', lastUpdated: '2024-01-16' }
      ])

      setAttendanceData([
        { date: '2024-01-20', status: 'present', subject: 'Mathematics' },
        { date: '2024-01-19', status: 'present', subject: 'Science' },
        { date: '2024-01-18', status: 'late', subject: 'English' },
        { date: '2024-01-17', status: 'present', subject: 'Social Studies' },
        { date: '2024-01-16', status: 'present', subject: 'Computer Science' }
      ])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userInfo')
    router.push('/parent-login')
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-900/30'
    if (progress >= 75) return 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30'
    if (progress >= 60) return 'text-yellow-600 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30'
    return 'text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/30'
  }

  const getAttendanceIcon = (status: 'present' | 'absent' | 'late') => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      case 'absent':
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
    }
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-black dark:via-gray-900 dark:to-black flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-100">Loading parent dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-black dark:via-gray-900 dark:to-black transition-colors duration-300">
      {/* Header - Mobile Optimized */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-purple-100 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 h-auto sm:h-16 py-3 sm:py-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <Heart className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">GYANDHARA</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Parent Portal</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
              <ThemeToggle />
              <div className="text-left sm:text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{userInfo?.name || 'Parent'}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">Parent Account</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {userInfo?.name?.split(' ')[0] || 'Parent'}! 👋
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Here's how {studentInfo?.name || 'your child'} is progressing in their learning journey.
          </p>
        </div>

        {/* Student Info Card */}
        {studentInfo && (
          <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{studentInfo.name}</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{studentInfo.class}</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Enrolled: {new Date(studentInfo.enrollmentDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                  studentInfo.status === 'active' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                }`}>
                  {studentInfo.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 mb-6 sm:mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto space-x-4 sm:space-x-8 px-4 sm:px-6 pb-2 sm:pb-0">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'progress', label: 'Academic Progress', icon: TrendingUp },
                { id: 'attendance', label: 'Attendance', icon: Calendar },
                { id: 'communication', label: 'Messages', icon: MessageCircle }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 flex items-center space-x-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-6 rounded-lg lg:rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-xs sm:text-sm">Overall Progress</p>
                        <p className="text-2xl sm:text-3xl font-bold">87%</p>
                      </div>
                      <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 sm:p-6 rounded-lg lg:rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-xs sm:text-sm">Attendance Rate</p>
                        <p className="text-2xl sm:text-3xl font-bold">94%</p>
                      </div>
                      <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 sm:p-6 rounded-lg lg:rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-xs sm:text-sm">Subjects</p>
                        <p className="text-3xl font-bold">5</p>
                      </div>
                      <BookOpen className="h-8 w-8 text-purple-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100">Achievements</p>
                        <p className="text-3xl font-bold">12</p>
                      </div>
                      <Award className="h-8 w-8 text-orange-200" />
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-gray-700 dark:text-gray-300">Completed Mathematics Assignment - Linear Equations</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">Attended Science Lab Session</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Yesterday</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <Award className="h-4 w-4 text-purple-500" />
                        <span className="text-gray-700 dark:text-gray-300">Earned "Problem Solver" badge in Computer Science</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">3 days ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Tab */}
            {activeTab === 'progress' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Progress by Subject</h3>
                <div className="grid gap-4">
                  {progressData.map((subject, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">{subject.subject}</h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getProgressColor(subject.progress)}`}>
                          {subject.grade}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{subject.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${subject.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: {new Date(subject.lastUpdated).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Attendance Records</h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border dark:border-gray-700">
                  <div className="space-y-3">
                    {attendanceData.map((record, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                        <div className="flex items-center space-x-3">
                          {getAttendanceIcon(record.status)}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{record.subject}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(record.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                          record.status === 'present' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                          record.status === 'late' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                          'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Communication Tab */}
            {activeTab === 'communication' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Messages & Communications</h3>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>New Message</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Ms. Priya Sharma - Mathematics Teacher</h4>
                          <p className="text-gray-600 dark:text-gray-300 mt-1">Great progress in algebra! Rahul is showing excellent problem-solving skills.</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">2 days ago</p>
                        </div>
                      </div>
                      <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                        <MessageCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="h-10 w-10 bg-green-600 rounded-full flex items-center justify-center">
                          <Bell className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">System Notification</h4>
                          <p className="text-gray-600 dark:text-gray-300 mt-1">Parent-Teacher meeting scheduled for next Tuesday at 3:00 PM.</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">5 days ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Need Help?</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email Support</p>
                <a href="mailto:support@gyandhara.edu" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">support@gyandhara.edu</a>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Phone Support</p>
                <a href="tel:+911234567890" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">+91 12345 67890</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}