'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TeacherDashboard from '@/components/NewTeacherDashboard'

interface User {
  id: string
  name: string
  role: string
  token: string
}

export default function TeacherDashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [classroomData, setClassroomData] = useState({
    roomId: '',
    classId: '',
  })
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in and is a teacher
    const token = localStorage.getItem('userToken')
    const role = localStorage.getItem('userRole')
    const name = localStorage.getItem('userName')
    const id = localStorage.getItem('userId')

    console.log('🔍 Teacher dashboard - checking auth:', { token: !!token, role, name, id })

    if (!token || role !== 'teacher') {
      console.log('❌ Not authenticated as teacher, redirecting to login')
      router.push('/login')
      return
    }

    if (token && role === 'teacher' && name && id) {
      setUser({ id, name, role, token })
      
      // Check if already in an active classroom
      const currentRoomId = localStorage.getItem('teacherRoomId')
      const currentClassId = localStorage.getItem('teacherClassId')
      const currentTeachingClass = localStorage.getItem('currentTeachingClass')
      
      console.log('🎓 Checking existing classroom:', { 
        currentRoomId, 
        currentClassId, 
        currentTeachingClass 
      })
      
      if (currentRoomId && currentClassId) {
        setClassroomData({
          roomId: currentRoomId,
          classId: currentClassId
        })
      }
    }

    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading teacher dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Always show the comprehensive TeacherDashboard component
  return (
    <TeacherDashboard
      user={user}
    />
  )
}

