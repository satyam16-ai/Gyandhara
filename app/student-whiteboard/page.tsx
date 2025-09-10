'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import FullWhiteBoard from '../../src/components/FullWhiteBoard'
import { WhiteboardProvider } from '../../src/contexts/WhiteboardContext'

export default function StudentWhiteboardPage() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    console.log('🎯 ULTIMATE WHITEBOARD - Student loading...')
    
    // Check authentication
    const token = localStorage.getItem('userToken')
    const role = localStorage.getItem('userRole')
    const name = localStorage.getItem('userName')
    const id = localStorage.getItem('userId')

    if (!token || role !== 'student') {
      setError('Please log in as a student')
      setTimeout(() => router.push('/login'), 2000)
      return
    }

    // Get current lecture data
    const roomId = localStorage.getItem('currentRoomId')
    const classId = localStorage.getItem('currentClassId')
    const classroomId = localStorage.getItem('currentClassroomId')
    const lectureData = localStorage.getItem('currentLectureData')
    const studentMode = localStorage.getItem('studentMode')

    console.log('🔍 Student Whiteboard - Reading from localStorage:', {
      roomId,
      classId,
      classroomId,
      lectureData: lectureData ? 'present' : 'missing',
      studentMode
    })

    if (!roomId || !classId || !lectureData || studentMode !== 'true') {
      setError('No active lecture session found. Please join a lecture from your dashboard.')
      setTimeout(() => router.push('/student-dashboard'), 2000)
      return
    }

    try {
      const parsedLectureData = JSON.parse(lectureData)
      console.log('🔍 Parsed lecture data:', parsedLectureData)
      console.log('🔍 Using roomId from localStorage:', roomId)
      
      const lectureDataWithoutRoomId = { ...parsedLectureData }
      delete lectureDataWithoutRoomId.roomId // Remove the old roomId
      
      setSessionData({
        roomId, // Always use the roomId from localStorage (the session roomId)
        classId,
        classroomId,
        ...lectureDataWithoutRoomId
      })
      setUser({ id, name, role, token })
      
      console.log('✅ Student ultimate whiteboard validation passed - loading best UI')
    } catch (error) {
      console.error('Error parsing lecture data:', error)
      setError('Invalid lecture session data. Please try joining again.')
      setTimeout(() => router.push('/student-dashboard'), 2000)
      return
    }

    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-xl">
          <div className="relative mx-auto mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-green-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">🎨 Joining Whiteboard</h2>
          <p className="text-green-600 font-medium">Connecting to live lecture...</p>
          <div className="mt-4 flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-xl border border-red-200">
          <div className="text-red-500 text-6xl mb-4 animate-pulse">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-sm text-red-600 font-medium">
              Auto-redirecting to dashboard...
            </div>
            <div className="w-full bg-red-200 rounded-full h-2 mt-2">
              <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionData || !user) {
    return null
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <WhiteboardProvider>
        <FullWhiteBoard
          isTeacher={false}
          bandwidthMode="normal"
          roomId={sessionData.roomId}
          classId={sessionData.classId}
          teacherName={sessionData.teacherId?.name || 'Teacher'}
          lectureTitle={sessionData.topic || 'Live Lecture'}
          subject={sessionData.subject || 'Subject'}
        />
      </WhiteboardProvider>
    </div>
  )
}
