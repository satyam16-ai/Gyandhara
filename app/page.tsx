'use client'

import { useState, useEffect } from 'react'
import LandingPage from '../src/components/LandingPage'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | 'parent' | null>(null)
  const router = useRouter()

  // Handle navigation in useEffect to avoid render-time side effects
  useEffect(() => {
    if (selectedRole === 'teacher') {
      router.push('/teacher-login')
    } else if (selectedRole === 'student') {
      router.push('/student-login')
    } else if (selectedRole === 'parent') {
      router.push('/parent-login')
    }
  }, [selectedRole, router])

  if (!selectedRole) {
    return <LandingPage onSelectUserType={setSelectedRole} />
  }

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  )
}
