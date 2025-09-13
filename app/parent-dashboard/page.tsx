'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Check authentication
      const token = localStorage.getItem('authToken')
      const role = localStorage.getItem('userRole')
      
      if (!token || role !== 'parent') {
        router.push('/parent-login')
        return
      }

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
    if (progress >= 90) return 'text-green-600 bg-green-100'
    if (progress >= 75) return 'text-blue-600 bg-blue-100'
    if (progress >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getAttendanceIcon = (status: 'present' | 'absent' | 'late') => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'absent':
        return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading parent dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">GYANDHARA</h1>
                <p className="text-sm text-gray-600">Parent Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userInfo?.name || 'Parent'}</p>
                <p className="text-xs text-gray-600">Parent Account</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {userInfo?.name?.split(' ')[0] || 'Parent'}! 👋
          </h2>
          <p className="text-gray-600">
            Here's how {studentInfo?.name || 'your child'} is progressing in their learning journey.
          </p>
        </div>

        {/* Student Info Card */}
        {studentInfo && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{studentInfo.name}</h3>
                  <p className="text-gray-600">{studentInfo.class}</p>
                  <p className="text-sm text-gray-500">Enrolled: {new Date(studentInfo.enrollmentDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  studentInfo.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {studentInfo.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'progress', label: 'Academic Progress', icon: TrendingUp },
                { id: 'attendance', label: 'Attendance', icon: Calendar },
                { id: 'communication', label: 'Messages', icon: MessageCircle }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100">Overall Progress</p>
                        <p className="text-3xl font-bold">87%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100">Attendance Rate</p>
                        <p className="text-3xl font-bold">94%</p>
                      </div>
                      <Calendar className="h-8 w-8 text-green-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100">Subjects</p>
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
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Activity className="h-5 w-5 text-gray-600 mr-2" />
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-gray-700">Completed Mathematics Assignment - Linear Equations</span>
                      </div>
                      <span className="text-sm text-gray-500">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700">Attended Science Lab Session</span>
                      </div>
                      <span className="text-sm text-gray-500">Yesterday</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <Award className="h-4 w-4 text-purple-500" />
                        <span className="text-gray-700">Earned "Problem Solver" badge in Computer Science</span>
                      </div>
                      <span className="text-sm text-gray-500">3 days ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Tab */}
            {activeTab === 'progress' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Academic Progress by Subject</h3>
                <div className="grid gap-4">
                  {progressData.map((subject, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900">{subject.subject}</h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getProgressColor(subject.progress)}`}>
                          {subject.grade}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Progress</span>
                        <span className="text-sm font-medium text-gray-900">{subject.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${subject.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">Last updated: {new Date(subject.lastUpdated).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Attendance Records</h3>
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="space-y-3">
                    {attendanceData.map((record, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                        <div className="flex items-center space-x-3">
                          {getAttendanceIcon(record.status)}
                          <div>
                            <p className="font-medium text-gray-900">{record.subject}</p>
                            <p className="text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
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
                  <h3 className="text-lg font-semibold text-gray-900">Messages & Communications</h3>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>New Message</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Ms. Priya Sharma - Mathematics Teacher</h4>
                          <p className="text-gray-600 mt-1">Great progress in algebra! Rahul is showing excellent problem-solving skills.</p>
                          <p className="text-sm text-gray-500 mt-2">2 days ago</p>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700">
                        <MessageCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="h-10 w-10 bg-green-600 rounded-full flex items-center justify-center">
                          <Bell className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">System Notification</h4>
                          <p className="text-gray-600 mt-1">Parent-Teacher meeting scheduled for next Tuesday at 3:00 PM.</p>
                          <p className="text-sm text-gray-500 mt-2">5 days ago</p>
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">Email Support</p>
                <a href="mailto:support@gyandhara.edu" className="text-purple-600 hover:text-purple-700">support@gyandhara.edu</a>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Phone Support</p>
                <a href="tel:+911234567890" className="text-green-600 hover:text-green-700">+91 12345 67890</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}