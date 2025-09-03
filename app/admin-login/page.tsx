'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function PasswordStrength({ value }: { value: string }) {
  if (!value) return null
  const score = (() => {
    let s = 0
    if (value.length >= 8) s++
    if (/[A-Z]/.test(value)) s++
    if (/[0-9]/.test(value)) s++
    if (/[^A-Za-z0-9]/.test(value)) s++
    return s
  })()

  const labels = ['Very weak', 'Weak', 'Okay', 'Strong', 'Very strong']
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-green-600']

  return (
    <div className="mt-2">
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div className={`${colors[score]} h-2`} style={{ width: `${(score / 4) * 100}%` }} />
      </div>
      <p className="text-xs mt-1 text-gray-500">{labels[score]}</p>
    </div>
  )
}

export default function AdminLogin() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const validate = () => {
    if (!username.trim()) return 'Please enter username or email'
    if (!password) return 'Please enter your password'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const v = validate()
    if (v) {
      setError(v)
      return
    }

    setLoading(true)
    try {
      console.log('🔐 Attempting admin login:', { username: username.trim() })
      
      const res = await fetch('/api/admin-secure/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      })

      console.log('📡 Response status:', res.status)
      const data = await res.json()
      console.log('📊 Response data:', data)

      if (!res.ok) {
        setError(data?.error || 'Invalid credentials')
        setLoading(false)
        return
      }

      if (data.token) {
        localStorage.setItem('adminToken', data.token)
        console.log('💾 Token saved to localStorage')
      }
      if (data.admin) {
        localStorage.setItem('adminUser', JSON.stringify(data.admin))
        console.log('👤 Admin user data saved:', data.admin)
      }

      console.log('✅ Login successful, redirecting to dashboard...')
      // Small delay for UX so success feels noticeable
      setTimeout(() => router.push('/admin-dashboard'), 500)
    } catch (err) {
      console.error('❌ Login error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Prevent hydration mismatch by not rendering content until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl bg-white border border-gray-200">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-300 rounded-lg"></div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-16"></div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-12 bg-gray-300 rounded-lg"></div>
              <div className="h-12 bg-gray-300 rounded-lg"></div>
              <div className="h-12 bg-gray-300 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Modern geometric background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-md w-full transform transition-all duration-500 relative z-10">
        <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white/80 backdrop-blur-xl border border-white/60">
          {/* Modern header accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <div className="p-8 text-gray-900">
            <div className="flex items-center justify-center mb-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white text-2xl font-bold shadow-lg">
                  <span className="relative z-10">🔐</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Admin Portal
                </h1>
                <p className="text-sm text-gray-600">Secure access to Gyaandhara dashboard</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200" role="alert">
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">⚠️</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username or Email
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200 hover:border-gray-400"
                  placeholder="admin or admin@gyaandhara.com"
                  aria-label="Username or email"
                  autoComplete="username"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    onClick={() => alert('Password reset available via the admin panel or contact support.')}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-lg px-4 py-3 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200 hover:border-gray-400"
                    placeholder="Enter your password"
                    aria-label="Password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <PasswordStrength value={password} />
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center text-sm text-gray-700">
                  <input 
                    type="checkbox" 
                    checked={remember} 
                    onChange={(e) => setRemember(e.target.checked)} 
                    className="h-4 w-4 text-blue-600 rounded mr-2 border-gray-300 focus:ring-blue-500" 
                  />
                  Remember me
                </label>

                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                  Default: <span className="font-mono font-medium">admin / admin123</span>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`appearance-none border-0 focus:outline-none w-full inline-flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-semibold
                  ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}
                  text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
                aria-label={loading ? 'Signing in...' : 'Sign In to Admin Portal'}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span className="text-white font-semibold">Signing in...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🚀</span>
                    <span className="font-semibold text-white">Sign In to Admin Portal</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-3 flex items-center justify-center space-x-1">
                  <span>🔒</span>
                  <span>Secure SSL encrypted connection</span>
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  ← Back to VoiceBoard Platform
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
