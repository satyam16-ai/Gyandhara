// API service for Gyaandhara with MongoDB backend

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gyandhara-backend.onrender.com'

// API utility functions
class GyaandharaAPI {
  // Health check
  static async healthCheck() {
    const response = await fetch(`${API_BASE}/api/health`)
    return response.json()
  }

  // Session management
  static async createSession(sessionData: {
    teacherId: string
    teacherName: string
    title: string
    subject?: string
    bandwidthMode?: 'ultra-low' | 'low' | 'normal'
  }) {
    const response = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    })
    return response.json()
  }

  static async joinSession(sessionId: string, userData: {
    userId: string
    userName: string
    role?: 'student' | 'teacher'
    bandwidthMode?: 'ultra-low' | 'low' | 'normal'
  }) {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })
    return response.json()
  }

  static async getSession(sessionId: string) {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`)
    return response.json()
  }

  static async getActiveSessions() {
    const response = await fetch(`${API_BASE}/api/sessions`)
    return response.json()
  }

  // Generate unique IDs for users and sessions
  static generateUserId() {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  static generateSessionId() {
    return 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

export default GyaandharaAPI
