'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '../../src/contexts/ThemeContext'
import NewStudentDashboard from '../../src/components/NewStudentDashboard'

interface User {
  id: string
  name: string
  role: string
  token: string
}

export default function StudentDashboardPage() {
  const { isDarkMode } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('userToken')
    const userRole = localStorage.getItem('userRole')
    const userName = localStorage.getItem('userName')
    const userId = localStorage.getItem('userId')

    if (!token || userRole !== 'student') {
      router.push('/student-login')
      return
    }

    setUser({
      id: userId || '',
      name: userName || '',
      role: userRole || '',
      token: token || ''
    })
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-black dark:via-gray-900 dark:to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-200 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen dark:bg-black">
      <NewStudentDashboard user={user} />
    </div>
  )
}
