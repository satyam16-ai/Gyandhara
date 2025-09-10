'use client'

import React from 'react'
import { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import rough from 'roughjs'
import { useWhiteboard } from '../contexts/WhiteboardContext'
import { CompressedDrawingData } from '../utils/compression'
import SimpleWebRTCAudio from './SimpleWebRTCAudio'
import RealtimeChat from './RealtimeChat'
import { 
  PenTool, 
  Square, 
  Circle, 
  Triangle, 
  Minus, 
  Type, 
  Highlighter, 
  Eraser, 
  Undo, 
  Redo, 
  Trash2, 
  Move,
  ArrowRight,
  Hand,
  Palette,
  Settings,
  Download,
  Upload,
  Maximize,
  User,
  LogOut,
  X,
  MessageCircle,
  Send,
  Users,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react'

interface DrawingElement {
  id: string
  type: 'freehand' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'highlight' | 'triangle'
  points: number[]
  options: {
    stroke: string
    strokeWidth: number
    fill?: string
    roughness?: number
    fillStyle?: string
  }
  text?: string
  x?: number
  y?: number
  width?: number
  height?: number
  timestamp: number
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
  isTeacher?: boolean
}

interface WhiteBoardProps {
  isTeacher: boolean
  bandwidthMode: 'ultra-low' | 'low' | 'normal'
  roomId?: string
  classId?: string
  teacherName?: string
  lectureTitle?: string
  subject?: string
  userId?: string
  userName?: string
}

type Tool = 'select' | 'pen' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'highlighter' | 'eraser' | 'triangle' | 'hand'

const colors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
  '#800000', '#000080', '#808080', '#C0C0C0', '#FFFFFF'
]

const FullWhiteBoard: React.FC<WhiteBoardProps> = ({
  isTeacher,
  bandwidthMode,
  roomId,
  classId,
  teacherName = "Teacher",
  lectureTitle = "Lecture",
  subject = "Subject",
  userId,
  userName
}) => {
  const router = useRouter()
  const {
    drawingElements,
    setDrawingElements,
    currentDrawingElement,
    setCurrentDrawingElement,
    teacherCursor,
    sendDrawingElement,
    sendDrawingUpdate,
    sendTeacherCursor,
    sendDrawingPreview,
    sendCompressedDrawing,
    compressionStats,
    clearElements,
    socket,
    isConnected,
    connect,
    disconnect,
    connectedUsers
  } = useWhiteboard()

  // DEBUG: Log socket and connection status
  console.log('🔌 FullWhiteBoard socket status:', {
    socketExists: !!socket,
    isConnected,
    roomId,
    userId,
    userName,
    isTeacher
  });

  // Canvas and drawing refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const roughCanvasRef = useRef<any>(null)
  const isDrawingRef = useRef(false)
  const currentPathRef = useRef<number[]>([])
  const currentElementIdRef = useRef<string>('')
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  // UI State
  const [tool, setTool] = useState<Tool>('pen')
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [fillColor, setFillColor] = useState('transparent')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [roughness, setRoughness] = useState(1)
  const [showColorPalette, setShowColorPalette] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [undoStack, setUndoStack] = useState<DrawingElement[][]>([])
  const [redoStack, setRedoStack] = useState<DrawingElement[][]>([])
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null)
  const [textInput, setTextInput] = useState('')
  const [textPosition, setTextPosition] = useState<{x: number, y: number} | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({x: 0, y: 0})
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Chat and sidebar state
  const [showSidebar, setShowSidebar] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [isChatVisible, setIsChatVisible] = useState(false)
  
  // Timer state
  const [classStartTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)

  // Chat functions
  const sendChatMessage = useCallback(() => {
    if (!newMessage.trim() || !socket) return
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: localStorage.getItem('userId') || 'unknown',
      userName: localStorage.getItem('userName') || (isTeacher ? 'Teacher' : 'Student'),
      message: newMessage.trim(),
      timestamp: Date.now(),
      isTeacher: isTeacher
    }
    
    setChatMessages(prev => [...prev, message])
    socket.emit('chat-message', message)
    setNewMessage('')
  }, [newMessage, socket, isTeacher])

  const toggleHandRaise = useCallback(() => {
    if (!socket || isTeacher) return
    
    const newState = !handRaised
    setHandRaised(newState)
    socket.emit('hand-raised', {
      userId: localStorage.getItem('userId'),
      userName: localStorage.getItem('userName'),
      isRaised: newState
    })
  }, [handRaised, socket, isTeacher])

  // Find element at position for eraser tool
  const findElementAtPosition = (x: number, y: number): DrawingElement | null => {
    for (let i = drawingElements.length - 1; i >= 0; i--) {
      const element = drawingElements[i]
      
      if (element.type === 'freehand' || element.type === 'highlight') {
        for (let j = 0; j < element.points.length - 2; j += 2) {
          const px = element.points[j]
          const py = element.points[j + 1]
          const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
          if (distance <= (element.options.strokeWidth + 10)) {
            return element
          }
        }
      } else if (element.x !== undefined && element.y !== undefined) {
        const right = element.x + (element.width || 50)
        const bottom = element.y + (element.height || 50)
        
        if (x >= element.x && x <= right && y >= element.y && y <= bottom) {
          return element
        }
      } else if (element.points.length >= 4) {
        const [x1, y1, x2, y2] = element.points
        const distance = distanceToLine(x, y, x1, y1, x2, y2)
        if (distance <= (element.options.strokeWidth + 10)) {
          return element
        }
      }
    }
    return null
  }

  const distanceToLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = px - x1
    const B = py - y1
    const C = x2 - x1
    const D = y2 - y1
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B)
    
    let param = dot / lenSq
    let xx, yy

    if (param < 0) {
      xx = x1
      yy = y1
    } else if (param > 1) {
      xx = x2
      yy = y2
    } else {
      xx = x1 + param * C
      yy = y1 + param * D
    }

    const dx = px - xx
    const dy = py - yy
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return

      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        ctx.imageSmoothingEnabled = true
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
      
      roughCanvasRef.current = rough.canvas(canvas)
      redrawCanvas()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  // Connect to whiteboard
  useEffect(() => {
    if (roomId && classId) {
      const userId = localStorage.getItem('userId')
      const userToken = localStorage.getItem('userToken')
      
      if (userId && userToken) {
        console.log('🔗 ULTIMATE WHITEBOARD - Connecting:', { 
          roomId, 
          roomIdLength: roomId.length,
          classId, 
          userId, 
          isTeacher,
          userToken: 'provided'
        })
        connect(roomId, userId, userToken, isTeacher)
      } else {
        console.error('❌ Missing user credentials for whiteboard connection')
        setError?.('Authentication error. Please login again.')
      }
    } else {
      console.error('❌ Missing roomId or classId:', { roomId, classId })
      setError?.('Missing session data. Please restart.')
    }
    
    return () => {
      disconnect()
    }
  }, [roomId, classId, isTeacher, connect, disconnect])

  // Chat socket listeners
  useEffect(() => {
    if (!socket) return

    const handleChatMessage = (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message])
    }

    const handleRaiseHand = (data: { userId: string, userName: string, isRaised: boolean }) => {
      console.log(`${data.userName} ${data.isRaised ? 'raised' : 'lowered'} hand`)
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        userId: 'system',
        userName: 'System',
        message: `${data.userName} ${data.isRaised ? '✋ raised hand' : '👋 lowered hand'}`,
        timestamp: Date.now(),
        isTeacher: false
      }
      setChatMessages(prev => [...prev, systemMessage])
    }

    socket.on('chat-message', handleChatMessage)
    socket.on('hand-raised', handleRaiseHand)

    return () => {
      socket.off('chat-message', handleChatMessage)
      socket.off('hand-raised', handleRaiseHand)
    }
  }, [socket])

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - classStartTime)
    }, 1000)
    return () => clearInterval(timer)
  }, [classStartTime])

  // Redraw canvas
  useEffect(() => {
    redrawCanvas()
  }, [drawingElements, currentDrawingElement, zoom, panOffset])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const roughCanvas = roughCanvasRef.current
    if (!canvas || !roughCanvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(panOffset.x, panOffset.y)

    // Draw grid
    drawGrid(ctx, rect.width, rect.height)

    // Draw elements
    drawingElements
      .filter(element => element && element.type && element.options) // Filter out invalid elements
      .forEach(element => {
      try {
        drawElement(ctx, roughCanvas, element)
      } catch (error) {
        console.error('Error drawing element:', error, element)
      }
    })

    if (currentDrawingElement && currentDrawingElement.type && currentDrawingElement.options) {
      try {
        drawElement(ctx, roughCanvas, currentDrawingElement, true)
      } catch (error) {
        console.error('Error drawing current element:', error)
      }
    }

    if (!isTeacher && teacherCursor) {
      drawTeacherCursor(ctx, teacherCursor)
    }

    ctx.restore()
  }, [drawingElements, currentDrawingElement, teacherCursor, zoom, panOffset, isTeacher])

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20 * zoom
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 0.5
    ctx.globalAlpha = 0.3
    
    for (let x = panOffset.x % gridSize; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    for (let y = panOffset.y % gridSize; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    ctx.globalAlpha = 1
  }

  const drawTeacherCursor = (ctx: CanvasRenderingContext2D, cursor: any) => {
    const { x, y, tool, isDrawing } = cursor
    
    ctx.save()
    ctx.strokeStyle = '#ff4444'
    ctx.fillStyle = '#ff4444'
    ctx.lineWidth = 2
    
    ctx.beginPath()
    ctx.arc(x, y, isDrawing ? 8 : 5, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = '#ffffff'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(tool.charAt(0).toUpperCase(), x, y + 3)
    
    ctx.restore()
  }

  const drawElement = (ctx: CanvasRenderingContext2D, roughCanvas: any, element: DrawingElement, isPreview: boolean = false) => {
    // Add safety checks for element validity
    if (!element || !element.type || !element.options) {
      console.warn('Invalid drawing element:', element)
      return
    }

    if (isPreview) {
      ctx.globalAlpha = 0.7
    }

    switch (element.type) {
      case 'freehand':
        drawFreehand(ctx, element)
        break
      case 'rectangle':
        drawRectangle(roughCanvas, element)
        break
      case 'circle':
        drawCircle(roughCanvas, element)
        break
      case 'triangle':
        drawTriangle(roughCanvas, element)
        break
      case 'line':
        drawLine(roughCanvas, element)
        break
      case 'arrow':
        drawArrow(ctx, element)
        break
      case 'text':
        drawText(ctx, element)
        break
      case 'highlight':
        drawHighlight(ctx, element)
        break
    }

    if (isPreview) {
      ctx.globalAlpha = 1
    }
  }

  const drawFreehand = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (!element || !element.points || element.points.length < 2 || !element.options) {
      console.warn('Invalid freehand element:', element)
      return
    }
    
    ctx.save()
    ctx.strokeStyle = element.options.stroke || '#000000'
    ctx.lineWidth = element.options.strokeWidth || 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    
    if (element.points.length === 2) {
      const [x, y] = element.points
      ctx.arc(x, y, element.options.strokeWidth / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.moveTo(element.points[0], element.points[1])
      
      for (let i = 2; i < element.points.length - 2; i += 2) {
        const xc = (element.points[i] + element.points[i + 2]) / 2
        const yc = (element.points[i + 1] + element.points[i + 3]) / 2
        ctx.quadraticCurveTo(element.points[i], element.points[i + 1], xc, yc)
      }
      
      if (element.points.length > 2) {
        ctx.lineTo(element.points[element.points.length - 2], element.points[element.points.length - 1])
      }
      
      ctx.stroke()
    }
    
    ctx.restore()
  }

  const drawRectangle = (roughCanvas: any, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid rectangle element:', element)
      return
    }
    try {
      roughCanvas.rectangle(element.x, element.y, element.width, element.height, element.options)
    } catch (error) {
      console.error('Error drawing rectangle:', error)
    }
  }

  const drawCircle = (roughCanvas: any, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid circle element:', element)
      return
    }
    try {
      const centerX = element.x + element.width / 2
      const centerY = element.y + element.height / 2
      const radius = Math.min(Math.abs(element.width), Math.abs(element.height)) / 2
      roughCanvas.circle(centerX, centerY, radius * 2, element.options)
    } catch (error) {
      console.error('Error drawing circle:', error)
    }
  }

  const drawTriangle = (roughCanvas: any, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid triangle element:', element)
      return
    }
    try {
      const x1 = element.x + element.width / 2
      const y1 = element.y
      const x2 = element.x
      const y2 = element.y + element.height
      const x3 = element.x + element.width
      const y3 = element.y + element.height
      
      roughCanvas.polygon([[x1, y1], [x2, y2], [x3, y3]], element.options)
    } catch (error) {
      console.error('Error drawing triangle:', error)
    }
  }

  const drawLine = (roughCanvas: any, element: DrawingElement) => {
    if (!element || !element.points || element.points.length < 4 || !element.options) {
      console.warn('Invalid line element:', element)
      return
    }
    try {
      roughCanvas.line(
        element.points[0], element.points[1],
        element.points[2], element.points[3],
        element.options
      )
    } catch (error) {
      console.error('Error drawing line:', error)
    }
  }

  const drawArrow = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (!element || !element.points || element.points.length < 4 || !element.options) {
      console.warn('Invalid arrow element:', element)
      return
    }
    
    ctx.save()
    const [x1, y1, x2, y2] = element.points
    const headLength = 20
    const angle = Math.atan2(y2 - y1, x2 - x1)
    
    ctx.strokeStyle = element.options.stroke || '#000000'
    ctx.lineWidth = element.options.strokeWidth || 2
    ctx.lineCap = 'round'
    
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(
      x2 - headLength * Math.cos(angle - Math.PI / 6),
      y2 - headLength * Math.sin(angle - Math.PI / 6)
    )
    ctx.moveTo(x2, y2)
    ctx.lineTo(
      x2 - headLength * Math.cos(angle + Math.PI / 6),
      y2 - headLength * Math.sin(angle + Math.PI / 6)
    )
    ctx.stroke()
    
    ctx.restore()
  }

  const drawText = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (!element || !element.text || element.x === undefined || element.y === undefined || !element.options) {
      console.warn('Invalid text element:', element)
      return
    }
    
    ctx.save()
    ctx.font = `${(element.options.strokeWidth || 2) * 10}px Arial`
    ctx.fillStyle = element.options.stroke || '#000000'
    ctx.textBaseline = 'top'
    ctx.fillText(element.text, element.x, element.y)
    ctx.restore()
  }

  const drawHighlight = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (!element || !element.points || element.points.length < 2 || !element.options) {
      console.warn('Invalid highlight element:', element)
      return
    }
    
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = element.options.stroke || '#ffff00'
    ctx.lineWidth = (element.options.strokeWidth || 2) * 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    
    if (element.points.length === 2) {
      const [x, y] = element.points
      ctx.arc(x, y, element.options.strokeWidth * 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.moveTo(element.points[0], element.points[1])
      
      for (let i = 2; i < element.points.length - 2; i += 2) {
        const xc = (element.points[i] + element.points[i + 2]) / 2
        const yc = (element.points[i + 1] + element.points[i + 3]) / 2
        ctx.quadraticCurveTo(element.points[i], element.points[i + 1], xc, yc)
      }
      
      if (element.points.length > 2) {
        ctx.lineTo(element.points[element.points.length - 2], element.points[element.points.length - 1])
      }
      
      ctx.stroke()
    }
    
    ctx.restore()
  }

  // Mouse/pointer event handlers
  const getMousePos = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX : 
                    'clientX' in e ? e.clientX : 0
    const clientY = 'touches' in e ? e.touches[0]?.clientY : 
                    'clientY' in e ? e.clientY : 0
    
    return {
      x: (clientX - rect.left) / zoom - panOffset.x,
      y: (clientY - rect.top) / zoom - panOffset.y
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    
    if (!isTeacher || bandwidthMode === 'ultra-low') return
    
    if (!isConnected) {
      console.warn('⚠️ Cannot draw - whiteboard not connected')
      return
    }
    
    const { x, y } = getMousePos(e)
    isDrawingRef.current = true
    
    if (isConnected) {
      sendTeacherCursor(x, y, tool, true)
    }
    
    if (tool === 'hand') {
      setIsPanning(true)
      return
    }
    
    if (tool === 'text') {
      setTextPosition({ x, y })
      return
    }
    
    if (tool === 'eraser') {
      const elementToErase = findElementAtPosition(x, y)
      if (elementToErase) {
        setDrawingElements(prev => prev.filter(el => el.id !== elementToErase.id))
        
        if (isConnected) {
          sendCompressedDrawing({
            action: 'erase',
            elementId: elementToErase.id,
            x,
            y,
            timestamp: Date.now()
          })
          sendDrawingUpdate('erase', undefined, elementToErase.id)
        }
      }
      return
    }
    
    if (tool === 'pen' || tool === 'highlighter') {
      currentPathRef.current = [x, y]
      
      const elementId = `${tool}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      currentElementIdRef.current = elementId
      
      if (isConnected) {
        sendCompressedDrawing({
          action: 'draw_start',
          tool: tool === 'pen' ? 'pencil' : 'highlighter',
          x,
          y,
          color: strokeColor,
          strokeWidth,
          elementId,
          timestamp: Date.now()
        })
      }
      
      const previewElement: DrawingElement = {
        id: elementId,
        type: tool === 'pen' ? 'freehand' : 'highlight',
        points: [x, y],
        options: {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          roughness: roughness
        },
        timestamp: Date.now()
      }
      setCurrentDrawingElement(previewElement)
    } else {
      setStartPoint({ x, y })
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    e.preventDefault()
    
    const { x, y } = getMousePos(e)
    
    if (isTeacher && isConnected) {
      sendTeacherCursor(x, y, tool, isDrawingRef.current)
    }
    
    if (!isTeacher || !isDrawingRef.current || bandwidthMode === 'ultra-low' || !isConnected) return
    
    if (isPanning && tool === 'hand') {
      const deltaX = e.movementX / zoom
      const deltaY = e.movementY / zoom
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      return
    }
    
    if (tool === 'eraser') {
      const elementToErase = findElementAtPosition(x, y)
      if (elementToErase) {
        setDrawingElements(prev => prev.filter(el => el.id !== elementToErase.id))
        
        sendCompressedDrawing({
          action: 'erase',
          elementId: elementToErase.id,
          x,
          y,
          timestamp: Date.now()
        })
        sendDrawingUpdate('erase', undefined, elementToErase.id)
      }
      return
    }
    
    if (tool === 'pen' || tool === 'highlighter') {
      currentPathRef.current.push(x, y)
      
      sendCompressedDrawing({
        action: 'draw_move',
        tool: tool === 'pen' ? 'pencil' : 'highlighter',
        x,
        y,
        color: strokeColor,
        strokeWidth,
        elementId: currentElementIdRef.current,
        timestamp: Date.now()
      })
      
      const previewElement: DrawingElement = {
        id: currentElementIdRef.current || `preview-${tool}-${Date.now()}`,
        type: tool === 'pen' ? 'freehand' : 'highlight',
        points: [...currentPathRef.current],
        options: {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          roughness: roughness
        },
        timestamp: Date.now()
      }
      
      setCurrentDrawingElement(previewElement)
    } else if (startPoint && (tool === 'rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'line' || tool === 'arrow')) {
      const width = x - startPoint.x
      const height = y - startPoint.y
      
      const previewElement: DrawingElement = {
        id: `preview-${tool}`,
        type: tool,
        points: tool === 'line' || tool === 'arrow' ? [startPoint.x, startPoint.y, x, y] : [],
        x: tool === 'line' || tool === 'arrow' ? undefined : Math.min(startPoint.x, x),
        y: tool === 'line' || tool === 'arrow' ? undefined : Math.min(startPoint.y, y),
        width: tool === 'line' || tool === 'arrow' ? undefined : Math.abs(width),
        height: tool === 'line' || tool === 'arrow' ? undefined : Math.abs(height),
        options: {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          fill: fillColor,
          roughness: roughness
        },
        timestamp: Date.now()
      }
      
      setCurrentDrawingElement(previewElement)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault()
    
    if (!isTeacher || !isDrawingRef.current) return
    
    isDrawingRef.current = false
    setIsPanning(false)
    
    const { x, y } = getMousePos(e)
    
    if (isConnected) {
      sendTeacherCursor(x, y, tool, false)
    }
    
    if (tool === 'pen' || tool === 'highlighter') {
      if (currentPathRef.current.length >= 2) {
        if (isConnected) {
          sendCompressedDrawing({
            action: 'draw_end',
            tool: tool === 'pen' ? 'pencil' : 'highlighter',
            elementId: currentElementIdRef.current,
            isComplete: true,
            timestamp: Date.now()
          })
        }
        
        const element: DrawingElement = {
          id: currentElementIdRef.current || `${tool}-${Date.now()}`,
          type: tool === 'pen' ? 'freehand' : 'highlight',
          points: [...currentPathRef.current],
          options: {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            roughness: roughness
          },
          timestamp: Date.now()
        }
        
        setDrawingElements(prev => [...prev, element])
        
        if (isConnected) {
          sendDrawingElement(element)
        }
        
        setCurrentDrawingElement(null)
      }
      currentPathRef.current = []
    } else if (startPoint && (tool === 'rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'line' || tool === 'arrow')) {
      const width = x - startPoint.x
      const height = y - startPoint.y
      
      if (Math.abs(width) > 5 || Math.abs(height) > 5) {
        let element: DrawingElement
        
        if (tool === 'line' || tool === 'arrow') {
          element = {
            id: `${tool}-${Date.now()}`,
            type: tool,
            points: [startPoint.x, startPoint.y, x, y],
            options: {
              stroke: strokeColor,
              strokeWidth: strokeWidth,
              roughness: roughness
            },
            timestamp: Date.now()
          }
        } else {
          element = {
            id: `${tool}-${Date.now()}`,
            type: tool,
            points: [],
            x: Math.min(startPoint.x, x),
            y: Math.min(startPoint.y, y),
            width: Math.abs(width),
            height: Math.abs(height),
            options: {
              stroke: strokeColor,
              strokeWidth: strokeWidth,
              fill: fillColor,
              roughness: roughness
            },
            timestamp: Date.now()
          }
        }
        
        setDrawingElements(prev => [...prev, element])
        
        if (isConnected) {
          sendDrawingElement(element)
        }
      }
      
      setCurrentDrawingElement(null)
    }
    
    setStartPoint(null)
  }

  const handleTextSubmit = () => {
    if (textInput && textPosition) {
      const element: DrawingElement = {
        id: `text-${Date.now()}`,
        type: 'text',
        points: [],
        x: textPosition.x,
        y: textPosition.y,
        text: textInput,
        options: {
          stroke: strokeColor,
          strokeWidth: strokeWidth
        },
        timestamp: Date.now()
      }
      
      setDrawingElements(prev => [...prev, element])
      
      if (isConnected) {
        sendDrawingElement(element)
      }
      
      setTextInput('')
      setTextPosition(null)
    }
  }

  const clearCanvas = () => {
    if (isTeacher && window.confirm('Clear the whiteboard for all students?')) {
      setUndoStack(prev => [...prev, drawingElements])
      clearElements()
    }
  }

  const handleUndo = () => {
    if (drawingElements.length > 0) {
      const lastElement = drawingElements[drawingElements.length - 1]
      setUndoStack(prev => [...prev, [lastElement]])
      setDrawingElements(prev => prev.slice(0, -1))
      
      if (isConnected) {
        sendCompressedDrawing({
          action: 'erase',
          elementId: lastElement.id,
          timestamp: Date.now()
        })
      }
    }
  }

  const handleEndClass = async () => {
    if (!isTeacher) return
    
    const confirmEnd = window.confirm('Are you sure you want to end this class? All students will be redirected to their dashboard.')
    
    if (confirmEnd) {
      try {
        const response = await fetch(`/api/room-classes/${classId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teacherId: localStorage.getItem('userId'),
            message: 'The class has been ended by the teacher.'
          })
        })

        if (response.ok) {
          localStorage.removeItem('currentRoomId')
          localStorage.removeItem('currentClassId')
          localStorage.removeItem('currentClassroomId')
          localStorage.removeItem('currentLectureData')
          
          router.push('/teacher-dashboard')
        } else {
          const error = await response.json()
          console.error('Error ending class:', error)
          alert('❌ Failed to end class. Please try again.')
        }
      } catch (error) {
        console.error('Error ending class:', error)
        alert('❌ Network error. Please check your connection.')
      }
    }
  }

  const formatElapsedTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (bandwidthMode === 'ultra-low') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-xl font-bold mb-2">Ultra-Low Bandwidth Mode</h2>
          <p className="text-gray-600">Whiteboard is disabled to save bandwidth</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <User className="w-6 h-6" />
              <div>
                <h1 className="text-lg font-bold">{subject} - {lectureTitle}</h1>
                <p className="text-blue-100 text-sm">Room: {roomId}</p>
              </div>
            </div>
            
            <div className="text-sm text-blue-100">
              Teacher: {teacherName}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-sm text-blue-100">Live Time</div>
              <div className="text-lg font-bold">{formatElapsedTime(elapsedTime)}</div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-blue-100">Connection</div>
              <div className={`text-sm font-bold flex items-center space-x-1 ${isConnected ? 'text-green-300' : 'text-red-300'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-blue-100">Participants</div>
              <div className="text-sm font-bold flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{connectedUsers.length}</span>
              </div>
            </div>
            
            {/* Simple WebRTC Audio System */}
            <SimpleWebRTCAudio
              isTeacher={isTeacher}
              roomId={roomId || ''}
            />
            
            {isTeacher && (
              <button
                onClick={handleEndClass}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>End Class</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main whiteboard area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          {isTeacher && (
            <div className="p-4 border-b bg-white shadow-sm">
              <div className="flex items-center space-x-3 overflow-x-auto">
                {/* Tools */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setTool('select')}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'select' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Select"
                  >
                    <Move className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('hand')}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'hand' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Pan"
                  >
                    <Hand className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setTool('pen')}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'pen' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Pen"
                  >
                    <PenTool className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('highlighter')}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'highlighter' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Highlighter"
                  >
                    <Highlighter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('eraser')}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'eraser' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Eraser"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setTool('rectangle')}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'rectangle' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Rectangle"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('circle')}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'circle' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Circle"
                  >
                    <Circle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('triangle')}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'triangle' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Triangle"
                  >
                    <Triangle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('line')}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'line' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Line"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('arrow')}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'arrow' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Arrow"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('text')}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'text' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Text"
                  >
                    <Type className="w-4 h-4" />
                  </button>
                </div>

                {/* Color picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowColorPalette(!showColorPalette)}
                    className="p-2 rounded-md border border-gray-300 flex items-center space-x-2"
                  >
                    <div 
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: strokeColor }}
                    ></div>
                    <Palette className="w-4 h-4" />
                  </button>
                  
                  {showColorPalette && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-lg shadow-lg border z-50">
                      <div className="grid grid-cols-5 gap-2">
                        {colors.map(color => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded border-2 ${
                              strokeColor === color ? 'border-blue-500' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              setStrokeColor(color)
                              setShowColorPalette(false)
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stroke width */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Size:</span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-600 w-6">{strokeWidth}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleUndo}
                    className="p-2 rounded-md hover:bg-gray-200 transition-colors"
                    title="Undo"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearCanvas}
                    className="p-2 rounded-md hover:bg-gray-200 transition-colors"
                    title="Clear All"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 relative bg-white">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              style={{ 
                touchAction: 'none',
                cursor: tool === 'hand' ? 'grab' : 'crosshair'
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-l bg-white flex flex-col`}>
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Chat & Participants</h3>
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Participants */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm text-gray-600">
                Participants ({connectedUsers.length})
              </h4>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {connectedUsers.map(user => (
                <div key={user.id} className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${user.isTeacher ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                  <span className={user.isTeacher ? 'font-semibold' : ''}>{user.name}</span>
                  {user.isTeacher && <span className="text-blue-500 text-xs">(Teacher)</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Chat messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 p-4 overflow-y-auto space-y-3"
          >
            {chatMessages.map(message => (
              <div key={message.id} className={`${
                message.userId === 'system' 
                  ? 'text-center text-sm text-gray-500 italic' 
                  : ''
              }`}>
                {message.userId !== 'system' && (
                  <div className={`p-3 rounded-lg max-w-xs ${
                    message.isTeacher 
                      ? 'bg-blue-100 text-blue-900 ml-auto'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="font-semibold text-xs mb-1">
                      {message.userName}
                      {message.isTeacher && <span className="text-blue-500 ml-1">(Teacher)</span>}
                    </div>
                    <div className="text-sm">{message.message}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                )}
                {message.userId === 'system' && (
                  <div className="text-center text-sm text-gray-500">
                    {message.message}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Chat input */}
          <div className="p-4 border-t">
            {!isTeacher && (
              <button
                onClick={toggleHandRaise}
                className={`w-full mb-3 py-2 px-4 rounded-lg font-medium transition-colors ${
                  handRaised 
                    ? 'bg-red-500 text-white' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {handRaised ? '✋ Lower Hand' : '✋ Raise Hand'}
              </button>
            )}
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendChatMessage}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar toggle button */}
        {!showSidebar && (
          <button
            onClick={() => setShowSidebar(true)}
            className="absolute top-1/2 right-0 transform -translate-y-1/2 bg-blue-500 text-white p-2 rounded-l-lg shadow-lg hover:bg-blue-600 transition-colors z-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Text Input Modal */}
      {textPosition && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Add Text</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
              placeholder="Enter text..."
              className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex space-x-2 justify-end">
              <button
                onClick={() => setTextPosition(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleTextSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Real-time Chat Component */}
      <RealtimeChat
        socket={socket}
        currentUserId={`user_${teacherName}_${roomId || 'session'}`}
        currentUserName={teacherName}
        isTeacher={isTeacher}
        connectedUsers={connectedUsers}
        isVisible={isChatVisible}
        onToggleVisibility={() => setIsChatVisible(!isChatVisible)}
      />
    </div>
  )
}

export default FullWhiteBoard
