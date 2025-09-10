'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import {
  Palette, Pen, Eraser, Square, Circle, Triangle, Type, 
  Minus, ArrowRight, Hand, RotateCcw, RotateCw, Trash2,
  Users, MessageCircle, Mic, MicOff, Volume2, VolumeX,
  Maximize2, Minimize2, Settings, Download, Upload,
  PenTool, Highlighter, Move3D, Layers, Grid3x3,
  User, Clock, Wifi, WifiOff, Send, X, LogOut,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Home
} from 'lucide-react'

interface DrawingElement {
  id: string
  type: 'pen' | 'highlighter' | 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | 'text' | 'eraser'
  points: { x: number, y: number }[]
  color: string
  strokeWidth: number
  fill?: string
  text?: string
  timestamp: number
  userId: string
  userName: string
}

interface Participant {
  id: string
  name: string
  role: 'teacher' | 'student'
  isActive: boolean
  joinedAt: Date
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
  type: 'message' | 'system'
}

interface WhiteboardProps {
  isTeacher: boolean
  roomId: string
  classId: string
  userId: string
  userName: string
  userToken: string
  lectureTitle?: string
  subject?: string
}

const TOOLS = [
  { id: 'pen', icon: Pen, label: 'Pen', hotkey: 'P' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlighter', hotkey: 'H' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', hotkey: 'E' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', hotkey: 'R' },
  { id: 'circle', icon: Circle, label: 'Circle', hotkey: 'C' },
  { id: 'triangle', icon: Triangle, label: 'Triangle', hotkey: 'T' },
  { id: 'line', icon: Minus, label: 'Line', hotkey: 'L' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow', hotkey: 'A' },
  { id: 'text', icon: Type, label: 'Text', hotkey: 'X' },
  { id: 'move', icon: Hand, label: 'Pan', hotkey: 'M' },
] as const

const COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
  '#800000', '#000080', '#FF69B4', '#32CD32', '#FFD700'
]

const STROKE_WIDTHS = [1, 2, 3, 5, 8, 12, 16, 20]

export const ModernWhiteboard: React.FC<WhiteboardProps> = ({
  isTeacher,
  roomId,
  classId,
  userId,
  userName,
  userToken,
  lectureTitle = 'Lecture',
  subject = 'Subject'
}) => {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<{ x: number, y: number }[]>([])
  
  // Whiteboard State
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [currentTool, setCurrentTool] = useState<string>('pen')
  const [currentColor, setCurrentColor] = useState('#000000')
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(3)
  const [isConnected, setIsConnected] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  
  // UI State
  const [showToolbar, setShowToolbar] = useState(true)
  const [showColorPalette, setShowColorPalette] = useState(false)
  const [showStrokeWidth, setShowStrokeWidth] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Participants & Chat
  const [participants, setParticipants] = useState<Participant[]>([])
  const [showParticipants, setShowParticipants] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Timer
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  
  // Text Input
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [textPosition, setTextPosition] = useState<{ x: number, y: number } | null>(null)

  // Initialize Socket Connection
  useEffect(() => {
    const socket = io('http://localhost:8080', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    socketRef.current = socket

    // Connection Events
    socket.on('connect', () => {
      console.log('🔗 Connected to whiteboard server')
      setIsConnected(true)
      
      // Join the room
      socket.emit('join-room', {
        roomId,
        userId,
        userToken
      })
    })

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server')
      setIsConnected(false)
    })

    // Room Events
    socket.on('room-joined', (data) => {
      console.log('🎓 Joined room successfully:', data.roomId)
      
      // Load existing elements
      if (data.currentState?.drawingElements) {
        setElements(data.currentState.drawingElements)
      }
      
      // Load participants
      if (data.currentState?.participants) {
        const participantList = data.currentState.participants.map((p: any) => ({
          id: p.user._id || p.user.id,
          name: p.user.name,
          role: p.user.role,
          isActive: true,
          joinedAt: new Date(p.joinedAt)
        }))
        setParticipants(participantList)
      }
    })

    socket.on('error', (error) => {
      console.error('🚨 Socket error:', error.message)
      if (error.message.includes('Room not found')) {
        alert('❌ Room not found. The class may have ended.')
        router.push(isTeacher ? '/teacher-dashboard' : '/student-dashboard')
      }
    })

    // Drawing Events
    socket.on('drawing-element', (element: DrawingElement) => {
      console.log('🎨 Received drawing element:', element.type)
      setElements(prev => [...prev.filter(e => e.id !== element.id), element])
    })

    socket.on('elements-cleared', () => {
      console.log('🧹 Canvas cleared by teacher')
      setElements([])
    })

    // Participant Events
    socket.on('user-joined', (data) => {
      console.log('👋 User joined:', data.userName)
      setParticipants(prev => [
        ...prev.filter(p => p.id !== data.userId),
        {
          id: data.userId,
          name: data.userName,
          role: data.role,
          isActive: true,
          joinedAt: new Date()
        }
      ])
    })

    socket.on('user-left', (data) => {
      console.log('👋 User left:', data.userName)
      setParticipants(prev => prev.filter(p => p.id !== data.userId))
    })

    // Chat Events
    socket.on('chat-message', (message: ChatMessage) => {
      console.log('💬 New chat message from:', message.userName)
      setChatMessages(prev => [...prev, message])
      if (!showChat) {
        setUnreadCount(prev => prev + 1)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [roomId, userId, userToken, isTeacher, router, showChat])

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  // Canvas Setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      }
      
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      
      redrawCanvas()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  // Redraw Canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Set background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Apply zoom and pan
    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(panOffset.x, panOffset.y)

    // Draw grid
    if (showGrid && isTeacher) {
      drawGrid(ctx)
    }

    // Draw all elements
    elements.forEach(element => {
      drawElement(ctx, element)
    })

    ctx.restore()
  }, [elements, zoom, panOffset, showGrid, isTeacher])

  // Draw Grid
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = 20
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 2])
    
    const width = ctx.canvas.width / zoom
    const height = ctx.canvas.height / zoom
    
    for (let x = -panOffset.x % gridSize; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, -panOffset.y)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    for (let y = -panOffset.y % gridSize; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(-panOffset.x, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    ctx.setLineDash([])
  }

  // Draw Element
  const drawElement = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    ctx.save()
    ctx.strokeStyle = element.color
    ctx.lineWidth = element.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (element.type === 'highlighter') {
      ctx.globalAlpha = 0.3
      ctx.lineWidth = element.strokeWidth * 2
    }

    if (element.type === 'pen' || element.type === 'highlighter') {
      if (element.points.length < 2) return
      
      ctx.beginPath()
      ctx.moveTo(element.points[0].x, element.points[0].y)
      
      for (let i = 1; i < element.points.length - 1; i++) {
        const point = element.points[i]
        const nextPoint = element.points[i + 1]
        const xc = (point.x + nextPoint.x) / 2
        const yc = (point.y + nextPoint.y) / 2
        ctx.quadraticCurveTo(point.x, point.y, xc, yc)
      }
      
      const lastPoint = element.points[element.points.length - 1]
      ctx.lineTo(lastPoint.x, lastPoint.y)
      ctx.stroke()
    } else if (element.type === 'rectangle') {
      if (element.points.length >= 2) {
        const start = element.points[0]
        const end = element.points[element.points.length - 1]
        const width = end.x - start.x
        const height = end.y - start.y
        
        ctx.strokeRect(start.x, start.y, width, height)
        if (element.fill) {
          ctx.fillStyle = element.fill
          ctx.fillRect(start.x, start.y, width, height)
        }
      }
    } else if (element.type === 'circle') {
      if (element.points.length >= 2) {
        const start = element.points[0]
        const end = element.points[element.points.length - 1]
        const radius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        )
        
        ctx.beginPath()
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2)
        ctx.stroke()
        if (element.fill) {
          ctx.fillStyle = element.fill
          ctx.fill()
        }
      }
    } else if (element.type === 'line') {
      if (element.points.length >= 2) {
        const start = element.points[0]
        const end = element.points[element.points.length - 1]
        
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
      }
    } else if (element.type === 'arrow') {
      if (element.points.length >= 2) {
        const start = element.points[0]
        const end = element.points[element.points.length - 1]
        const headLength = 15
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        
        // Draw line
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        
        // Draw arrowhead
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(
          end.x - headLength * Math.cos(angle - Math.PI / 6),
          end.y - headLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(
          end.x - headLength * Math.cos(angle + Math.PI / 6),
          end.y - headLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.stroke()
      }
    } else if (element.type === 'text' && element.text) {
      if (element.points.length >= 1) {
        ctx.fillStyle = element.color
        ctx.font = `${element.strokeWidth * 6}px Inter, sans-serif`
        ctx.textBaseline = 'top'
        ctx.fillText(element.text, element.points[0].x, element.points[0].y)
      }
    }

    ctx.restore()
  }

  // Get Mouse Position
  const getMousePos = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    return {
      x: (clientX - rect.left) / zoom - panOffset.x,
      y: (clientY - rect.top) / zoom - panOffset.y
    }
  }

  // Mouse Events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isTeacher) return
    
    const pos = getMousePos(e)
    isDrawingRef.current = true
    currentStrokeRef.current = [pos]
    
    if (currentTool === 'text') {
      setTextPosition(pos)
      setShowTextInput(true)
      return
    }
    
    if (currentTool === 'eraser') {
      // Find and remove element at position
      const elementToErase = findElementAtPosition(pos.x, pos.y)
      if (elementToErase) {
        setElements(prev => prev.filter(e => e.id !== elementToErase.id))
        socketRef.current?.emit('element-erased', elementToErase.id)
      }
      return
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isTeacher || !isDrawingRef.current) return
    
    const pos = getMousePos(e)
    
    if (currentTool === 'move') {
      const deltaX = e.movementX / zoom
      const deltaY = e.movementY / zoom
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      return
    }
    
    if (currentTool === 'eraser') {
      const elementToErase = findElementAtPosition(pos.x, pos.y)
      if (elementToErase) {
        setElements(prev => prev.filter(e => e.id !== elementToErase.id))
        socketRef.current?.emit('element-erased', elementToErase.id)
      }
      return
    }
    
    currentStrokeRef.current.push(pos)
    
    // Send live drawing for smooth experience
    if (currentTool === 'pen' || currentTool === 'highlighter') {
      const element: DrawingElement = {
        id: `temp-${Date.now()}`,
        type: currentTool,
        points: [...currentStrokeRef.current],
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        timestamp: Date.now(),
        userId,
        userName
      }
      
      // Update local preview
      setElements(prev => [...prev.filter(e => !e.id.startsWith('temp-')), element])
    }
  }

  const handlePointerUp = () => {
    if (!isTeacher || !isDrawingRef.current) return
    
    isDrawingRef.current = false
    
    if (currentStrokeRef.current.length < 2) return
    
    const element: DrawingElement = {
      id: `${currentTool}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: currentTool as any,
      points: [...currentStrokeRef.current],
      color: currentColor,
      strokeWidth: currentStrokeWidth,
      timestamp: Date.now(),
      userId,
      userName
    }
    
    // Remove temp elements and add final element
    setElements(prev => [...prev.filter(e => !e.id.startsWith('temp-')), element])
    
    // Send to server
    socketRef.current?.emit('drawing-element', element)
    
    currentStrokeRef.current = []
  }

  // Find Element at Position
  const findElementAtPosition = (x: number, y: number): DrawingElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i]
      
      if (element.type === 'pen' || element.type === 'highlighter') {
        for (const point of element.points) {
          const distance = Math.sqrt(
            Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
          )
          if (distance <= element.strokeWidth + 5) {
            return element
          }
        }
      }
    }
    return null
  }

  // Utility Functions
  const clearCanvas = () => {
    if (isTeacher && window.confirm('Clear the whiteboard for all participants?')) {
      setElements([])
      socketRef.current?.emit('clear-elements')
    }
  }

  const sendChatMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId,
      userName,
      message: newMessage.trim(),
      timestamp: Date.now(),
      type: 'message'
    }
    
    socketRef.current.emit('chat-message', message)
    setChatMessages(prev => [...prev, message])
    setNewMessage('')
  }

  const handleTextSubmit = () => {
    if (!textInput.trim() || !textPosition) return
    
    const element: DrawingElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      points: [textPosition],
      color: currentColor,
      strokeWidth: currentStrokeWidth,
      text: textInput.trim(),
      timestamp: Date.now(),
      userId,
      userName
    }
    
    setElements(prev => [...prev, element])
    socketRef.current?.emit('drawing-element', element)
    
    setTextInput('')
    setTextPosition(null)
    setShowTextInput(false)
  }

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000) % 60
    const minutes = Math.floor(ms / (1000 * 60)) % 60
    const hours = Math.floor(ms / (1000 * 60 * 60))
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleEndClass = () => {
    if (!isTeacher) return
    
    if (window.confirm('Are you sure you want to end this class?')) {
      socketRef.current?.emit('end-class', { message: 'Class ended by teacher' })
      router.push('/teacher-dashboard')
    }
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      const key = e.key.toLowerCase()
      const tool = TOOLS.find(t => t.hotkey.toLowerCase() === key)
      if (tool) {
        e.preventDefault()
        setCurrentTool(tool.id)
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isTeacher) {
          e.preventDefault()
          clearCanvas()
        }
      }
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && isTeacher) {
          e.preventDefault()
          // Undo functionality can be added here
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isTeacher])

  // Redraw when elements change
  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{subject} - {lectureTitle}</h1>
                <p className="text-white/80 text-sm">Room: {roomId}</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-6 ml-8">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{formatElapsedTime(elapsedTime)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {isConnected ? <Wifi className="w-4 h-4 text-green-300" /> : <WifiOff className="w-4 h-4 text-red-300" />}
                <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{participants.length}</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => { setShowChat(!showChat); setUnreadCount(0) }}
              className="relative bg-white/20 hover:bg-white/30 p-2.5 rounded-lg transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {isTeacher && (
              <button
                onClick={handleEndClass}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">End Class</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
        {/* Main Whiteboard Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          {isTeacher && (
            <div className={`bg-white border-b shadow-sm transition-all duration-300 ${
              showToolbar ? 'translate-y-0' : '-translate-y-full'
            }`}>
              <div className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center space-x-4">
                  {/* Tools */}
                  <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    {TOOLS.slice(0, 6).map(tool => {
                      const IconComponent = tool.icon
                      return (
                        <button
                          key={tool.id}
                          onClick={() => setCurrentTool(tool.id)}
                          className={`p-2.5 rounded-lg transition-colors ${
                            currentTool === tool.id
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'hover:bg-gray-200 text-gray-700'
                          }`}
                          title={`${tool.label} (${tool.hotkey})`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </button>
                      )
                    })}
                  </div>

                  <div className="w-px h-8 bg-gray-300" />

                  {/* Shapes */}
                  <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    {TOOLS.slice(6, 9).map(tool => {
                      const IconComponent = tool.icon
                      return (
                        <button
                          key={tool.id}
                          onClick={() => setCurrentTool(tool.id)}
                          className={`p-2.5 rounded-lg transition-colors ${
                            currentTool === tool.id
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'hover:bg-gray-200 text-gray-700'
                          }`}
                          title={`${tool.label} (${tool.hotkey})`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </button>
                      )
                    })}
                  </div>

                  <div className="w-px h-8 bg-gray-300" />

                  {/* Color Picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowColorPalette(!showColorPalette)}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 shadow-sm"
                      style={{ backgroundColor: currentColor }}
                      title="Color"
                    />
                    
                    {showColorPalette && (
                      <div className="absolute top-12 left-0 bg-white rounded-lg shadow-lg border p-2 z-10">
                        <div className="grid grid-cols-5 gap-2">
                          {COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => {
                                setCurrentColor(color)
                                setShowColorPalette(false)
                              }}
                              className="w-8 h-8 rounded-lg border border-gray-300 hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stroke Width */}
                  <div className="relative">
                    <button
                      onClick={() => setShowStrokeWidth(!showStrokeWidth)}
                      className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
                    >
                      <div 
                        className="rounded-full bg-current"
                        style={{ 
                          width: Math.min(currentStrokeWidth + 4, 16), 
                          height: Math.min(currentStrokeWidth + 4, 16) 
                        }}
                      />
                      <span className="text-sm font-medium">{currentStrokeWidth}</span>
                    </button>
                    
                    {showStrokeWidth && (
                      <div className="absolute top-12 left-0 bg-white rounded-lg shadow-lg border p-3 z-10">
                        <div className="space-y-2">
                          {STROKE_WIDTHS.map(width => (
                            <button
                              key={width}
                              onClick={() => {
                                setCurrentStrokeWidth(width)
                                setShowStrokeWidth(false)
                              }}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 ${
                                currentStrokeWidth === width ? 'bg-indigo-50 border border-indigo-200' : ''
                              }`}
                            >
                              <div 
                                className="rounded-full bg-gray-800"
                                style={{ width: width + 4, height: width + 4 }}
                              />
                              <span className="text-sm">{width}px</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-2.5 rounded-lg transition-colors ${
                      showGrid ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'
                    }`}
                    title="Toggle Grid"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={clearCanvas}
                    className="p-2.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                    title="Clear Canvas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => setShowToolbar(!showToolbar)}
                    className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Toggle Toolbar"
                  >
                    {showToolbar ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Canvas Container */}
          <div className="flex-1 relative bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              style={{ 
                cursor: currentTool === 'move' ? 'grab' : 
                       currentTool === 'eraser' ? 'crosshair' : 'crosshair' 
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />

            {/* Connection Status */}
            {!isConnected && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
                <div className="flex items-center space-x-2">
                  <WifiOff className="w-4 h-4" />
                  <span>Reconnecting...</span>
                </div>
              </div>
            )}

            {/* Toolbar Toggle for Mobile */}
            {isTeacher && (
              <button
                onClick={() => setShowToolbar(!showToolbar)}
                className="absolute top-4 left-4 bg-white/90 hover:bg-white p-2 rounded-lg shadow-lg md:hidden"
              >
                {showToolbar ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Participants Panel */}
        {showParticipants && (
          <div className="w-80 bg-white border-l shadow-lg">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Participants ({participants.length})</h3>
                <button
                  onClick={() => setShowParticipants(false)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {participants.map(participant => (
                <div key={participant.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                  <div className={`w-3 h-3 rounded-full ${
                    participant.isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <User className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{participant.name}</span>
                      {participant.role === 'teacher' && (
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                          Teacher
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Joined {new Date(participant.joinedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {participants.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No participants yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Panel */}
        {showChat && (
          <div className="w-80 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Chat</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(message => (
                <div key={message.id} className={`p-3 rounded-lg max-w-[90%] ${
                  message.userId === userId 
                    ? 'bg-indigo-600 text-white ml-auto' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {message.userId !== userId && (
                    <div className="text-xs font-medium mb-1 opacity-70">
                      {message.userName}
                    </div>
                  )}
                  <div className="text-sm">{message.message}</div>
                  <div className="text-xs opacity-60 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Text</h3>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter your text..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Add Text
              </button>
              <button
                onClick={() => {
                  setShowTextInput(false)
                  setTextInput('')
                  setTextPosition(null)
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModernWhiteboard
