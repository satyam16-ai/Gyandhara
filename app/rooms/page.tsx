'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TeacherRoomManager from '@/components/TeacherRoomManager'
import StudentRoomJoiner from '@/components/StudentRoomJoiner'

export default function RoomsPage() {
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('userToken')
    const role = localStorage.getItem('userRole') as 'teacher' | 'student'
    const name = localStorage.getItem('userName')
    const id = localStorage.getItem('userId')

    if (token && role && name && id) {
      setUserRole(role)
      setUserName(name)
      setUserId(id)
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleTeacherRoomJoin = (roomId: string) => {
    // Store the room ID for the whiteboard session
    localStorage.setItem('currentRoomId', roomId)
    // Navigate to teacher dashboard (whiteboard)
    router.push('/teacher-dashboard')
  }

  const handleStudentRoomJoin = (room: any) => {
    // Store the room ID for the student dashboard
    localStorage.setItem('currentRoomId', room.roomId)
    // Navigate to student dashboard 
    router.push('/student-dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('userToken')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    localStorage.removeItem('userId')
    router.push('/')
  }

  const handleLoginRedirect = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
            <div className="text-2xl">🏫</div>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading VoiceBoard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-3xl"></div>
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-xl"></div>
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-xl"></div>
          
          {/* Content */}
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg">
              🏫
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
              Access Required
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-8">
              Please log in to access the VoiceBoard room system
            </p>
            
            <button
              onClick={handleLoginRedirect}
              className="w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>🚀</span>
                <span>Go to Login</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-white/20 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl shadow-lg">
            🏫
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              VoiceBoard Rooms
            </h1>
            <p className="text-gray-600 text-sm">
              Welcome back, <span className="font-semibold">{userName}</span> 
              <span className="ml-2 px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-full">
                {userRole === 'teacher' ? '👨‍🏫 Teacher' : '🎓 Student'}
              </span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
          >
            🏠 Home
          </button>
          <button
            onClick={handleLogout}
            className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {userRole === 'teacher' ? (
          <TeacherRoomManager teacherId={userId} onRoomJoin={handleTeacherRoomJoin} />
        ) : (
          <StudentRoomJoiner userId={userId} onRoomJoin={handleStudentRoomJoin} />
        )}
      </div>

      {/* Footer */}
      <div className="bg-white/50 backdrop-blur-lg border-t border-white/20 px-6 py-4 text-center text-gray-600 text-sm">
        <p>
          🎨 VoiceBoard - AI-Powered Educational Platform • 
          <span className="ml-1 font-semibold">
            {userRole === 'teacher' ? 'Manage your virtual classrooms' : 'Join interactive classes'}
          </span>
        </p>
      </div>
    </div>
  )
}
