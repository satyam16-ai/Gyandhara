'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
// @ts-ignore: allow importing component from src when path mappings or type declarations aren't available in this environment
import StudentClassroom from '../../src/components/StudentClassroom'

interface User {
  id: string
  name: string
  role: string
  token: string
}

export default function StudentClassroomPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [classData, setClassData] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('userToken')
    const userRole = localStorage.getItem('userRole')
    const userName = localStorage.getItem('userName')
    const userId = localStorage.getItem('userId')
    const currentRoomId = localStorage.getItem('currentRoomId')
    const currentClassId = localStorage.getItem('currentClassId')
    const currentClassData = localStorage.getItem('currentClassData')

    if (!token || userRole !== 'student') {
      router.push('/')
      return
    }

    if (!currentRoomId || !currentClassId) {
      router.push('/student-dashboard')
      return
    }

    setUser({
      id: userId || '',
      name: userName || '',
      role: userRole || '',
      token: token || ''
    })

    if (currentClassData) {
      try {
        const parsedClassData = JSON.parse(currentClassData)
        setClassData(parsedClassData)
        
        // Re-register student in case of page refresh
        const reJoinClass = async () => {
          try {
            console.log('🔄 Re-registering student after refresh...')
            const response = await fetch(`/api/room-classes/${currentClassId}/join`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                userId: userId,
                userName: userName
              })
            })

            if (response.ok) {
              console.log('✅ Student re-registered successfully')
            } else {
              console.warn('⚠️ Could not re-register student, but continuing...')
            }
          } catch (error) {
            console.warn('⚠️ Re-registration failed, but continuing...', error)
          }
        }
        
        reJoinClass()
      } catch (error) {
        console.error('Error parsing class data:', error)
      }
    }

    setLoading(false)
  }, [router])

  const handleLeaveClass = async () => {
    try {
      const userId = localStorage.getItem('userId')
      const classId = localStorage.getItem('currentClassId')
      
      if (userId && classId) {
        // Call the leave API to track attendance
        const leaveResponse = await fetch(`/api/room-classes/${classId}/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        })

        if (leaveResponse.ok) {
          const result = await leaveResponse.json()
          console.log('Class left successfully, attendance:', result.attendancePercentage + '%')
        } else {
          console.error('Failed to record class leave')
        }
      }
    } catch (error) {
      console.error('Error leaving class:', error)
    } finally {
      // Clean up localStorage and redirect regardless of API call result
      localStorage.removeItem('currentRoomId')
      localStorage.removeItem('currentClassId')
      localStorage.removeItem('currentClassData')
      router.push('/student-dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Joining classroom...</p>
        </div>
      </div>
    )
  }

  if (!user || !classData) {
    return null
  }

  return (
    <StudentClassroom 
      user={user}
      classData={classData}
      onLeaveClass={handleLeaveClass}
    />
  )
}
