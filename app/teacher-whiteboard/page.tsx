'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { WhiteboardProvider } from '../../src/contexts/WhiteboardContext'
import FullWhiteBoard from '../../src/components/FullWhiteBoard'

interface TeacherWhiteboardPageProps {
  searchParams?: {
    roomId?: string
    classId?: string
    teacherName?: string
    lectureTitle?: string
    subject?: string
    bandwidthMode?: 'ultra-low' | 'low' | 'normal'
  }
}

function TeacherWhiteboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get URL parameters
  const roomId = searchParams?.get('roomId')
  const classId = searchParams?.get('classId') 
  const teacherId = searchParams?.get('teacherId') || searchParams?.get('userId')
  const teacherName = searchParams?.get('teacherName') || 'Teacher'
  const lectureTitle = searchParams?.get('lectureTitle') || 'Live Lecture'
  const subject = searchParams?.get('subject') || 'Subject'
  const bandwidthMode = (searchParams?.get('bandwidthMode') || 'normal') as 'ultra-low' | 'low' | 'normal'

  useEffect(() => {
    console.log('🎯 ULTIMATE WHITEBOARD - Teacher loading with params:', {
      roomId,
      roomIdLength: roomId?.length,
      classId,
      teacherName,
      lectureTitle,
      subject,
      bandwidthMode
    })

    // Validation
    if (!roomId || !classId) {
      console.error('❌ Missing required parameters:', { roomId, classId })
      setError('Missing session parameters. Please restart from your dashboard.')
      setTimeout(() => {
        router.push('/teacher-dashboard')
      }, 2000)
      return
    }

    // Validate roomId format  
    if (typeof roomId !== 'string') {
      console.error('❌ roomId is not a string:', { roomId, type: typeof roomId })
      setError('Invalid session data. Please restart the lecture.')
      setTimeout(() => {
        router.push('/teacher-dashboard')
      }, 2000)
      return
    }

    // Enhanced validation - accept both short and long roomIds for now
    console.log('🔍 RoomId analysis:', {
      roomId,
      length: roomId.length,
      isShort: roomId.length <= 10,
      isLong: roomId.length > 10,
      format: roomId.length <= 10 ? 'Short (Session)' : 'Long (RoomClass)'
    })

    console.log('✅ Ultimate whiteboard validation passed - loading best UI')
    setIsLoading(false)
  }, [roomId, classId, router])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-xl">
          <div className="relative mx-auto mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">🎨 Loading Ultimate Whiteboard</h2>
          <p className="text-blue-600 font-medium">Preparing real-time collaboration...</p>
          <div className="mt-4 flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Session Error</h2>
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

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <WhiteboardProvider>
        <FullWhiteBoard
          isTeacher={true}
          bandwidthMode={bandwidthMode}
          roomId={roomId || ''}
          classId={classId || ''}
          userId={teacherId || ''} // Pass actual teacher ID for WebRTC signaling
          userName={teacherName}
          lectureTitle={lectureTitle}
          subject={subject}
        />
      </WhiteboardProvider>
    </div>
  )
}

export default function TeacherWhiteboardPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-xl">
          <div className="relative mx-auto mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Whiteboard...</h2>
        </div>
      </div>
    }>
      <TeacherWhiteboardContent />
    </Suspense>
  )
}
