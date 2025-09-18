'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { DrawingElement } from '../types'
import { 
  NETWORK_CONFIG,
  compressDrawingData, 
  decompressDrawingData,
  CompressedDrawingData,
  teacherCompressor,
  studentDecompressor
} from '../utils/compression'

interface WhiteboardContextType {
  socket: Socket | null
  isConnected: boolean
  drawingElements: DrawingElement[]
  setDrawingElements: React.Dispatch<React.SetStateAction<DrawingElement[]>>
  currentDrawingElement: DrawingElement | null
  setCurrentDrawingElement: React.Dispatch<React.SetStateAction<DrawingElement | null>>
  teacherCursor: {
    x: number
    y: number
    tool: string
    isDrawing: boolean
  } | null
  isTeacher: boolean
  connectedUsers: Array<{
    id: string
    name: string
    role: string
    isTeacher: boolean
    joinedAt: Date
  }>
  compressionStats: {
    originalSize: number
    compressedSize: number
    compressionRatio: number
    packetsPerSecond: number
  }
  currentUserId: string | null
  currentUserName: string | null
  connect: (roomId: string, userId: string, userToken: string, isTeacherParam?: boolean) => void
  disconnect: () => void
  sendDrawingElement: (element: DrawingElement) => void
  sendDrawingUpdate: (action: string, elements?: DrawingElement[], elementId?: string) => void
  sendTeacherCursor: (x: number, y: number, tool: string, isDrawing: boolean) => void
  sendDrawingPreview: (element: DrawingElement, isComplete: boolean) => void
  sendCompressedDrawing: (data: CompressedDrawingData) => void
  clearElements: () => void
}

const WhiteboardContext = createContext<WhiteboardContextType | undefined>(undefined)

export const useWhiteboard = () => {
  const context = useContext(WhiteboardContext)
  if (!context) {
    throw new Error('useWhiteboard must be used within a WhiteboardProvider')
  }
  return context
}

interface WhiteboardProviderProps {
  children: React.ReactNode
}

export const WhiteboardProvider: React.FC<WhiteboardProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([])
  const [currentDrawingElement, setCurrentDrawingElement] = useState<DrawingElement | null>(null)
  const [teacherCursor, setTeacherCursor] = useState<{
    x: number
    y: number
    tool: string
    isDrawing: boolean
  } | null>(null)
  const [isTeacher, setIsTeacher] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<Array<{
    id: string
    name: string
    role: string
    isTeacher: boolean
    joinedAt: Date
  }>>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [compressionStats, setCompressionStats] = useState({
    originalSize: 0,
    compressedSize: 0,
    compressionRatio: 0,
    packetsPerSecond: 0
  })
  const socketRef = useRef<Socket | null>(null)
  const compressionBufferRef = useRef<CompressedDrawingData[]>([])
  const compressionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const packetCountRef = useRef(0)
  // Track last tool sent by teacher for decompressed stream
  const lastToolRef = useRef<string>('pencil')

  const connect = useCallback((roomId: string, userId: string, userToken: string, isTeacherParam: boolean = false) => {
    console.log('� WhiteboardContext connecting with:', {
      roomId,
      userId,
      userToken: userToken ? 'provided' : 'missing',
      isTeacherParam
    })
    
    // Store current user info
    setCurrentUserId(userId)
    setIsTeacher(isTeacherParam)
    
    // Validate roomId is a string
    if (!roomId || typeof roomId !== 'string') {
      console.error('❌ Invalid roomId passed to connect:', { roomId, type: typeof roomId })
      return
    }
    
    // Set teacher status only if it's different
    if (isTeacher !== isTeacherParam) {
      setIsTeacher(isTeacherParam)
    }
    
    // Disconnect existing connection
    if (socketRef.current) {
      socketRef.current.disconnect()
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gyandhara-backend.onrender.com'
    console.log('🌐 Creating new socket connection to:', backendUrl);
    console.log('⚠️ DEBUG: Using production backend URL for Socket.io connection!');
    // Create new socket connection
    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔗 Connected to whiteboard server')
      setIsConnected(true)
      
      console.log('🏠 Attempting to join room with:', {
        roomId,
        roomIdType: typeof roomId,
        userId,
        userToken: userToken ? 'provided' : 'missing'
      })
      
      // Join the room with enhanced logging
      console.log('🏠 Attempting to join room:', {
        roomId,
        userId,
        isTeacher: isTeacherParam,
        socketConnected: newSocket.connected
      })
      
      newSocket.emit('join-room', {
        roomId,
        userId,
        userToken
      })
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from whiteboard server')
      setIsConnected(false)
    })

    // Room events
    newSocket.on('room-joined', (data) => {
      console.log('🎓 Joined whiteboard room:', data.roomId)
      console.log('🔍 DEBUG room-joined data:', JSON.stringify(data, null, 2))
      setIsTeacher(data.user.isTeacher)
      
      // Store current user info from server response
      if (data.user) {
        const userId = data.user._id || data.user.id
        console.log('🔍 DEBUG user ID extraction:', {
          'data.user._id': data.user._id,
          'data.user.id': data.user.id,
          'final userId': userId
        })
        setCurrentUserId(userId)
        setCurrentUserName(data.user.name)
        console.log('👤 Current user stored:', { 
          id: userId, 
          name: data.user.name,
          role: data.user.role 
        })
      }
      
      // Load existing drawing elements
      if (data.currentState.drawingElements) {
        console.log('📚 Loading', data.currentState.drawingElements.length, 'existing drawing elements')
        setDrawingElements(data.currentState.drawingElements)
      }
      
      // Load connected users
      if (data.currentState.participants) {
        console.log('👥 Loading', data.currentState.participants.length, 'connected users')
        setConnectedUsers(data.currentState.participants.map((p: any) => ({
          id: p.user._id || p.user.id,
          name: p.user.name,
          role: p.user.role,
          isTeacher: p.user.role === 'teacher',
          joinedAt: new Date(p.joinedAt)
        })))
      }
    })

    newSocket.on('error', (error) => {
      console.error('🚨 Whiteboard error:', error.message)
      
      // Show user-friendly error messages
      if (error.message.includes('not authorized')) {
        console.error('❌ Authorization failed. Please ensure you joined the class properly.')
        // Optional: Show toast notification or redirect to join page
      } else if (error.message.includes('Room not found')) {
        console.error('❌ Room not found. The class may have ended.')
      } else if (error.message.includes('Invalid user')) {
        console.error('❌ User authentication failed. Please login again.')
      }
    })

    // User connection events
    newSocket.on('user-joined', (data) => {
      console.log('👋 User joined:', data.userName)
      setConnectedUsers(prev => {
        // Avoid duplicates
        if (prev.find(u => u.id === data.userId)) {
          return prev
        }
        return [...prev, {
          id: data.userId,
          name: data.userName,
          role: data.role,
          isTeacher: data.isTeacher,
          joinedAt: new Date()
        }]
      })
    })

    newSocket.on('user-left', (data) => {
      console.log('👋 User left:', data.userName)
      setConnectedUsers(prev => prev.filter(u => u.id !== data.userId))
    })

    // Handle class ended by teacher
    newSocket.on('class-ended', (data) => {
      console.log('🛑 Class ended by teacher:', data.message)
      
      // Only show popup to students, not to the teacher who ended the class
      const userRole = localStorage.getItem('userRole')
      const userId = localStorage.getItem('userId')
      
      // Don't show popup if this is the teacher who ended the class
      if (userRole === 'teacher' || userId === data.teacherId) {
        console.log('🎓 Teacher ended class - no popup needed')
        return
      }
      
      // Show popup to students only
      if (typeof window !== 'undefined') {
        const showClassEndedPopup = () => {
          const popup = document.createElement('div')
          popup.innerHTML = `
            <div style="
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.7);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
              font-family: system-ui, -apple-system, sans-serif;
            ">
              <div style="
                background: white;
                padding: 2rem;
                border-radius: 12px;
                text-align: center;
                max-width: 400px;
                margin: 1rem;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
              ">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
                <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #1f2937;">
                  Class Ended
                </h3>
                <p style="color: #6b7280; margin-bottom: 1.5rem;">
                  ${data.message}
                </p>
                <button 
                  onclick="window.location.href='${data.redirectTo || '/student-dashboard'}'"
                  style="
                    background: #2563eb;
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s;
                  "
                  onmouseover="this.style.background='#1d4ed8'"
                  onmouseout="this.style.background='#2563eb'"
                >
                  Back to Classes
                </button>
              </div>
            </div>
          `
          document.body.appendChild(popup)
        }
        
        showClassEndedPopup()
      }
    })

    // Drawing events - Enhanced with compression
    newSocket.on('drawing-element-update', (data) => {
      console.log('🎨 Drawing element update received:', {
        action: data.action,
        elementType: data.element?.type,
        elementId: data.element?.id,
        teacherId: data.teacherId,
        timestamp: data.timestamp,
        isTeacher: isTeacherParam
      })
      
      if (data.action === 'add' && data.element) {
        setDrawingElements(prev => {
          // Avoid duplicate elements by checking both id and timestamp
          const isDuplicate = prev.some(el => 
            el.id === data.element.id || 
            (Math.abs(el.timestamp - data.element.timestamp) < 100 && el.type === data.element.type)
          )
          
          if (isDuplicate) {
            console.log('🚫 Skipping duplicate element:', data.element.id)
            return prev
          }
          
          console.log('✅ Adding new drawing element for students:', data.element.type, data.element.id)
          return [...prev, data.element]
        })
      } else if (data.action === 'erase' && data.elementId) {
        setDrawingElements(prev => {
          const filtered = prev.filter(el => el.id !== data.elementId)
          console.log('🗑️ Erased element:', data.elementId, 'Remaining:', filtered.length)
          return filtered
        })
      }
    })

    // Compressed drawing data receiver
    newSocket.on('compressed-drawing-data', (compressedBuffer: ArrayBuffer) => {
      try {
        const uint8Array = new Uint8Array(compressedBuffer)
        const decompressedData = decompressDrawingData(uint8Array)
        
        console.log('📦 Decompressed drawing data:', decompressedData.action, 
          `${compressedBuffer.byteLength} bytes`)
        
        // Update compression stats
        const originalSize = JSON.stringify(decompressedData).length
        setCompressionStats(prev => ({
          originalSize: prev.originalSize + originalSize,
          compressedSize: prev.compressedSize + compressedBuffer.byteLength,
          compressionRatio: prev.compressedSize > 0 ? 
            (prev.originalSize / prev.compressedSize) : 0,
          packetsPerSecond: prev.packetsPerSecond
        }))
        
        // Process decompressed data
        handleDecompressedDrawing(decompressedData)
        
      } catch (error) {
        console.error('❌ Failed to decompress drawing data:', error)
      }
    })

    newSocket.on('drawing-elements-update', (data) => {
      console.log('🎨 Drawing elements bulk update received:', data.action)
      
      if (data.action === 'clear') {
        console.log('🧹 Clearing all drawing elements')
        setDrawingElements([])
      } else if (data.action === 'bulk-update' && data.elements) {
        console.log('📦 Bulk updating', data.elements.length, 'elements')
        setDrawingElements(data.elements)
      }
    })

    // Teacher cursor tracking
    newSocket.on('teacher-cursor-update', (cursorData) => {
      setTeacherCursor({
        x: cursorData.x,
        y: cursorData.y,
        tool: cursorData.tool,
        isDrawing: cursorData.isDrawing
      })

      // Auto-hide cursor after 2 seconds of inactivity
      setTimeout(() => {
        setTeacherCursor(null)
      }, 2000)
    })

    // Paper style synchronization for students
    newSocket.on('paperStyleChanged', (styleData) => {
      console.log('📄 Paper style changed:', styleData)
      // This will be handled by FullWhiteBoard component
      // Just passing through the event
    })

    // Live drawing preview
    newSocket.on('drawing-preview-update', (data) => {
      // Handle live drawing preview for smooth real-time drawing
      console.log('🖊️ Drawing preview received:', data.element.type)
      
      // For students, show live preview
      if (!isTeacher && data.element) {
        setCurrentDrawingElement(data.element)
        
        // Clear preview after a short delay if not completed
        if (!data.isComplete) {
          setTimeout(() => {
            setCurrentDrawingElement(null)
          }, 100)
        }
      }
    })
    
    // Handle element move for real-time synchronization
    newSocket.on('element-moved', (data) => {
      console.log('🔄 Element moved received:', data.elementId)
      
      // For students, update the moved element in real-time
      if (!isTeacher && data.element) {
        setDrawingElements(prev => 
          prev.map(el => el.id === data.elementId ? data.element : el)
        )
      }
    })
  }, [isTeacher]) // Only depends on isTeacher

  // Helper function to handle decompressed drawing data with INSTANT rendering
  const handleDecompressedDrawing = useCallback((data: CompressedDrawingData) => {
    // Update last seen tool if present
    if (data.tool) {
      lastToolRef.current = data.tool
    }
    // Helper to map tool to element type
    const mapToolToElementType = (tool?: string) => {
      const t = (tool || lastToolRef.current)
      if (t === 'highlighter') return 'highlight'
      if (t === 'eraser') return 'eraser'
      return 'freehand'
    }
    switch (data.action) {
      case 'draw_start':
        // Start new drawing element - IMMEDIATE rendering
        if (data.elementId && data.x !== undefined && data.y !== undefined) {
          const newElement = {
            id: data.elementId,
            type: mapToolToElementType(data.tool) as any,
            points: [data.x, data.y],
            options: {
              stroke: data.color || '#000000',
              strokeWidth: data.strokeWidth || 2,
              roughness: 1,
              fill: 'transparent'
            },
            timestamp: data.timestamp || Date.now()
          } as unknown as DrawingElement
          setCurrentDrawingElement(newElement)
        }
        break
        
      case 'draw_move':
        // Update current drawing element - IMMEDIATE rendering for ultra-smoothness
        if (data.x !== undefined && data.y !== undefined) {
          setCurrentDrawingElement(prev => {
            if (!prev) {
              // Create new element if none exists (recovery for ultra-smooth drawing)
              return {
                id: data.elementId || `recovery-${Date.now()}`,
                type: mapToolToElementType(data.tool) as any,
                points: [data.x!, data.y!],
                options: {
                  stroke: data.color || '#000000',
                  strokeWidth: data.strokeWidth || 2,
                  roughness: 1,
                  fill: 'transparent'
                },
                timestamp: Date.now()
              } as unknown as DrawingElement
            }
            const p: any = prev
            const prevPoints: number[] = Array.isArray(p.points) ? p.points : []
            return {
              ...p,
              points: [...prevPoints, data.x!, data.y!]
            } as DrawingElement
          })
        }
        break
        
      case 'draw_end':
        // Finalize drawing element - move to permanent storage
        if (currentDrawingElement) {
          setDrawingElements(prev => [...prev, currentDrawingElement])
          setCurrentDrawingElement(null)
        }
        break
        
      case 'erase':
        // Erase element - IMMEDIATE removal
        if (data.elementId) {
          setDrawingElements(prev => prev.filter(el => el.id !== data.elementId))
          // Also remove from current drawing if it matches
          setCurrentDrawingElement(prev => 
            prev && prev.id === data.elementId ? null : prev
          )
        }
        break
        
      case 'clear':
        // Clear all elements - IMMEDIATE clear
        setDrawingElements([])
        setCurrentDrawingElement(null)
        break
        
      default:
        console.warn('🤔 Unknown compressed drawing action:', data.action)
    }
  }, [currentDrawingElement])

  // Compression buffer management with ultra-fast real-time sending
  const flushCompressionBuffer = useCallback(() => {
    if (compressionBufferRef.current.length === 0 || !socket || !isConnected || !isTeacher) {
      return
    }
    
    // Send each compressed data individually for ultra-low latency
    compressionBufferRef.current.forEach(data => {
      const compressed = compressDrawingData(data)
      const originalSize = JSON.stringify(data).length
      
      console.log(`� Ultra-sending: ${originalSize}B → ${compressed.length}B 
        (${Math.round(originalSize/compressed.length)}:1 ratio)`)
      
      socket.emit('compressed-drawing-data', compressed.buffer)
      
      // Update stats
      setCompressionStats(prev => ({
        originalSize: prev.originalSize + originalSize,
        compressedSize: prev.compressedSize + compressed.length,
        compressionRatio: (prev.originalSize + originalSize) / (prev.compressedSize + compressed.length),
        packetsPerSecond: prev.packetsPerSecond
      }))
    })
    
    compressionBufferRef.current = []
    packetCountRef.current = 0
  }, [socket, isConnected, isTeacher])

  // Setup ultra-fast compression timer (16ms = 60fps)
  useEffect(() => {
    if (isTeacher && isConnected) {
      compressionTimerRef.current = setInterval(() => {
        flushCompressionBuffer()
        
        // Update packets per second
        setCompressionStats(prev => ({
          ...prev,
          packetsPerSecond: packetCountRef.current * (1000 / NETWORK_CONFIG.batchInterval)
        }))
        packetCountRef.current = 0
      }, NETWORK_CONFIG.batchInterval)
    } else {
      if (compressionTimerRef.current) {
        clearInterval(compressionTimerRef.current)
        compressionTimerRef.current = null
      }
    }
    
    return () => {
      if (compressionTimerRef.current) {
        clearInterval(compressionTimerRef.current)
      }
    }
  }, [isTeacher, isConnected, flushCompressionBuffer])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setSocket(null)
    setIsConnected(false)
    setDrawingElements([])
    setCurrentDrawingElement(null)
    setTeacherCursor(null)
    setConnectedUsers([])
  }, [])

  const sendDrawingElement = (element: DrawingElement) => {
    if (socket && isConnected && isTeacher) {
      console.log('📤 Sending drawing element:', element.type, element.id)
      
      // Send using legacy method for compatibility
      socket.emit('drawing-element', element)
      
      console.log('✅ Drawing element sent via drawing-element event')
    } else {
      console.warn('❌ Cannot send drawing element - not connected or not teacher:', {
        hasSocket: !!socket,
        isConnected,
        isTeacher
      })
    }
  }

  const sendDrawingUpdate = (action: string, elements?: DrawingElement[], elementId?: string) => {
    if (socket && isConnected && isTeacher) {
      console.log('📤 Sending drawing update:', action, elements?.length || 0, 'elements', elementId ? `elementId: ${elementId}` : '')
      socket.emit('drawing-elements-update', { action, elements, elementId })
    } else {
      console.warn('❌ Cannot send drawing update - not connected or not teacher')
    }
  }

  const sendTeacherCursor = (x: number, y: number, tool: string, isDrawing: boolean) => {
    if (socket && isConnected && isTeacher) {
      socket.emit('teacher-cursor', { x, y, tool, isDrawing })
    }
  }

  const sendDrawingPreview = (element: DrawingElement, isComplete: boolean) => {
    if (socket && isConnected && isTeacher) {
      socket.emit('drawing-preview', { element, isComplete })
    }
  }

  const sendCompressedDrawing = useCallback((data: CompressedDrawingData) => {
    if (isTeacher && isConnected) {
      // IMMEDIATE send for real-time responsiveness - no batching for move events
      if (data.action === 'draw_move') {
        const compressed = compressDrawingData(data)
        const originalSize = JSON.stringify(data).length
        
        socket!.emit('compressed-drawing-data', compressed.buffer)
        
        // Update stats
        setCompressionStats(prev => ({
          originalSize: prev.originalSize + originalSize,
          compressedSize: prev.compressedSize + compressed.length,
          compressionRatio: (prev.originalSize + originalSize) / (prev.compressedSize + compressed.length),
          packetsPerSecond: prev.packetsPerSecond + 1
        }))
        
        console.log(`⚡ Real-time: ${originalSize}B → ${compressed.length}B (${Math.round(originalSize/compressed.length)}:1)`)
        return
      }
      
      // Add to buffer for other actions
      compressionBufferRef.current.push(data)
      packetCountRef.current++
      
      // Immediate flush for critical actions
      if (['draw_start', 'draw_end', 'erase', 'clear'].includes(data.action)) {
        flushCompressionBuffer()
      }
      
      // Force flush if buffer is getting large
      if (compressionBufferRef.current.length >= 5) {
        flushCompressionBuffer()
      }
    }
  }, [isTeacher, isConnected, socket, flushCompressionBuffer])

  const clearElements = () => {
    // Clear locally for teacher immediately
    setDrawingElements([])
    setCurrentDrawingElement(null)
    
    // Send clear command to students (both compressed and legacy)
    sendDrawingUpdate('clear')
    sendCompressedDrawing({
      action: 'clear',
      timestamp: Date.now()
    })
    
    // Reset compression state
    teacherCompressor.reset()
    studentDecompressor.reset()
    setCompressionStats({
      originalSize: 0,
      compressedSize: 0,
      compressionRatio: 0,
      packetsPerSecond: 0
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  const value: WhiteboardContextType = {
    socket,
    isConnected,
    drawingElements,
    setDrawingElements,
    currentDrawingElement,
    setCurrentDrawingElement,
    teacherCursor,
    isTeacher,
    connectedUsers,
    compressionStats,
    currentUserId,
    currentUserName,
    connect,
    disconnect,
    sendDrawingElement,
    sendDrawingUpdate,
    sendTeacherCursor,
    sendDrawingPreview,
    sendCompressedDrawing,
    clearElements
  }

  return (
    <WhiteboardContext.Provider value={value}>
      {children}
    </WhiteboardContext.Provider>
  )
}

export default WhiteboardContext
