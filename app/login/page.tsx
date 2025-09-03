'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserLoginProps {
  role?: 'teacher' | 'student'
  onBack?: () => void
}

export default function UserLogin({ role, onBack }: UserLoginProps) {
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
    if (token) {
      const userRole = localStorage.getItem('userRole')
      // Redirect both teachers and students to the new room system
      router.push('/rooms')
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
          role: role
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('userToken', data.token)
        localStorage.setItem('userRole', data.user.role)
        localStorage.setItem('userId', data.user._id)
        localStorage.setItem('userName', data.user.name)
        
        // Redirect to the new room system for both teachers and students
        router.push('/rooms')
      } else {
        setError(data.error || 'Login failed')
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
          role: role
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('userToken', data.token)
        localStorage.setItem('userRole', data.user.role)
        localStorage.setItem('userId', data.user._id)
        localStorage.setItem('userName', data.user.name)
        
        // Redirect to the new room system for both teachers and students
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

  const getRoleColor = () => {
    return role === 'teacher' ? 'blue' : 'green'
  }

  const getRoleIcon = () => {
    return role === 'teacher' ? '👨‍🏫' : '🎓'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-3xl"></div>
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-xl"></div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg">
              {getRoleIcon()}
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
              {role === 'teacher' ? 'Teacher' : 'Student'} {isRegister ? 'Registration' : 'Login'}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {isRegister 
                ? `Create your ${role} account to get started`
                : `Welcome back! Sign in to your ${role} account`
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
                placeholder="Enter your username"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
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
                  : `bg-gradient-to-r ${
                      role === 'teacher' 
                        ? 'from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700' 
                        : 'from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700'
                    }`
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
                  <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
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
              className="text-sm bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium"
            >
              {isRegister 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Register"
              }
            </button>
          </div>

          {/* Back to Role Selection */}
          {onBack && (
            <div className="text-center pt-4 border-t border-gray-200/50">
              <button
                onClick={onBack}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
              >
                ← Back to role selection
              </button>
            </div>
          )}

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
