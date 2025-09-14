'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NewTeacherDashboard from '../../../src/components/NewTeacherDashboard'

interface User {
  id: string
  name: string
  role: string
  token: string
}

export default function TeacherDashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in and is a teacher
    const token = localStorage.getItem('userToken')
    const role = localStorage.getItem('userRole')
    const name = localStorage.getItem('userName')
    const id = localStorage.getItem('userId')

    if (!token || role !== 'teacher') {
      router.push('/teacher-login')
      return
    }

    if (token && role === 'teacher' && name && id) {
      setUser({ id, name, role, token })
    }

    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen">
      <NewTeacherDashboard user={user} />
    </div>
  )
}
