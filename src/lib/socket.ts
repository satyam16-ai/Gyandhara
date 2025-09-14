import { io, Socket } from 'socket.io-client'
import { StrokeData, ChatMessage } from '../types'

class GyaandharaSocket {
  private socket: Socket | null = null
  private serverUrl: string
  
  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gyandhara-backend.onrender.com'
  }

  connect() {
    if (this.socket?.connected) return

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    this.setupEventListeners()
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('Connected to Gyaandhara server')
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Gyaandhara server')
    })

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
    })
  }

  // Teacher methods
  startClass(data: {
    teacherId: string
    title: string
    subject: string
    bandwidthMode: 'ultra-low' | 'low' | 'normal'
  }) {
    this.socket?.emit('start-class', data)
  }

  sendStroke(strokeData: StrokeData) {
    this.socket?.emit('new-stroke', strokeData)
  }

  clearWhiteboard() {
    this.socket?.emit('clear-whiteboard')
  }

  changeBandwidth(bandwidthMode: 'ultra-low' | 'low' | 'normal') {
    this.socket?.emit('change-bandwidth', { bandwidthMode })
  }

  // Student methods
  joinClass(data: {
    studentId: string
    studentName: string
    sessionId: string
    bandwidthMode: 'ultra-low' | 'low' | 'normal'
  }) {
    this.socket?.emit('join-class', data)
  }

  raiseHand(isRaised: boolean) {
    this.socket?.emit('raise-hand', { isRaised })
  }

  sendMessage(messageData: ChatMessage) {
    this.socket?.emit('chat-message', messageData)
  }

  // Event listeners
  onClassStarted(callback: (data: any) => void) {
    this.socket?.on('class-started', callback)
  }

  onClassJoined(callback: (data: any) => void) {
    this.socket?.on('class-joined', callback)
  }

  onStrokeUpdate(callback: (stroke: StrokeData) => void) {
    this.socket?.on('stroke-update', callback)
  }

  onWhiteboardCleared(callback: () => void) {
    this.socket?.on('whiteboard-cleared', callback)
  }

  onStudentJoined(callback: (data: any) => void) {
    this.socket?.on('student-joined', callback)
  }

  onStudentLeft(callback: (data: any) => void) {
    this.socket?.on('student-left', callback)
  }

  onHandRaised(callback: (data: any) => void) {
    this.socket?.on('hand-raised', callback)
  }

  onNewMessage(callback: (message: ChatMessage) => void) {
    this.socket?.on('new-message', callback)
  }

  onClassEnded(callback: (data: any) => void) {
    this.socket?.on('class-ended', callback)
  }

  onBandwidthChanged(callback: (data: any) => void) {
    this.socket?.on('bandwidth-changed', callback)
  }

  onCatchUpStrokes(callback: (data: { strokes: StrokeData[] }) => void) {
    this.socket?.on('catch-up-strokes', callback)
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  getSocketId(): string | undefined {
    return this.socket?.id
  }
}

// Create singleton instance
const gyaandharaSocket = new GyaandharaSocket()

export default gyaandharaSocket
