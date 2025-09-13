'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Heart, Users, BookOpen, BarChart3, Bell, Shield } from 'lucide-react'

export default function ParentLoginPage() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          role: 'parent'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Store auth token and user info
        if (typeof window !== 'undefined') {
          localStorage.setItem('authToken', data.token)
          localStorage.setItem('userRole', 'parent')
          localStorage.setItem('userInfo', JSON.stringify(data.user))
        }
        
        // Redirect to parent dashboard
        router.push('/parent-dashboard')
      } else {
        setError(data.message || 'Invalid credentials. Please check your username and password.')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Login failed. Please check your internet connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            GYANDHARA
          </h2>
          <p className="text-lg text-gray-600 mb-1">Parent Portal</p>
          <p className="text-sm text-gray-500">Monitor your child's learning journey</p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-white/70 rounded-lg border border-purple-100">
            <BarChart3 className="h-6 w-6 text-purple-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Progress Tracking</p>
          </div>
          <div className="text-center p-3 bg-white/70 rounded-lg border border-blue-100">
            <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Teacher Communication</p>
          </div>
          <div className="text-center p-3 bg-white/70 rounded-lg border border-green-100">
            <BookOpen className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Attendance Records</p>
          </div>
          <div className="text-center p-3 bg-white/70 rounded-lg border border-pink-100">
            <Bell className="h-6 w-6 text-pink-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Real-time Updates</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="Enter your username"
                value={credentials.username}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="appearance-none relative block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || !credentials.username || !credentials.password}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Access Parent Portal
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">First time logging in?</p>
                <p>Use the credentials sent to your email/SMS and change your password after login for security.</p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Need help? Contact support at{' '}
              <a href="mailto:support@gyandhara.edu" className="text-purple-600 hover:text-purple-700">
                support@gyandhara.edu
              </a>
            </p>
          </div>
        </div>

        {/* Back to Main */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Main Portal
          </button>
        </div>
      </div>
    </div>
  )
}