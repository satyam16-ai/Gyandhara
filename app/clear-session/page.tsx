'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClearSessionPage() {
  const router = useRouter()

  useEffect(() => {
    console.log('🧹 Clearing all localStorage data...')
    
    // Clear all relevant localStorage keys
    localStorage.removeItem('currentRoomId')
    localStorage.removeItem('currentClassId') 
    localStorage.removeItem('currentSessionId')
    localStorage.removeItem('currentClassroomId')
    localStorage.removeItem('currentLectureData')
    localStorage.removeItem('teacherRoomId')
    localStorage.removeItem('teacherClassId')
    localStorage.removeItem('currentTeachingClass')
    
    console.log('✅ All session data cleared')
    
    alert('✅ Session data cleared! Redirecting to dashboard.')
    
    // Check user role and redirect appropriately
    const role = localStorage.getItem('userRole')
    if (role === 'teacher') {
      router.push('/teacher-dashboard')
    } else if (role === 'student') {
      router.push('/student-dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-700 font-medium">Clearing session data...</p>
      </div>
    </div>
  )
}
