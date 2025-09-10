'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DebugSessionPage() {
  const [sessionData, setSessionData] = useState<any>({})
  const [user, setUser] = useState<any>({})
  const router = useRouter()

  useEffect(() => {
    // Get all relevant localStorage data
    const data = {
      // User data
      userId: localStorage.getItem('userId'),
      userName: localStorage.getItem('userName'),
      userRole: localStorage.getItem('userRole'),
      userToken: localStorage.getItem('userToken'),
      
      // Session data
      currentRoomId: localStorage.getItem('currentRoomId'),
      currentClassId: localStorage.getItem('currentClassId'),
      currentSessionId: localStorage.getItem('currentSessionId'),
      currentClassroomId: localStorage.getItem('currentClassroomId'),
      currentLectureData: localStorage.getItem('currentLectureData'),
      
      // Check types and values
      roomIdType: typeof localStorage.getItem('currentRoomId'),
      roomIdLength: localStorage.getItem('currentRoomId')?.length || 0,
      lectureDataExists: !!localStorage.getItem('currentLectureData')
    }
    
    setSessionData(data)
    
    // Try to parse lecture data
    try {
      const lectureData = localStorage.getItem('currentLectureData')
      if (lectureData) {
        const parsed = JSON.parse(lectureData)
        setUser({ lectureData: parsed })
      }
    } catch (error) {
      console.error('Error parsing lecture data:', error)
    }
  }, [])

  const clearAllSessionData = () => {
    localStorage.removeItem('currentRoomId')
    localStorage.removeItem('currentClassId')
    localStorage.removeItem('currentSessionId')
    localStorage.removeItem('currentClassroomId')
    localStorage.removeItem('currentLectureData')
    
    alert('✅ All session data cleared!')
    window.location.reload()
  }

  const goToDashboard = () => {
    const role = localStorage.getItem('userRole')
    if (role === 'teacher') {
      router.push('/teacher-dashboard')
    } else {
      router.push('/student-dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">Session Debug Information</h1>
          
          <div className="space-y-6">
            {/* User Information */}
            <div>
              <h2 className="text-lg font-semibold mb-3 text-blue-600">User Information</h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>User ID:</strong> {sessionData.userId || 'Not set'}
                  </div>
                  <div>
                    <strong>User Name:</strong> {sessionData.userName || 'Not set'}
                  </div>
                  <div>
                    <strong>User Role:</strong> {sessionData.userRole || 'Not set'}
                  </div>
                  <div>
                    <strong>Token:</strong> {sessionData.userToken ? 'Present' : 'Missing'}
                  </div>
                </div>
              </div>
            </div>

            {/* Session Information */}
            <div>
              <h2 className="text-lg font-semibold mb-3 text-green-600">Session Information</h2>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Room ID:</strong> 
                    <span className={`ml-2 ${sessionData.currentRoomId && sessionData.roomIdLength > 10 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                      {sessionData.currentRoomId || 'Not set'}
                    </span>
                  </div>
                  <div>
                    <strong>Room ID Length:</strong> 
                    <span className={`ml-2 ${sessionData.roomIdLength > 10 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                      {sessionData.roomIdLength}
                      {sessionData.roomIdLength > 10 && ' (⚠️ TOO LONG!)'}
                    </span>
                  </div>
                  <div>
                    <strong>Room ID Type:</strong> {sessionData.roomIdType}
                  </div>
                  <div>
                    <strong>Class ID:</strong> {sessionData.currentClassId || 'Not set'}
                  </div>
                  <div>
                    <strong>Session ID:</strong> {sessionData.currentSessionId || 'Not set'}
                  </div>
                  <div>
                    <strong>Classroom ID:</strong> {sessionData.currentClassroomId || 'Not set'}
                  </div>
                </div>
              </div>
            </div>

            {/* Lecture Data */}
            <div>
              <h2 className="text-lg font-semibold mb-3 text-purple-600">Lecture Data</h2>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div>
                  <strong>Lecture Data Present:</strong> {sessionData.lectureDataExists ? '✅ Yes' : '❌ No'}
                </div>
                {user.lectureData && (
                  <div className="mt-2">
                    <strong>Parsed Data:</strong>
                    <pre className="bg-gray-800 text-green-400 p-3 rounded-lg mt-2 text-sm overflow-auto">
                      {JSON.stringify(user.lectureData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Raw localStorage Data */}
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-600">Raw localStorage Content</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="bg-gray-800 text-green-400 p-3 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(sessionData, null, 2)}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                onClick={clearAllSessionData}
                className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors"
              >
                🗑️ Clear All Session Data
              </button>
              <button
                onClick={goToDashboard}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                🏠 Go to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                🔄 Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
