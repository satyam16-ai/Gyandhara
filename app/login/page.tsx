'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UserLoginPage() {
  const router = useRouter()

  useEffect(() => {
    // After 3 seconds, redirect to the home page
    const timer = setTimeout(() => {
      router.push('/')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-3xl"></div>
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-xl"></div>
        
        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg">
              🔄
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
              Login Page Updated
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              We now have separate login pages for teachers and students for better security.
            </p>
          </div>

          {/* Role-specific login buttons */}
          <div className="space-y-4 mb-8">
            <Link
              href="/teacher-login"
              className="w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white block"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>👨‍🏫</span>
                <span>Teacher Login</span>
              </div>
            </Link>

            <Link
              href="/student-login"
              className="w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 text-white block"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>🎓</span>
                <span>Student Login</span>
              </div>
            </Link>
          </div>

          {/* Auto-redirect notice */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/60 text-blue-700 px-4 py-3 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-center">
              <span className="text-blue-500 mr-2">ℹ️</span>
              <span className="text-sm">Redirecting to role selection in 3 seconds...</span>
            </div>
          </div>

          {/* Back to Role Selection */}
          <div className="text-center pt-4 border-t border-gray-200/50 mt-6">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              ← Back to role selection
            </Link>
          </div>

          {/* Admin Portal Link */}
          <div className="text-center text-xs text-gray-500 mt-4">
            <Link 
              href="/admin-login"
              className="hover:text-gray-700 transition-colors inline-flex items-center space-x-1"
            >
              <span>🔐</span>
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
