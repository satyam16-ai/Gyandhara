'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TeacherLoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    mobile: '',
    username: '',
    password: '',
    confirmPassword: ''
  })
  const router = useRouter()

  useEffect(() => {
    // Check for existing user token
    const token = localStorage.getItem('userToken')
    const userRole = localStorage.getItem('userRole')
    
    if (token && userRole) {
      // Only redirect if user is actually a teacher
      if (userRole === 'teacher') {
        router.push('/rooms')
      } else {
        // Clear invalid token for wrong role
        localStorage.removeItem('userToken')
        localStorage.removeItem('userRole')
        localStorage.removeItem('userId')
        localStorage.removeItem('userName')
      }
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          role: 'teacher' // Fixed role for teacher login
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Verify the user is actually a teacher
        if (data.user.role !== 'teacher') {
          setError('Invalid credentials. This is the teacher login page.')
          return
        }

        localStorage.setItem('userToken', data.token)
        localStorage.setItem('userRole', data.user.role)
        localStorage.setItem('userId', data.user._id)
        localStorage.setItem('userName', data.user.name)
        
        router.push('/rooms')
      } else {
        setError(data.message || data.error || 'Invalid teacher credentials')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          mobile: registerData.mobile,
          username: registerData.username,
          password: registerData.password,
          role: 'teacher' // Fixed role for teacher registration
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('userToken', data.token)
        localStorage.setItem('userRole', data.user.role)
        localStorage.setItem('userId', data.user._id)
        localStorage.setItem('userName', data.user.name)
        
        router.push('/rooms')
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isRegister) {
      setRegisterData({
        ...registerData,
        [e.target.name]: e.target.value
      })
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-3xl"></div>
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-blue-400/20 rounded-full blur-xl"></div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg">
              👨‍🏫
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-purple-700 bg-clip-text text-transparent mb-3">
              Teacher {isRegister ? 'Registration' : 'Login'}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {isRegister 
                ? 'Create your teacher account to start educating'
                : 'Welcome back! Access your teaching dashboard'
              }
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200/60 text-red-700 px-4 py-3 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                {error}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-6">
            {isRegister && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={registerData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={registerData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="mobile" className="block text-sm font-semibold text-gray-700 mb-2">
                    Mobile Number
                  </label>
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    required
                    value={registerData.mobile}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
                    placeholder="Enter mobile number (e.g., +1234567890)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    📱 Include country code for SMS notifications
                  </p>
                </div>
              </>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={isRegister ? registerData.username : formData.username}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
                placeholder="Enter your teacher username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={isRegister ? registerData.password : formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
                placeholder="Enter your password"
              />
            </div>

            {isRegister && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={registerData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
                  placeholder="Confirm your password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`appearance-none border-0 focus:outline-none w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700'
              } text-white`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isRegister ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>{isRegister ? '✨' : '🚀'}</span>
                  <span>{isRegister ? 'Create Teacher Account' : 'Sign In as Teacher'}</span>
                </div>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister)
                setError('')
              }}
              className="text-sm bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
            >
              {isRegister 
                ? 'Already have a teacher account? Sign in' 
                : "Don't have a teacher account? Register"
              }
            </button>
          </div>

          {/* Navigation */}
          <div className="text-center pt-4 border-t border-gray-200/50 space-y-2">
            <Link
              href="/"
              className="block text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              ← Back to role selection
            </Link>
            <Link
              href="/student-login"
              className="block text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Student? Login here →
            </Link>
          </div>

          {/* Admin Portal Link */}
          <div className="text-center text-xs text-gray-500">
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
