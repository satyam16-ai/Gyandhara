'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TeacherDashboard from '../../src/components/TeacherDashboard'

interface User {
  id: string
  name: string
  role: string
  token: string
}

export default function TeacherDashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [roomId, setRoomId] = useState<string>('')
  const [classId, setClassId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('userToken')
    const userRole = localStorage.getItem('userRole')
    const userName = localStorage.getItem('userName')
    const userId = localStorage.getItem('userId')

    if (!token || userRole !== 'teacher') {
      router.push('/')
      return
    }

    setUser({
      id: userId || '',
      name: userName || '',
      role: userRole || '',
      token: token || ''
    })

    // Generate or get existing room ID for this teacher session
    const existingRoomId = localStorage.getItem('teacherRoomId')
    const existingClassId = localStorage.getItem('teacherClassId')
    
    if (existingRoomId && existingClassId) {
      setRoomId(existingRoomId)
      setClassId(existingClassId)
    } else {
      // Generate new room ID
      const newRoomId = `ROOM-${Date.now().toString().slice(-6)}`
      const newClassId = `CLASS-${Date.now()}`
      
      setRoomId(newRoomId)
      setClassId(newClassId)
      
      localStorage.setItem('teacherRoomId', newRoomId)
      localStorage.setItem('teacherClassId', newClassId)
    }

    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('userToken')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    localStorage.removeItem('userId')
    localStorage.removeItem('teacherRoomId')
    localStorage.removeItem('teacherClassId')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with logout */}
      <div className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {user.name}!</h1>
          <p className="text-gray-600">Teacher Dashboard - VoiceBoard Platform</p>
          {roomId && (
            <p className="text-sm text-blue-600 mt-1">Room ID: {roomId}</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </div>
      
      {/* Main Dashboard */}
      <TeacherDashboard 
        roomId={roomId}
        classId={classId}
        userId={user.id}
        userToken={user.token}
      />
    </div>
  )
}
