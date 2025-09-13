'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
    relationship: 'parent'
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

    try {
      const response = await fetch('/api/admin-secure/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser)
      })

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
          relationship: 'parent'
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50">
      {/* Header */}
      <header className="border-b transition-colors bg-white border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                🔐 VoiceBoard Admin
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-blue-50">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {adminUser?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">
                    {adminUser?.name || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-600">
                    Administrator
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleLogout}
                className="appearance-none border-0 focus:outline-none bg-gradient-to-r from-red-400 to-red-500 text-black px-6 py-3 rounded-xl font-bold hover:from-red-500 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center space-x-2 border-2 border-red-300 hover:border-red-400"
                title="Logout from Admin Portal"
              >
                <span className="text-xl">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="border-l-4 border-red-500 px-4 py-3 rounded-lg shadow-md bg-red-50 text-red-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-red-500 mr-3 text-lg">⚠️</span>
                <span className="font-medium">{error}</span>
              </div>
              <button 
                onClick={() => setError('')} 
                className="font-bold text-xl hover:scale-110 transition-transform text-red-600 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="border-l-4 border-green-500 px-4 py-3 rounded-lg shadow-md bg-green-50 text-green-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-3 text-lg">✅</span>
                <span className="font-medium">{success}</span>
              </div>
              <button 
                onClick={() => setSuccess('')} 
                className="font-bold text-xl hover:scale-110 transition-transform text-green-600 hover:text-green-700"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'users', label: 'Users', icon: '👥' },
              { id: 'sessions', label: 'Sessions', icon: '🎓' },
              { id: 'settings', label: 'Settings', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-4 px-6 font-semibold text-sm transition-all duration-300 rounded-t-lg ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 border-b-2 border-blue-500 shadow-md'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                } transform hover:scale-105 flex items-center space-x-2`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
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
            <h2 className="text-2xl font-bold text-gray-900">
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
              <h2 className="text-2xl font-bold text-gray-900">
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
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="w-full max-w-lg p-6 rounded-xl shadow-2xl bg-white border border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      👤 Create New User
                    </h3>
                    <button
                      onClick={() => setShowCreateUser(false)}
                      className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter full name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        placeholder="Enter email address"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        placeholder="Enter mobile number (e.g., +1234567890)"
                        value={newUser.mobile}
                        onChange={(e) => setNewUser({...newUser, mobile: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        📱 Include country code (e.g., +91 for India, +1 for US)
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        Role *
                      </label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-black"
                      >
                        <option value="student">🎓 Student</option>
                        <option value="teacher">👨‍🏫 Teacher</option>
                        <option value="admin">🔐 Admin</option>
                      </select>
                    </div>

                    {/* Parent Details Section - Only show for students */}
                    {newUser.role === 'student' && (
                      <div className="border-t pt-4 mt-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          👨‍👩‍👧‍👦 Parent/Guardian Information
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Parent account will be automatically created to monitor student progress.
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">
                              Parent/Guardian Name *
                            </label>
                            <input
                              type="text"
                              placeholder="Enter parent/guardian full name"
                              value={newUser.parentName}
                              onChange={(e) => setNewUser({...newUser, parentName: e.target.value})}
                              className="w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                              required={newUser.role === 'student'}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">
                              Parent Email Address *
                            </label>
                            <input
                              type="email"
                              placeholder="Enter parent email address"
                              value={newUser.parentEmail}
                              onChange={(e) => setNewUser({...newUser, parentEmail: e.target.value})}
                              className="w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                              required={newUser.role === 'student'}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">
                              Parent Mobile Number *
                            </label>
                            <input
                              type="tel"
                              placeholder="Enter parent mobile number (e.g., +1234567890)"
                              value={newUser.parentMobile}
                              onChange={(e) => setNewUser({...newUser, parentMobile: e.target.value})}
                              className="w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                              required={newUser.role === 'student'}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              📱 Parent will receive login credentials via email and SMS
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">
                              Relationship to Student
                            </label>
                            <select
                              value={newUser.relationship}
                              onChange={(e) => setNewUser({ ...newUser, relationship: e.target.value })}
                              className="w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-black"
                            >
                              <option value="parent">👨‍👩‍👧‍👦 Parent</option>
                              <option value="guardian">🏠 Guardian</option>
                              <option value="father">👨 Father</option>
                              <option value="mother">👩 Mother</option>
                              <option value="sibling">👫 Sibling</option>
                              <option value="other">🤝 Other</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="p-4 rounded-lg bg-green-50 mt-4">
                          <p className="text-sm text-green-700">
                            🎯 <strong>Parent Portal Features:</strong> Progress tracking, attendance monitoring, teacher communication, and real-time notifications.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="p-4 rounded-lg bg-blue-50">
                      <p className="text-sm text-blue-700">
                        💡 <strong>Note:</strong> A temporary username and password will be generated and sent to both the user's email address and mobile number via SMS. 
                        The user will be required to change the password on first login.
                      </p>
                    </div>
                    
                    <div className="flex space-x-3 pt-6">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-black py-4 px-6 rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all duration-300 focus:ring-4 focus:ring-green-500/50 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                      >
                        <span>✅</span>
                        <span>Create User</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateUser(false)}
                        className="flex-1 py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300"
                      >
                        ❌ Cancel
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
            <h2 className="text-2xl font-bold text-gray-900">
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
            <h2 className="text-2xl font-bold text-gray-900">
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
