// WebSocket service for real-time communication with MongoDB backend

import { io, Socket } from 'socket.io-client'
import { StrokeData, ChatMessage } from '../types'

class WebSocketService {
  private socket: Socket | null = null
  private serverUrl: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gyandhara-backend.onrender.com'
  }

  // Connect to WebSocket server
  connect() {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(this.serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    })

    this.setupEventHandlers()
    return this.socket
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Join a session room
  joinSession(sessionData: {
    sessionId: string
    userId: string
    userName: string
    role: 'teacher' | 'student'
  }) {
    if (!this.socket) {
      console.error('Socket not connected')
      return
    }

    this.socket.emit('join-session', sessionData)
  }

  // Send a new stroke to the session
  sendStroke(strokeData: StrokeData) {
    if (!this.socket) {
      console.error('Socket not connected')
      return
    }

    this.socket.emit('new-stroke', strokeData)
  }

  // Send chat message
  sendChatMessage(messageData: {
    message: string
    messageType?: 'text' | 'voice' | 'question'
  }) {
    if (!this.socket) {
      console.error('Socket not connected')
      return
    }

    this.socket.emit('chat-message', messageData)
  }

  // Raise/lower hand
  raiseHand(raised: boolean) {
    if (!this.socket) {
      console.error('Socket not connected')
      return
    }

    this.socket.emit('hand-raise', { raised })
  }

  // Change bandwidth mode
  changeBandwidth(mode: 'ultra-low' | 'low' | 'normal') {
    if (!this.socket) {
      console.error('Socket not connected')
      return
    }

    this.socket.emit('bandwidth-change', { mode })
  }

  // Clear canvas (teacher only)
  clearCanvas() {
    if (!this.socket) {
      console.error('Socket not connected')
      return
    }

    this.socket.emit('clear-canvas')
  }

  // Event listeners
  onStrokeAdded(callback: (stroke: StrokeData) => void) {
    this.socket?.on('stroke-added', callback)
  }

  onMessageReceived(callback: (message: ChatMessage) => void) {
    this.socket?.on('message-received', callback)
  }

  onUserJoined(callback: (user: any) => void) {
    this.socket?.on('user-joined', callback)
  }

  onUserLeft(callback: (user: any) => void) {
    this.socket?.on('user-left', callback)
  }

  onHandRaised(callback: (data: any) => void) {
    this.socket?.on('hand-raised', callback)
  }

  onCanvasCleared(callback: () => void) {
    this.socket?.on('canvas-cleared', callback)
  }

  onSessionState(callback: (state: any) => void) {
    this.socket?.on('session-state', callback)
  }

  onBandwidthChanged(callback: (data: any) => void) {
    this.socket?.on('user-bandwidth-changed', callback)
  }

  // Connection status
  onConnect(callback: () => void) {
    this.socket?.on('connect', callback)
  }

  onDisconnect(callback: () => void) {
    this.socket?.on('disconnect', callback)
  }

  onError(callback: (error: any) => void) {
    this.socket?.on('error', callback)
  }

  // Remove event listeners
  removeAllListeners() {
    this.socket?.removeAllListeners()
  }

  removeListener(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.socket?.off(event, callback)
    } else {
      this.socket?.off(event)
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Get socket ID
  getSocketId(): string | undefined {
    return this.socket?.id
  }

  // Private method to setup event handlers
  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ Connected to Gyaandhara server')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason)
    })

    this.socket.on('error', (error) => {
      console.error('🚨 WebSocket error:', error)
    })

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached')
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`)
    })
  }
}

// Export singleton instance
const websocketService = new WebSocketService()
export default websocketService
