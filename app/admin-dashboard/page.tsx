'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '../../src/contexts/ThemeContext'

interface User {
  _id: string
  username: string
  name: string
  email: string
  role: 'admin' | 'teacher' | 'student'
  isActive: boolean
  lastLogin?: string
  createdAt: string
  profile?: {
    phone?: string
    [key: string]: any
  }
}

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalSessions: number
  activeSessions: number
  totalTeachers: number
  totalStudents: number
}

export default function AdminDashboard() {
  const { isDarkMode } = useTheme()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [adminUser, setAdminUser] = useState<any>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    email: '',
    mobile: '',
    role: 'student',
    parentName: '',
    parentEmail: '',
    parentMobile: '',
    relationship: 'guardian'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showUserProfile, setShowUserProfile] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('adminToken')
    const user = localStorage.getItem('adminUser')
    
    if (!token || !user) {
      router.push('/admin-login')
      return
    }

    setAdminUser(JSON.parse(user))
    
    // Load initial data
    loadDashboardData()
  }, [router])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load stats
      const statsResponse = await fetch('/api/admin-secure/dashboard/stats', {
        headers: getAuthHeaders()
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Load users
      const usersResponse = await fetch('/api/admin-secure/users', {
        headers: getAuthHeaders()
      })
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users)
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    router.push('/admin-login')
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    console.log('Form data before validation:', newUser)

    // Client-side validation with explicit checks
    const trimmedName = newUser.name?.trim()
    const trimmedEmail = newUser.email?.trim()
    const trimmedMobile = newUser.mobile?.trim()

    if (!trimmedName) {
      setError('Name is required and cannot be empty')
      return
    }
    if (!trimmedEmail) {
      setError('Email is required and cannot be empty')
      return
    }
    if (!trimmedMobile) {
      setError('Mobile number is required and cannot be empty')
      return
    }
    
    // For students, validate parent details if any parent field is filled
    if (newUser.role === 'student') {
      const hasAnyParentField = newUser.parentName?.trim() || newUser.parentEmail?.trim() || newUser.parentMobile?.trim()
      if (hasAnyParentField) {
        if (!newUser.parentName?.trim()) {
          setError('Parent name is required when creating parent account')
          return
        }
        if (!newUser.parentEmail?.trim()) {
          setError('Parent email is required when creating parent account')
          return
        }
        if (!newUser.parentMobile?.trim()) {
          setError('Parent mobile number is required when creating parent account')
          return
        }
      }
    }

    // Sanitize the data before sending
    const userData = {
      name: trimmedName,
      email: trimmedEmail.toLowerCase(),
      mobile: trimmedMobile,
      role: newUser.role,
      ...(newUser.role === 'student' && newUser.parentName?.trim() && {
        parentName: newUser.parentName.trim(),
        parentEmail: newUser.parentEmail?.trim().toLowerCase(),
        parentMobile: newUser.parentMobile?.trim(),
        relationship: newUser.relationship
      })
    }

    console.log('Sending user data:', userData)

    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      console.log('Request headers:', headers)
      console.log('Request body:', JSON.stringify(userData))
      
      const response = await fetch('/api/admin-secure/users', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(userData),
        mode: 'cors'
      })
      
      console.log('Response status:', response.status)

      const data = await response.json()

      if (response.ok) {
        let successMessage = `User created successfully! Username: ${data.user.username}`
        if (data.parent) {
          successMessage += `\nParent account also created! Username: ${data.parent.username}`
          successMessage += `\nCredentials sent to both student and parent via email/SMS.`
        }
        setSuccess(successMessage)
        setNewUser({ 
          username: '', 
          name: '', 
          email: '', 
          mobile: '', 
          role: 'student',
          parentName: '',
          parentEmail: '',
          parentMobile: '',
          relationship: 'guardian'
        })
        setShowCreateUser(false)
        loadDashboardData()
      } else {
        setError(data.error || 'Failed to create user')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin-secure/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (response.ok) {
        loadDashboardData()
        setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update user status')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Are you sure you want to reset this user\'s password? A new temporary password will be sent to their email.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin-secure/users/${userId}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Password reset successfully. Instructions sent to user\'s email.')
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  const handleExportUsers = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await fetch(`/api/admin-secure/users/export?format=${format}`, {
        headers: getAuthHeaders()
      })

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `voiceboard-users-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        setSuccess('Users exported to CSV successfully!')
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `voiceboard-users-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        setSuccess('Users exported to JSON successfully!')
      }
    } catch (error) {
      console.error('Export error:', error)
      setError('Failed to export users. Please try again.')
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin-secure/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`User "${userName}" has been permanently deleted.`)
        loadDashboardData()
      } else {
        setError(data.error || 'Failed to delete user')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      setError('Please select users to perform bulk action')
      return
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedUsers.length} selected users?`)) {
      return
    }

    try {
      const response = await fetch('/api/admin-secure/users/bulk-action', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action,
          userIds: selectedUsers
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Bulk ${action} completed successfully. ${data.affectedCount} users affected.`)
        setSelectedUsers([])
        setShowBulkActions(false)
        loadDashboardData()
      } else {
        setError(data.error || `Failed to perform bulk ${action}`)
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  const handleViewUserProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin-secure/users/${userId}/profile`, {
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (response.ok) {
        setUserProfile(data)
        setShowUserProfile(userId)
      } else {
        setError(data.error || 'Failed to fetch user profile')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId])
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    }
  }

  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user._id))
    } else {
      setSelectedUsers([])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-black dark:via-gray-900 dark:to-black">{/* Enhanced Header */}
      <header className="border-b transition-colors bg-white/80 dark:bg-gray-900/90 backdrop-blur-sm border-purple-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              {/* GYANDHARA Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-300">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    GYANDHARA
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Admin Console</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Real-time Status */}
              <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-green-100 dark:bg-green-900/50 rounded-xl border border-green-200 dark:border-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">System Online</span>
              </div>

              {/* Admin Profile */}
              <div className="flex items-center space-x-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 border border-blue-200/50 dark:border-gray-600 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {adminUser?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="text-sm">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {adminUser?.name || 'Administrator'}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    🔐 Super Admin
                  </p>
                </div>
              </div>
              
              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="appearance-none border-0 focus:outline-none bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-bold hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center space-x-2 border-2 border-red-300/50 hover:border-red-400"
                title="Logout from Admin Portal"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="border-l-4 border-red-500 px-4 py-3 rounded-lg shadow-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-red-500 mr-3 text-lg">⚠️</span>
                <span className="font-medium">{error}</span>
              </div>
              <button 
                onClick={() => setError('')} 
                className="font-bold text-xl hover:scale-110 transition-transform text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="border-l-4 border-green-500 px-4 py-3 rounded-lg shadow-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-3 text-lg">✅</span>
                <span className="font-medium">{success}</span>
              </div>
              <button 
                onClick={() => setSuccess('')} 
                className="font-bold text-xl hover:scale-110 transition-transform text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Navigation Tabs */}
      <nav className="border-b border-purple-200/50 dark:border-gray-600/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 py-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊', color: 'purple' },
              { id: 'users', label: 'User Management', icon: '👥', color: 'blue' },
              { id: 'sessions', label: 'Live Sessions', icon: '🎓', color: 'green' },
              { id: 'settings', label: 'Settings', icon: '⚙️', color: 'gray' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-4 px-6 font-bold text-sm transition-all duration-300 rounded-2xl transform hover:scale-105 flex items-center space-x-3 border-2 ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${
                        tab.color === 'purple' ? 'from-purple-500 to-purple-600 border-purple-300' :
                        tab.color === 'blue' ? 'from-blue-500 to-blue-600 border-blue-300' :
                        tab.color === 'green' ? 'from-green-500 to-green-600 border-green-300' :
                        'from-gray-500 to-gray-600 border-gray-300'
                      } text-white shadow-lg`
                    : `text-gray-600 hover:text-gray-800 bg-white/80 border-gray-200 hover:border-${tab.color}-300 hover:bg-${tab.color}-50 shadow-md hover:shadow-lg`
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-blue-600">
              Platform Overview
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'blue', change: '+12%' },
                { label: 'Active Users', value: stats.activeUsers, icon: '🟢', color: 'green', change: '+8%' },
                { label: 'Teachers', value: stats.totalTeachers, icon: '🎓', color: 'purple', change: '+3%' },
                { label: 'Students', value: stats.totalStudents, icon: '📚', color: 'indigo', change: '+15%' },
                { label: 'Total Sessions', value: stats.totalSessions, icon: '📊', color: 'yellow', change: '+22%' },
                { label: 'Active Sessions', value: stats.activeSessions, icon: '🔴', color: 'red', change: 'Live' }
              ].map((stat) => (
                <div key={stat.label} className="p-6 rounded-xl border-2 bg-white border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`text-3xl mr-4 p-3 rounded-xl bg-gradient-to-r ${
                        stat.color === 'blue' ? 'from-blue-400 to-blue-500' :
                        stat.color === 'green' ? 'from-green-400 to-green-500' :
                        stat.color === 'purple' ? 'from-purple-400 to-purple-500' :
                        stat.color === 'indigo' ? 'from-indigo-400 to-indigo-500' :
                        stat.color === 'yellow' ? 'from-yellow-400 to-yellow-500' :
                        'from-red-400 to-red-500'
                      } text-white shadow-lg`}>
                        {stat.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-600">
                          {stat.label}
                        </p>
                        <p className="text-3xl font-bold text-gray-900">
                          {stat.value.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                      stat.change === 'Live' 
                        ? 'bg-red-100 text-red-600 animate-pulse' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {stat.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold text-blue-600">
                👥 User Management
              </h2>
              <div className="flex flex-wrap gap-3">
                {selectedUsers.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      {selectedUsers.length} selected
                    </span>
                    <button
                      onClick={() => setShowBulkActions(!showBulkActions)}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center space-x-2"
                    >
                      <span>⚡</span>
                      <span>Bulk Actions</span>
                    </button>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleExportUsers('csv')}
                    className="appearance-none border-0 focus:outline-none bg-gradient-to-r from-indigo-500 to-indigo-600 text-black px-4 py-2 rounded-lg font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center space-x-2"
                  >
                    <span>📊</span>
                    <span className="text-black font-bold transition-colors duration-200">
                      Export CSV
                    </span>
                  </button>
                  
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-black px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center space-x-2"
                  >
                    <span className="text-lg">👤</span>
                    <span>Create User</span>
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs">+</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Actions Panel */}
            {showBulkActions && selectedUsers.length > 0 && (
              <div className="p-4 rounded-xl border-2 bg-purple-50 border-purple-200">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleBulkAction('activate')}
                    className="bg-gradient-to-r from-green-400 to-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-500 hover:to-green-600 transition-all duration-300 flex items-center space-x-2"
                  >
                    <span>✅</span>
                    <span>Activate Selected</span>
                  </button>
                  
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    className="bg-gradient-to-r from-orange-400 to-orange-500 text-black px-4 py-2 rounded-lg font-semibold hover:from-orange-500 hover:to-orange-600 transition-all duration-300 flex items-center space-x-2"
                  >
                    <span>⏸️</span>
                    <span>Deactivate Selected</span>
                  </button>
                  
                    <button
                    onClick={() => handleBulkAction('delete')}
                    className="bg-gradient-to-r from-red-400 to-red-500 text-black px-4 py-2 rounded-lg font-semibold hover:from-red-500 hover:to-red-600 transition-all duration-300 flex items-center space-x-2"
                    >
                    <span>🗑️</span>
                    <span>Delete Selected</span>
                    </button>
                  
                  <button
                    onClick={() => {
                      setSelectedUsers([])
                      setShowBulkActions(false)
                    }}
                    className="px-4 py-2 rounded-lg font-semibold transition-all duration-300 bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Create User Modal */}
            {showCreateUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 rounded-2xl shadow-2xl bg-gradient-to-br from-white via-blue-50 to-purple-50 border border-white/20 backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                        ✨ Create New User
                      </h3>
                      <p className="text-gray-600">Add a new student, teacher, or admin to GYANDHARA platform</p>
                    </div>
                    <button
                      onClick={() => setShowCreateUser(false)}
                      className="p-3 rounded-xl transition-all duration-300 hover:bg-red-100 text-gray-500 hover:text-red-600 hover:rotate-90 transform"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <form onSubmit={handleCreateUser} className="space-y-8">
                    {/* Student/Teacher/Admin Information Section */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/20 shadow-lg">
                      <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                        User Information
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            👤 Full Name *
                          </label>
                          <input
                            type="text"
                            placeholder="Enter full name"
                            value={newUser.name}
                            onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                            className="w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white/90 border-gray-200 text-gray-900 placeholder-gray-400 hover:border-blue-300"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📧 Email Address *
                          </label>
                          <input
                            type="email"
                            placeholder="Enter email address"
                            value={newUser.email}
                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            className="w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white/90 border-gray-200 text-gray-900 placeholder-gray-400 hover:border-blue-300"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📱 Mobile Number *
                          </label>
                          <input
                            type="tel"
                            placeholder="e.g., +919876543210"
                            value={newUser.mobile}
                            onChange={(e) => setNewUser({...newUser, mobile: e.target.value})}
                            className="w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white/90 border-gray-200 text-gray-900 placeholder-gray-400 hover:border-blue-300"
                            required
                          />
                          <p className="text-xs text-gray-500 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Include country code (e.g., +91 for India)
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🎭 Role *
                          </label>
                          <select
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            className="w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white/90 border-gray-200 text-gray-900 hover:border-blue-300"
                          >
                            <option value="student">🎓 Student</option>
                            <option value="teacher">👨‍🏫 Teacher</option>
                            <option value="admin">🔐 Admin</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Parent Details Section - Only show for students */}
                    {newUser.role === 'student' && (
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-2xl border-2 border-green-200/50 shadow-lg">
                        <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                          </div>
                          👨‍👩‍👧‍👦 Parent/Guardian Information
                        </h4>
                        <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl mb-6 border border-white/30">
                          <p className="text-sm text-gray-700 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <strong>Auto-Creation:</strong> Parent account will be automatically created with login credentials sent via email and SMS.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              👤 Parent/Guardian Name *
                            </label>
                            <input
                              type="text"
                              placeholder="Enter parent/guardian full name"
                              value={newUser.parentName}
                              onChange={(e) => setNewUser({...newUser, parentName: e.target.value})}
                              className="w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:ring-4 focus:ring-green-500/20 focus:border-green-500 bg-white/90 border-gray-200 text-gray-900 placeholder-gray-400 hover:border-green-300"
                              required={newUser.role === 'student'}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              📧 Parent Email Address *
                            </label>
                            <input
                              type="email"
                              placeholder="Enter parent email address"
                              value={newUser.parentEmail}
                              onChange={(e) => setNewUser({...newUser, parentEmail: e.target.value})}
                              className="w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:ring-4 focus:ring-green-500/20 focus:border-green-500 bg-white/90 border-gray-200 text-gray-900 placeholder-gray-400 hover:border-green-300"
                              required={newUser.role === 'student'}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              📱 Parent Mobile Number *
                            </label>
                            <input
                              type="tel"
                              placeholder="e.g., +919876543210"
                              value={newUser.parentMobile}
                              onChange={(e) => setNewUser({...newUser, parentMobile: e.target.value})}
                              className="w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:ring-4 focus:ring-green-500/20 focus:border-green-500 bg-white/90 border-gray-200 text-gray-900 placeholder-gray-400 hover:border-green-300"
                              required={newUser.role === 'student'}
                            />
                            <p className="text-xs text-green-600 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                              </svg>
                              Parent will receive login credentials via email and SMS
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              🤝 Relationship to Student
                            </label>
                            <select
                              value={newUser.relationship}
                              onChange={(e) => setNewUser({ ...newUser, relationship: e.target.value })}
                              className="w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:ring-4 focus:ring-green-500/20 focus:border-green-500 bg-white/90 border-gray-200 text-gray-900 hover:border-green-300"
                            >
                              <option value="guardian">🏠 Guardian</option>
                              <option value="father">👨 Father</option>
                              <option value="mother">👩 Mother</option>
                              <option value="relative">🤝 Relative</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-xl mt-6 border border-green-200">
                          <h5 className="font-semibold text-gray-800 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            🎯 Parent Portal Features
                          </h5>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li className="flex items-center"><span className="text-green-500 mr-2">•</span> Real-time student progress tracking</li>
                            <li className="flex items-center"><span className="text-blue-500 mr-2">•</span> Attendance monitoring and reports</li>
                            <li className="flex items-center"><span className="text-purple-500 mr-2">•</span> Direct teacher communication</li>
                            <li className="flex items-center"><span className="text-pink-500 mr-2">•</span> Instant notifications and updates</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Information Note */}
                    <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-2xl border-2 border-blue-200/50">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-800 mb-2">💡 Automatic Account Setup</h5>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            A temporary <strong>username</strong> and <strong>password</strong> will be automatically generated and sent to the user's email address and mobile number via SMS. 
                            Users will be required to change their password on first login for security.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-4 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 text-white py-4 px-8 rounded-2xl font-bold hover:from-green-600 hover:via-blue-600 hover:to-purple-600 transition-all duration-300 focus:ring-4 focus:ring-blue-500/50 transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-3"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        <span>Create User Account</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateUser(false)}
                        className="px-8 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="rounded-xl border-2 overflow-hidden shadow-xl bg-white border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === users.length && users.length > 0}
                            onChange={(e) => handleSelectAllUsers(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span>Select</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                        <div className="flex items-center space-x-2">
                          <span>👤</span>
                          <span>User Information</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                        <div className="flex items-center space-x-2">
                          <span>🏷️</span>
                          <span>Role</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                        <div className="flex items-center space-x-2">
                          <span>📊</span>
                          <span>Status</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                        <div className="flex items-center space-x-2">
                          <span>🕒</span>
                          <span>Last Login</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                        <div className="flex items-center space-x-2">
                          <span>⚡</span>
                          <span>Actions</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user, index) => (
                      <tr key={user._id} className={`transition-all duration-200 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user._id)}
                              onChange={(e) => handleSelectUser(user._id, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              disabled={user.role === 'admin'}
                            />
                            {user.role === 'admin' && (
                              <span className="text-xs text-gray-500" title="Admin users cannot be selected for bulk actions">
                                🔒
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleViewUserProfile(user._id)}
                              className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold hover:scale-110 transition-transform"
                              title="View user profile"
                            >
                              {user.name.charAt(0).toUpperCase()}
                            </button>
                            <div>
                              <div className="font-semibold text-lg">{user.name}</div>
                              <div className="text-sm text-gray-500">
                                📧 {user.email}
                              </div>
                              {user.profile?.phone && (
                                <div className="text-sm text-gray-500">
                                  📱 {user.profile.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold shadow-md ${
                            user.role === 'admin' 
                              ? 'bg-gradient-to-r from-red-400 to-red-500 text-black' 
                              : user.role === 'teacher'
                                ? 'bg-gradient-to-r from-purple-400 to-purple-500 text-black'
                                : 'bg-gradient-to-r from-blue-400 to-blue-500 text-black'
                          }`}>
                            <span className="mr-1">
                              {user.role === 'admin' ? '🔐' : user.role === 'teacher' ? '👨‍🏫' : '🎓'}
                            </span>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold shadow-md ${
                            user.isActive 
                              ? 'bg-gradient-to-r from-green-400 to-green-500 text-black animate-pulse' 
                              : 'bg-gradient-to-r from-gray-400 to-gray-500 text-black'
                          }`}>
                            <span className="mr-1">{user.isActive ? '🟢' : '🔴'}</span>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <span>📅</span>
                            <span className="font-medium">
                              {user.lastLogin 
                                ? new Date(user.lastLogin).toLocaleDateString()
                                : 'Never logged in'
                              }
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center space-x-1 ${
                                user.isActive
                                  ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-500 hover:to-orange-600'
                                  : 'bg-gradient-to-r from-green-400 to-green-500 text-black hover:from-green-500 hover:to-green-600'
                              }`}
                              title={user.isActive ? 'Deactivate user' : 'Activate user'}
                            >
                              <span>{user.isActive ? '⏸️' : '▶️'}</span>
                              <span>{user.isActive ? 'Deactivate' : 'Activate'}</span>
                            </button>
                            
                            <button
                              onClick={() => handleResetPassword(user._id)}
                              className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-400 to-blue-500 text-black hover:from-blue-500 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center space-x-1"
                              title="Reset user password"
                            >
                              <span>🔑</span>
                              <span>Reset</span>
                            </button>

                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(user._id, user.name)}
                                className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-red-400 to-red-500 text-black hover:from-red-500 hover:to-red-600 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center space-x-1"
                                title="Delete user permanently"
                              >
                                <span>🗑️</span>
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User Profile Modal */}
            {showUserProfile && userProfile && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="w-full max-w-2xl p-6 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto bg-white border border-gray-200">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {userProfile.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {userProfile.user.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {userProfile.user.email}
                        </p>
                        {userProfile.user.profile?.phone && (
                          <p className="text-sm text-gray-600">
                            📱 {userProfile.user.profile.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserProfile(null)
                        setUserProfile(null)
                      }}
                      className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* User Details */}
                    <div className="p-4 rounded-lg bg-gray-50">
                      <h4 className="font-semibold mb-3 text-gray-900">
                        👤 Account Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Username
                          </label>
                          <p className="font-mono text-gray-900">
                            {userProfile.user.username || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Role
                          </label>
                          <p className={`font-semibold ${
                            userProfile.user.role === 'admin' ? 'text-red-500' :
                            userProfile.user.role === 'teacher' ? 'text-purple-500' :
                            'text-blue-500'
                          }`}>
                            {userProfile.user.role.charAt(0).toUpperCase() + userProfile.user.role.slice(1)}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Status
                          </label>
                          <p className={`font-semibold ${
                            userProfile.user.isActive ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {userProfile.user.isActive ? '🟢 Active' : '🔴 Inactive'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Account Age
                          </label>
                          <p className="text-gray-900">
                            {userProfile.stats.accountAge} days
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Activity Stats */}
                    <div className="p-4 rounded-lg bg-gray-50">
                      <h4 className="font-semibold mb-3 text-gray-900">
                        📊 Activity Statistics
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Last Login
                          </label>
                          <p className="text-gray-900">
                            {userProfile.user.lastLogin 
                              ? new Date(userProfile.user.lastLogin).toLocaleDateString()
                              : 'Never'
                            }
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Days Since Last Login
                          </label>
                          <p className="text-gray-900">
                            {userProfile.stats.lastLoginDays !== null 
                              ? `${userProfile.stats.lastLoginDays} days`
                              : 'Never logged in'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Account Dates */}
                    <div className="p-4 rounded-lg bg-gray-50">
                      <h4 className="font-semibold mb-3 text-gray-900">
                        📅 Important Dates
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">
                            Account Created:
                          </span>
                          <span className="text-gray-900">
                            {new Date(userProfile.user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {userProfile.user.updatedAt && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-700">
                              Last Updated:
                            </span>
                            <span className="text-gray-900">
                              {new Date(userProfile.user.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-blue-600">
              🎓 Session Management
            </h2>
            <div className="p-8 text-center rounded-xl border-2 bg-blue-50 border-blue-200 text-gray-700">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">
                Session Management Coming Soon
              </h3>
              <p className="text-gray-600">
                Advanced session analytics, monitoring, and management tools are currently in development.
              </p>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-blue-600">
              ⚙️ Platform Settings
            </h2>
            <div className="p-8 text-center rounded-xl border-2 bg-purple-50 border-purple-200 text-gray-700">
              <div className="text-6xl mb-4">🛠️</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">
                Advanced Settings Panel
              </h3>
              <p className="text-gray-600">
                System configuration, security settings, and platform customization options coming soon.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
