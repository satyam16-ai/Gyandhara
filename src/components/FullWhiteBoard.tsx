'use client'

import React from 'react'
import { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import rough from 'roughjs'
import { useWhiteboard } from '../contexts/WhiteboardContext'
import { CompressedDrawingData } from '../utils/compression'
import RealtimeChat from './RealtimeChat'
import AIDoubtSolver from './AIDoubtSolver'
import SimpleAudioClient from './SimpleAudioClient'
import PDFViewer from './PDFViewer'
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
  ChevronDown,
  User,
  LogOut,
  X,
  MessageCircle,
  Send,
  Users,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Bot,
  Plus,
  Presentation,
  Copy,
  FileText,
  Monitor,
  ImagePlus,
  Grid3x3,
  FileImage,
  Notebook,
  BarChart3,
  Activity,
  Zap,
  Gauge,
  RectangleHorizontal,
  Hexagon,
  Star
} from 'lucide-react'

interface DrawingElement {
  id: string
  type: 'freehand' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'highlight' | 'triangle' | 'image' | 
        'filled-rectangle' | 'filled-circle' | 'filled-triangle' | 'diamond' | 'filled-diamond' | 'ellipse' | 'filled-ellipse'
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
  imageData?: string // base64 image data
  imageUrl?: string  // image URL
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

type Tool = 'select' | 'pen' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'highlighter' | 'eraser' | 'triangle' | 'hand' | 'image' | 'filled-rectangle' | 'filled-circle' | 'filled-triangle' | 'diamond' | 'filled-diamond' | 'ellipse' | 'filled-ellipse'

const colors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
  '#800000', '#000080', '#808080', '#C0C0C0', '#FFFFFF'
]

// Shape tool groups for dropdown
const shapeGroups = [
  {
    name: 'Basic Shapes',
    tools: [
      { tool: 'rectangle' as Tool, name: 'Rectangle', icon: Square },
      { tool: 'circle' as Tool, name: 'Circle', icon: Circle },
      { tool: 'triangle' as Tool, name: 'Triangle', icon: Triangle },
      { tool: 'line' as Tool, name: 'Line', icon: Minus },
      { tool: 'arrow' as Tool, name: 'Arrow', icon: ArrowRight },
    ]
  },
  {
    name: 'Filled Shapes',
    tools: [
      { tool: 'filled-rectangle' as Tool, name: 'Filled Rectangle', icon: null },
      { tool: 'filled-circle' as Tool, name: 'Filled Circle', icon: null },
      { tool: 'filled-triangle' as Tool, name: 'Filled Triangle', icon: null },
      { tool: 'diamond' as Tool, name: 'Diamond', icon: null },
      { tool: 'filled-diamond' as Tool, name: 'Filled Diamond', icon: null },
      { tool: 'ellipse' as Tool, name: 'Ellipse', icon: null },
      { tool: 'filled-ellipse' as Tool, name: 'Filled Ellipse', icon: null },
    ]
  }
]

// Helper function to get current shape tool info
const getCurrentShapeInfo = (tool: Tool) => {
  for (const group of shapeGroups) {
    const found = group.tools.find(t => t.tool === tool)
    if (found) return found
  }
  return { tool, name: 'Shapes', icon: Square }
}

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
 
  // Canvas and drawing refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const roughCanvasRef = useRef<any>(null)
  const isDrawingRef = useRef(false)
  const currentPathRef = useRef<number[]>([])
  const currentElementIdRef = useRef<string>('')
  const elementsRef = useRef<DrawingElement[]>([])
  const currentDrawingElementRef = useRef<DrawingElement | null>(null)
  const teacherCursorRef = useRef<any>(null)
  
  // UI State
  const [tool, setTool] = useState<Tool>('pen')
  const [showShapeDropdown, setShowShapeDropdown] = useState(false)
  const [showToolbar, setShowToolbar] = useState(true)
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
  
  // Image handling
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<DrawingElement | null>(null)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [isResizingImage, setIsResizingImage] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string>('')
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  const [initialImageState, setInitialImageState] = useState<{x: number, y: number, width: number, height: number} | null>(null)
  const [cursorType, setCursorType] = useState<string>('default')
  
  // Selected drawing element for move tool
  const [selectedElement, setSelectedElement] = useState<DrawingElement | null>(null)
  const [isDraggingElement, setIsDraggingElement] = useState(false)
  const [elementDragOffset, setElementDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  
  // Grid settings
  const [showGrid, setShowGrid] = useState<boolean>(true)
  const [gridSize, setGridSize] = useState<number>(20)
  const [gridType, setGridType] = useState<'dots' | 'lines'>('lines')
  const [showGridOptions, setShowGridOptions] = useState<boolean>(false)
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false)
  
  // Paper-like settings
  const [paperTexture, setPaperTexture] = useState<boolean>(true)
  const [paperType, setPaperType] = useState<'notebook' | 'graph' | 'plain' | 'legal'>('notebook')
  const [panOffset, setPanOffset] = useState({x: 0, y: 0})
  
  // PDF Viewer states
  const [showPDFViewer, setShowPDFViewer] = useState(false)
  const [currentPDFUrl, setCurrentPDFUrl] = useState<string | null>(null)
  const [currentPDFName, setCurrentPDFName] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Chat and sidebar state
  const [showSidebar, setShowSidebar] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  
  // Chat messages state - persists when modal is closed/opened
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string
    userId: string
    userName: string
    message: string
    timestamp: number
    type: 'text' | 'system' | 'notification'
    isTeacher: boolean
    replyTo?: string
  }>>([])
  
  // AI Doubt Solver state
  const [isAIDoubtVisible, setIsAIDoubtVisible] = useState(false)
  
  // Compression Stats state
  const [showCompressionStats, setShowCompressionStats] = useState(false)
  
  // Slide system state
  const [slides, setSlides] = useState<Array<{id: string, elements: DrawingElement[], title: string}>>([
    { id: 'slide-1', elements: [], title: 'Slide 1' }
  ])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true)
  
  // Timer state
  const [classStartTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  
  // Legacy audio state - now using SimpleAudioClient which manages its own state
  // const [audioState, setAudioState] = useState({
  //   isConnected: false,
  //   isProducing: false,
  //   isMuted: false,
  //   isConnecting: false,
  //   state: 'disconnected'
  // })

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

  const findImageAtPosition = (x: number, y: number): DrawingElement | null => {
    for (let i = drawingElements.length - 1; i >= 0; i--) {
      const element = drawingElements[i]
      
      if (element.type === 'image' && 
          element.x !== undefined && 
          element.y !== undefined && 
          element.width !== undefined && 
          element.height !== undefined) {
        
        const right = element.x + element.width
        const bottom = element.y + element.height
        
        if (x >= element.x && x <= right && y >= element.y && y <= bottom) {
          return element
        }
      }
    }
    return null
  }

  const getResizeHandle = (x: number, y: number, image: DrawingElement): string => {
    if (!image.x || !image.y || !image.width || !image.height) return ''
    
    const handleSize = 8
    const handles = [
      { type: 'nw', x: image.x, y: image.y },
      { type: 'ne', x: image.x + image.width, y: image.y },
      { type: 'sw', x: image.x, y: image.y + image.height },
      { type: 'se', x: image.x + image.width, y: image.y + image.height },
      { type: 'n', x: image.x + image.width/2, y: image.y },
      { type: 's', x: image.x + image.width/2, y: image.y + image.height },
      { type: 'w', x: image.x, y: image.y + image.height/2 },
      { type: 'e', x: image.x + image.width, y: image.y + image.height/2 },
    ]
    
    for (const handle of handles) {
      if (x >= handle.x - handleSize/2 && x <= handle.x + handleSize/2 &&
          y >= handle.y - handleSize/2 && y <= handle.y + handleSize/2) {
        return handle.type
      }
    }
    return ''
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
      
      // Sync canvas dimensions for consistent sizing across teacher/student
      if (socket && isTeacher) {
        socket.emit('canvasDimensionsChanged', {
          sessionId: roomId,
          width: rect.width,
          height: rect.height,
          dpr: dpr
        })
      }

      // If student, try to keep the teacher canvas fully visible on resize by fitting current drawing bounds
      if (socket && !isTeacher) {
        // Fit to container while maintaining aspect ratio based on current slide/drawing bounds
        try {
          const contentWidth = rect.width
          const contentHeight = rect.height
          if (contentWidth > 0 && contentHeight > 0) {
            // Compute a safe zoom that keeps everything within viewport
            // Prefer slight padding so edges are not clipped
            const padding = 16
            const availW = Math.max(1, rect.width - padding * 2)
            const availH = Math.max(1, rect.height - padding * 2)
            // Base design space is the canvas CSS size itself
            const fitZoom = 1 // since drawing coordinates are in CSS pixels already
            // Center the view
            setPanOffset({ x: padding, y: padding })
            setZoom(fitZoom)
          }
        } catch {}
      }
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

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - classStartTime)
    }, 1000)
    return () => clearInterval(timer)
  }, [classStartTime])

  // Socket listeners for slide changes
  useEffect(() => {
    if (!socket) return

    const handleSlideChanged = (data: { slideIndex: number, slides: any[] }) => {
      setCurrentSlideIndex(data.slideIndex)
      setSlides(data.slides)
      setDrawingElements(data.slides[data.slideIndex]?.elements || [])
    }

    const handleSlidesLoaded = (data: { slides: any[], currentSlideIndex: number }) => {
      setSlides(data.slides)
      setCurrentSlideIndex(data.currentSlideIndex)
      setDrawingElements(data.slides[data.currentSlideIndex]?.elements || [])
    }

    socket.on('slide-changed', handleSlideChanged)
    socket.on('slides-loaded', handleSlidesLoaded)

    return () => {
      socket.off('slide-changed', handleSlideChanged)
      socket.off('slides-loaded', handleSlidesLoaded)
    }
  }, [socket])

  // Sync current slide with drawing elements
  useEffect(() => {
    if (slides.length > 0 && currentSlideIndex >= 0) {
      const updatedSlides = [...slides]
      updatedSlides[currentSlideIndex] = {
        ...updatedSlides[currentSlideIndex],
        elements: drawingElements
      }
      setSlides(updatedSlides)
    }
  }, [drawingElements, currentSlideIndex])

  // Update refs when state changes
  const lastElementsLengthRef = useRef(0)
  const isRedrawScheduledRef = useRef(false)
  
  useEffect(() => {
    elementsRef.current = drawingElements
    
    // Only redraw if we have new elements added, not for modifications
    if (drawingElements.length !== lastElementsLengthRef.current) {
      lastElementsLengthRef.current = drawingElements.length
      
      // Schedule redraw only if not already scheduled
      if (!isRedrawScheduledRef.current) {
        isRedrawScheduledRef.current = true
        requestAnimationFrame(() => {
          redrawCanvas()
          isRedrawScheduledRef.current = false
        })
      }
    }
  }, [drawingElements])

  useEffect(() => {
    currentDrawingElementRef.current = currentDrawingElement
    // Only redraw for current drawing element during active drawing
    if (currentDrawingElement && isDrawingRef.current) {
      if (!isRedrawScheduledRef.current) {
        isRedrawScheduledRef.current = true
        requestAnimationFrame(() => {
          redrawCanvas()
          isRedrawScheduledRef.current = false
        })
      }
    }
  }, [currentDrawingElement])

  useEffect(() => {
    teacherCursorRef.current = teacherCursor
    // Cursor updates don't need full canvas redraw
  }, [teacherCursor])

  // Redraw only for transform changes (zoom, pan) - immediate
  useEffect(() => {
    redrawCanvas()
  }, [zoom, panOffset])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showShapeDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.relative')) {
          setShowShapeDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShapeDropdown])

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedImage && isTeacher) {
          // Delete selected image
          setDrawingElements(prev => prev.filter(el => el.id !== selectedImage.id))
          setSelectedImage(null)
          
          // Send deletion to other users
          if (isConnected) {
            sendCompressedDrawing({ action: 'erase', elementId: selectedImage.id, timestamp: Date.now() })
            sendDrawingUpdate('erase', undefined, selectedImage.id)
          }
        }
      }
      
      if (e.key === 'Escape') {
        // Deselect image
        setSelectedImage(null)
        setIsDraggingImage(false)
        setIsResizingImage(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage, socket, isTeacher])

  // Close grid options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showGridOptions && !(event.target as Element).closest('.grid-options-container')) {
        setShowGridOptions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showGridOptions])

  // Paper style synchronization for students
  useEffect(() => {
    if (!socket) return

    const handlePaperStyleChanged = (styleData: any) => {
      if (styleData.sessionId === roomId) {
        console.log('📄 Student received paper style update:', styleData)
        if (!isTeacher) { // Only students update from teacher
          setPaperType(styleData.paperType)
          setPaperTexture(styleData.paperTexture)
          if (styleData.showGrid !== undefined) setShowGrid(styleData.showGrid)
          if (styleData.gridType !== undefined) setGridType(styleData.gridType)
          if (styleData.gridSize !== undefined) setGridSize(styleData.gridSize)
          if (styleData.snapToGrid !== undefined) setSnapToGrid(styleData.snapToGrid)
        }
      }
    }

    const handleCanvasDimensionsChanged = (dimensionData: any) => {
      if (dimensionData.sessionId === roomId && !isTeacher) {
        console.log('📐 Student received canvas dimension update:', dimensionData)
        // Fit teacher canvas into student's viewport by adjusting zoom and pan.
        const canvas = canvasRef.current
        if (!canvas) return
        const container = canvas.parentElement
        if (!container) return
        const rect = container.getBoundingClientRect()

        const teacherW = Math.max(1, dimensionData.width || 1)
        const teacherH = Math.max(1, dimensionData.height || 1)
        const availW = Math.max(1, rect.width - 16) // padding
        const availH = Math.max(1, rect.height - 16)

        const scaleX = availW / teacherW
        const scaleY = availH / teacherH
        const fitZoom = Math.min(scaleX, scaleY)

        // Clamp zoom to reasonable bounds
        const clampedZoom = Math.max(0.2, Math.min(fitZoom, 3))
        setZoom(clampedZoom)

        // Center content
        const offsetX = (rect.width - teacherW * clampedZoom) / 2
        const offsetY = (rect.height - teacherH * clampedZoom) / 2
        setPanOffset({ x: Math.max(0, offsetX), y: Math.max(0, offsetY) })
        
        // Redraw after adjusting view
        redrawCanvas()
      }
    }

    socket.on('paperStyleChanged', handlePaperStyleChanged)
    socket.on('canvasDimensionsChanged', handleCanvasDimensionsChanged)
    
    // PDF sharing event handlers
    const handlePDFReceived = (data: { fileName: string, fileData: string, timestamp: string }) => {
      console.log('PDF received from teacher:', data.fileName)
      setCurrentPDFUrl(data.fileData)
      setCurrentPDFName(data.fileName)
      setShowPDFViewer(true)
      console.log(`PDF received: ${data.fileName}`)
    }
    
    // Students listen for PDF shares
    if (!isTeacher) {
      socket.on('student-receive-pdf', handlePDFReceived)
    }
    
    // Teacher broadcasts initial paper settings when joining or settings change
    if (isTeacher) {
      const broadcastCurrentSettings = () => {
        socket.emit('paperStyleChanged', {
          sessionId: roomId,
          paperType,
          paperTexture,
          showGrid,
          gridType,
          gridSize,
          snapToGrid
        })
      }
      
      // Broadcast current settings periodically for new students joining
      const settingsBroadcast = setInterval(broadcastCurrentSettings, 3000)
      
      // Also broadcast immediately
      setTimeout(broadcastCurrentSettings, 500)
      
      return () => {
        socket.off('paperStyleChanged', handlePaperStyleChanged)
        socket.off('canvasDimensionsChanged', handleCanvasDimensionsChanged)
        clearInterval(settingsBroadcast)
      }
    }
    
    return () => {
      socket.off('paperStyleChanged', handlePaperStyleChanged)
      socket.off('canvasDimensionsChanged', handleCanvasDimensionsChanged)
    }
  }, [socket, isTeacher, roomId, paperType, paperTexture, showGrid, gridType, gridSize, snapToGrid])

  // Grid pattern generator (legacy - now using paper background)
  const getGridBackground = () => {
    return getPaperBackground()
  }

  // Snap to grid helper
  const snapPoint = (x: number, y: number) => {
    if (!snapToGrid || !showGrid) return { x, y }
    
    const snappedX = Math.round(x / gridSize) * gridSize
    const snappedY = Math.round(y / gridSize) * gridSize
    return { x: snappedX, y: snappedY }
  }

  // Paper texture and pattern generators
  const getPaperTexture = () => {
    if (!paperTexture) return ''
    
    // Enhanced paper grain texture using multiple noise layers
    const noisePattern = `url("data:image/svg+xml,%3csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3e%3cfilter id='paperTexture'%3e%3cfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' result='noise' stitchTiles='stitch'/%3e%3cfeColorMatrix in='noise' type='saturate' values='0'/%3e%3c/filter%3e%3crect width='100%25' height='100%25' filter='url(%23paperTexture)' opacity='0.04'/%3e%3c/svg%3e")`
    return noisePattern
  }

  const getPaperBackground = () => {
    const baseColor = '#fefefe' // Slightly off-white for paper feel
    
    if (!showGrid && paperType === 'plain') {
      return paperTexture ? `${baseColor}, ${getPaperTexture()}` : baseColor
    }
    
    const size = gridSize
    let gridPattern = ''
    
    switch (paperType) {
      case 'notebook':
        // Lined notebook paper with red margin
        gridPattern = `url("data:image/svg+xml,%3csvg width='100%25' height='${size}' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='${baseColor.replace('#', '%23')}'/%3e%3cline x1='80' y1='0' x2='80' y2='100%25' stroke='%23ff5555' stroke-width='1.5' opacity='0.85'/%3e%3cline x1='0' y1='${size}' x2='100%25' y2='${size}' stroke='%23a7c5e8' stroke-width='0.9' opacity='0.7'/%3e%3cline x1='40' y1='0' x2='40' y2='100%25' stroke='%23ffaaaa' stroke-width='0.5' opacity='0.4'/%3e%3c/svg%3e")`
        break
        
      case 'graph':
        // Graph paper
        const color = snapToGrid ? '%23a3a3a3' : '%23d1d5db'
        const strokeWidth = snapToGrid ? '0.8' : '0.5'
        gridPattern = `url("data:image/svg+xml,%3csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='${baseColor.replace('#', '%23')}'/%3e%3cpath d='M ${size} 0 L 0 0 0 ${size}' fill='none' stroke='${color}' stroke-width='${strokeWidth}' opacity='0.6'/%3e%3c/svg%3e")`
        break
        
      case 'legal':
        // Legal pad style with yellow tint and wide lines
        const legalColor = '#fffef0' // Slightly yellow
        gridPattern = `url("data:image/svg+xml,%3csvg width='100%25' height='32' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='${legalColor.replace('#', '%23')}'/%3e%3cline x1='60' y1='0' x2='60' y2='100%25' stroke='%23ff4444' stroke-width='1.8' opacity='0.9'/%3e%3cline x1='0' y1='32' x2='100%25' y2='32' stroke='%236b9bd1' stroke-width='1' opacity='0.6'/%3e%3cline x1='30' y1='0' x2='30' y2='100%25' stroke='%23ff8888' stroke-width='0.5' opacity='0.3'/%3e%3c/svg%3e")`
        break
        
      default: // dots or custom grid
        if (gridType === 'dots') {
          const dotSize = snapToGrid ? '1.5' : '1'
          const color = snapToGrid ? '%23a3a3a3' : '%23d1d5db'
          gridPattern = `url("data:image/svg+xml,%3csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='${baseColor.replace('#', '%23')}'/%3e%3ccircle cx='${size}' cy='${size}' r='${dotSize}' fill='${color}' opacity='0.4'/%3e%3c/svg%3e")`
        } else {
          const color = snapToGrid ? '%23a3a3a3' : '%23d1d5db'
          const strokeWidth = snapToGrid ? '1' : '0.6'
          gridPattern = `url("data:image/svg+xml,%3csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='${baseColor.replace('#', '%23')}'/%3e%3cpath d='M ${size} 0 L 0 0 0 ${size}' fill='none' stroke='${color}' stroke-width='${strokeWidth}' opacity='0.5'/%3e%3c/svg%3e")`
        }
    }
    
    return paperTexture ? `${gridPattern}, ${getPaperTexture()}` : gridPattern
  }

  // === Unified aspect ratio handling ===
  // Default aspect ratio 16:9; teacher broadcasts any change in live dimensions as ratio
  const [boardAspect, setBoardAspect] = useState<number>(16 / 9)

  // When teacher resizes, compute aspect and broadcast it
  useEffect(() => {
    if (!isTeacher || !socket) return
    const canvas = canvasRef.current
    if (!canvas) return
    const container = canvas.parentElement
    if (!container) return
    const onResize = () => {
      const rect = container.getBoundingClientRect()
      const w = Math.max(1, rect.width)
      const h = Math.max(1, rect.height)
      const ratio = w / h
      setBoardAspect(ratio)
      socket.emit('canvasAspectChanged', { sessionId: roomId, ratio })
    }
    window.addEventListener('resize', onResize)
    // fire once initially
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [socket, isTeacher, roomId])

  // Student listens for ratio and uses it to size the board area
  useEffect(() => {
    if (isTeacher || !socket) return
    const handler = (data: any) => {
      if (data?.sessionId === roomId && typeof data?.ratio === 'number' && isFinite(data.ratio) && data.ratio > 0) {
        setBoardAspect(data.ratio)
      }
    }
    socket.on('canvasAspectChanged', handler)
    return () => { socket.off('canvasAspectChanged', handler) }
  }, [socket, isTeacher, roomId])

  // PDF handling functions
  const handlePDFUpload = (pdfData: string, fileName: string) => {
    setCurrentPDFUrl(pdfData)
    setCurrentPDFName(fileName)
    console.log('PDF uploaded by teacher:', fileName)
  }

  // Image handling functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      // Create image element at canvas center
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const centerX = (rect.width / 2 - panOffset.x) / zoom
      const centerY = (rect.height / 2 - panOffset.y) / zoom

      const imageElement: DrawingElement = {
        id: Date.now().toString(),
        type: 'image',
        points: [],
        options: {
          stroke: '#000',
          strokeWidth: 0
        },
        x: centerX - 100, // Default image width/2
        y: centerY - 75,  // Default image height/2
        width: 200,       // Default width
        height: 150,      // Default height
        imageData: result,
        timestamp: Date.now()
      }

      setDrawingElements(prev => [...prev, imageElement])
      
      // Send to other users using standard element add event
      if (isConnected) {
        sendDrawingElement(imageElement)
      }

      // Reset tool to select after adding image
      setTool('select')
    }
    reader.readAsDataURL(file)
    
    // Reset file input
    event.target.value = ''
  }

  const handleImageClick = (imageElement: DrawingElement, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedImage(imageElement)
    setTool('select')
  }

  const handleImageDragStart = (event: React.MouseEvent) => {
    if (!selectedImage) return
    setIsDraggingImage(true)
    event.preventDefault()
  }

  const handleImageDrag = (event: React.MouseEvent) => {
    if (!isDraggingImage || !selectedImage) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    
    let x: number, y: number
    if (isTeacher) {
      // Teacher: apply zoom and pan transformations for image positioning
      x = (event.clientX - rect.left - panOffset.x) / zoom
      y = (event.clientY - rect.top - panOffset.y) / zoom
    } else {
      // Student: use direct coordinate mapping
      x = event.clientX - rect.left
      y = event.clientY - rect.top
    }

    const updatedImage = {
      ...selectedImage,
      x: x - (selectedImage.width || 100) / 2,
      y: y - (selectedImage.height || 75) / 2
    }

    setDrawingElements(prev => 
      prev.map(el => el.id === selectedImage.id ? updatedImage : el)
    )
    setSelectedImage(updatedImage)

    // Send update to other users (real-time move)
    if (socket && isTeacher) {
      socket.emit('element-move', {
        elementId: updatedImage.id,
        element: updatedImage
      })
    }
  }

  const handleImageDragEnd = () => {
    setIsDraggingImage(false)
  }

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const roughCanvas = roughCanvasRef.current
    if (!canvas || !roughCanvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      ctx.save()
      
      // Apply consistent coordinate transform for both teacher and student
      if (isTeacher) {
        // Teacher: standard coordinate system
        ctx.scale(zoom, zoom)
        ctx.translate(panOffset.x, panOffset.y)
      } else {
        // Student: maintain 1:1 coordinate mapping with teacher's drawing space
        // No additional scaling to prevent size/position mismatches
        ctx.scale(1, 1)
        ctx.translate(0, 0)
      }

      // Draw elements - use refs to avoid re-render dependencies
      const elementsToRender = elementsRef.current || []
      
      elementsToRender
        .filter(element => element && element.type && element.options) // Filter out invalid elements
        .forEach(element => {
        try {
          drawElement(ctx, roughCanvas, element)
        } catch (error) {
          console.error('Error drawing element:', error, element)
        }
      })

      const currentElement = currentDrawingElementRef.current
      if (currentElement && currentElement.type && currentElement.options) {
        try {
          drawElement(ctx, roughCanvas, currentElement, true)
        } catch (error) {
          console.error('Error drawing current element:', error)
        }
      }

      const teacherCursorData = teacherCursorRef.current
      if (!isTeacher && teacherCursorData) {
        drawTeacherCursor(ctx, teacherCursorData)
      }

      // Draw selection outline for selected element
      if (selectedElement && tool === 'select') {
        ctx.strokeStyle = '#3b82f6' // Blue selection outline
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5]) // Dashed line
        
        if (selectedElement.x !== undefined && selectedElement.y !== undefined) {
          // For elements with x,y position
          ctx.strokeRect(
            selectedElement.x - 5, 
            selectedElement.y - 5, 
            (selectedElement.width || 50) + 10, 
            (selectedElement.height || 50) + 10
          )
        } else if (selectedElement.points.length >= 4) {
          // For elements with points - draw bounding box
          const xs = selectedElement.points.filter((_, i) => i % 2 === 0)
          const ys = selectedElement.points.filter((_, i) => i % 2 === 1)
          const minX = Math.min(...xs) - 5
          const maxX = Math.max(...xs) + 5
          const minY = Math.min(...ys) - 5
          const maxY = Math.max(...ys) + 5
          ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
        }
        
        ctx.setLineDash([]) // Reset to solid line
      }

      ctx.restore()
    }) // Close requestAnimationFrame callback
  }, [zoom, panOffset, isTeacher]) // Include isTeacher for consistent rendering

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20 * zoom
    ctx.fillStyle = '#e5e7eb'
    ctx.globalAlpha = 0.4
    
    // Draw dot grid instead of lines
    for (let x = panOffset.x % gridSize; x < width; x += gridSize) {
      for (let y = panOffset.y % gridSize; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.arc(x, y, 1 * zoom, 0, Math.PI * 2)
        ctx.fill()
      }
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
      case 'filled-rectangle':
        drawFilledRectangle(ctx, element)
        break
      case 'circle':
        drawCircle(roughCanvas, element)
        break
      case 'filled-circle':
        drawFilledCircle(ctx, element)
        break
      case 'triangle':
        drawTriangle(roughCanvas, element)
        break
      case 'filled-triangle':
        drawFilledTriangle(ctx, element)
        break
      case 'diamond':
        drawDiamond(roughCanvas, element)
        break
      case 'filled-diamond':
        drawFilledDiamond(ctx, element)
        break
      case 'ellipse':
        drawEllipse(roughCanvas, element)
        break
      case 'filled-ellipse':
        drawFilledEllipse(ctx, element)
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
      case 'image':
        drawImage(ctx, element)
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
    
    // Use native Canvas API for perfect rectangles
    const canvas = roughCanvas.canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.save()
    // Fill if provided
    if (element.options.fill && element.options.fill !== 'transparent') {
      ctx.fillStyle = element.options.fill
      ctx.fillRect(element.x, element.y, element.width, element.height)
    }
    ctx.strokeStyle = element.options.stroke || '#000000'
    ctx.lineWidth = element.options.strokeWidth || 2
    ctx.strokeRect(element.x, element.y, element.width, element.height)
    ctx.restore()
  }

  const drawCircle = (roughCanvas: any, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid circle element:', element)
      return
    }
    
    // Use native Canvas API for perfect circles
    const canvas = roughCanvas.canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
  ctx.save()
  ctx.strokeStyle = element.options.stroke || '#000000'
  ctx.lineWidth = element.options.strokeWidth || 2
    
    const centerX = element.x + element.width / 2
    const centerY = element.y + element.height / 2
    const radius = Math.min(Math.abs(element.width), Math.abs(element.height)) / 2
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    if (element.options.fill && element.options.fill !== 'transparent') {
      ctx.fillStyle = element.options.fill
      ctx.fill()
    }
    ctx.stroke()
    ctx.restore()
  }

  const drawTriangle = (roughCanvas: any, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid triangle element:', element)
      return
    }
    
    // Use native Canvas API for perfect triangles
    const canvas = roughCanvas.canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
  ctx.save()
  ctx.strokeStyle = element.options.stroke || '#000000'
  ctx.lineWidth = element.options.strokeWidth || 2
    
    const x1 = element.x + element.width / 2  // top point
    const y1 = element.y
    const x2 = element.x                      // bottom left
    const y2 = element.y + element.height
    const x3 = element.x + element.width      // bottom right
    const y3 = element.y + element.height
    
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x3, y3)
    ctx.closePath()
    if (element.options.fill && element.options.fill !== 'transparent') {
      ctx.fillStyle = element.options.fill
      ctx.fill()
    }
    ctx.stroke()
    ctx.restore()
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

  const drawImage = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (!element || !element.imageData || element.x === undefined || element.y === undefined) {
      console.warn('Invalid image element:', element)
      return
    }

    const img = new Image()
    img.onload = () => {
      ctx.save()
      
      const width = element.width || 200
      const height = element.height || 150
      
      // Draw the image
      ctx.drawImage(img, element.x!, element.y!, width, height)
      
      // Draw selection border if this image is selected
      if (selectedImage && selectedImage.id === element.id) {
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(element.x!, element.y!, width, height)
        
        // Draw resize handles
        const handleSize = 8
        const handles = [
          { x: element.x!, y: element.y! }, // top-left
          { x: element.x! + width, y: element.y! }, // top-right
          { x: element.x!, y: element.y! + height }, // bottom-left
          { x: element.x! + width, y: element.y! + height }, // bottom-right
          { x: element.x! + width/2, y: element.y! }, // top-center
          { x: element.x! + width/2, y: element.y! + height }, // bottom-center
          { x: element.x!, y: element.y! + height/2 }, // left-center
          { x: element.x! + width, y: element.y! + height/2 }, // right-center
        ]
        
        ctx.fillStyle = '#2563eb'
        ctx.setLineDash([])
        handles.forEach(handle => {
          ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize)
        })
      }
      
      ctx.restore()
    }
    img.src = element.imageData
  }

  // New perfect shape drawing functions using native Canvas API
  const drawFilledRectangle = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid filled rectangle element:', element)
      return
    }
    
    ctx.save()
    ctx.fillStyle = element.options.stroke || '#000000'
    ctx.fillRect(element.x, element.y, element.width, element.height)
    ctx.restore()
  }

  const drawFilledCircle = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid filled circle element:', element)
      return
    }
    
    ctx.save()
    ctx.fillStyle = element.options.stroke || '#000000'
    const centerX = element.x + element.width / 2
    const centerY = element.y + element.height / 2
    const radius = Math.min(Math.abs(element.width), Math.abs(element.height)) / 2
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const drawFilledTriangle = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid filled triangle element:', element)
      return
    }
    
    ctx.save()
    ctx.fillStyle = element.options.stroke || '#000000'
    
    const x1 = element.x + element.width / 2  // top point
    const y1 = element.y
    const x2 = element.x                      // bottom left
    const y2 = element.y + element.height
    const x3 = element.x + element.width      // bottom right
    const y3 = element.y + element.height
    
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x3, y3)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  const drawDiamond = (roughCanvas: any, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid diamond element:', element)
      return
    }
    
    // Use native Canvas API for perfect diamonds
    const canvas = roughCanvas.canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
  ctx.save()
  ctx.strokeStyle = element.options.stroke || '#000000'
  ctx.lineWidth = element.options.strokeWidth || 2
    
    const centerX = element.x + element.width / 2
    const centerY = element.y + element.height / 2
    
    ctx.beginPath()
    ctx.moveTo(centerX, element.y)                    // top
    ctx.lineTo(element.x + element.width, centerY)    // right
    ctx.lineTo(centerX, element.y + element.height)   // bottom
    ctx.lineTo(element.x, centerY)                    // left
    ctx.closePath()
    if (element.options.fill && element.options.fill !== 'transparent') {
      ctx.fillStyle = element.options.fill
      ctx.fill()
    }
    ctx.stroke()
    ctx.restore()
  }

  const drawFilledDiamond = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid filled diamond element:', element)
      return
    }
    
    ctx.save()
    ctx.fillStyle = element.options.stroke || '#000000'
    
    const centerX = element.x + element.width / 2
    const centerY = element.y + element.height / 2
    
    ctx.beginPath()
    ctx.moveTo(centerX, element.y)                    // top
    ctx.lineTo(element.x + element.width, centerY)    // right
    ctx.lineTo(centerX, element.y + element.height)   // bottom
    ctx.lineTo(element.x, centerY)                    // left
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  const drawEllipse = (roughCanvas: any, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid ellipse element:', element)
      return
    }
    
    // Use native Canvas API for perfect ellipses
    const canvas = roughCanvas.canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
  ctx.save()
  ctx.strokeStyle = element.options.stroke || '#000000'
  ctx.lineWidth = element.options.strokeWidth || 2
    
    const centerX = element.x + element.width / 2
    const centerY = element.y + element.height / 2
    const radiusX = Math.abs(element.width) / 2
    const radiusY = Math.abs(element.height) / 2
    
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
    if (element.options.fill && element.options.fill !== 'transparent') {
      ctx.fillStyle = element.options.fill
      ctx.fill()
    }
    ctx.stroke()
    ctx.restore()
  }

  const drawFilledEllipse = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (!element || !element.options || element.x === undefined || element.y === undefined || 
        element.width === undefined || element.height === undefined) {
      console.warn('Invalid filled ellipse element:', element)
      return
    }
    
    ctx.save()
    ctx.fillStyle = element.options.stroke || '#000000'
    
    const centerX = element.x + element.width / 2
    const centerY = element.y + element.height / 2
    const radiusX = Math.abs(element.width) / 2
    const radiusY = Math.abs(element.height) / 2
    
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
    ctx.fill()
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
    
    if (isTeacher) {
      // Teacher: apply zoom and pan transformations
      return {
        x: (clientX - rect.left) / zoom - panOffset.x,
        y: (clientY - rect.top) / zoom - panOffset.y
      }
    } else {
      // Student: use direct coordinate mapping to match teacher's drawing space
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      }
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
    
    // Handle image selection and manipulation
    if (tool === 'select') {
      // Check if clicking on an image
      const clickedImage = findImageAtPosition(x, y)
      if (clickedImage) {
        setSelectedImage(clickedImage)
        
        // Check if clicking on a resize handle
        const handle = getResizeHandle(x, y, clickedImage)
        if (handle) {
          setIsResizingImage(true)
          setResizeHandle(handle)
          setInitialImageState({
            x: clickedImage.x!,
            y: clickedImage.y!,
            width: clickedImage.width!,
            height: clickedImage.height!
          })
        } else {
          // Clicking on image body - start dragging
          setIsDraggingImage(true)
          setDragOffset({
            x: x - clickedImage.x!,
            y: y - clickedImage.y!
          })
        }
        return
      } else {
        setSelectedImage(null)
      }
      
      // Check if clicking on a drawing element (shapes, lines, etc.)
      const clickedElement = findElementAtPosition(x, y)
      if (clickedElement && clickedElement.type !== 'image') {
        setSelectedElement(clickedElement)
        setIsDraggingElement(true)
        
        // Calculate offset for dragging
        if (clickedElement.x !== undefined && clickedElement.y !== undefined) {
          setElementDragOffset({
            x: x - clickedElement.x,
            y: y - clickedElement.y
          })
        } else if (clickedElement.points.length >= 2) {
          // For freehand/line elements, use first point as reference
          setElementDragOffset({
            x: x - clickedElement.points[0],
            y: y - clickedElement.points[1]
          })
        }
        return
      } else {
        setSelectedElement(null)
      }
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

    // Update cursor based on what we're hovering over
    if (tool === 'select' && !isDraggingImage && !isResizingImage) {
      const hoveredImage = findImageAtPosition(x, y)
      if (hoveredImage && selectedImage && hoveredImage.id === selectedImage.id) {
        const handle = getResizeHandle(x, y, hoveredImage)
        if (handle) {
          const cursorMap: {[key: string]: string} = {
            'nw': 'nw-resize', 'ne': 'ne-resize', 'sw': 'sw-resize', 'se': 'se-resize',
            'n': 'n-resize', 's': 's-resize', 'w': 'w-resize', 'e': 'e-resize'
          }
          setCursorType(cursorMap[handle] || 'default')
        } else {
          setCursorType('move')
        }
      } else if (hoveredImage) {
        setCursorType('pointer')
      } else {
        setCursorType('default')
      }
    } else {
      setCursorType(tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : 'crosshair')
    }
    
    if (isTeacher && isConnected) {
      sendTeacherCursor(x, y, tool, isDrawingRef.current)
    }
    
    // Handle image dragging
    if (isDraggingImage && selectedImage) {
      const rawX = x - dragOffset.x
      const rawY = y - dragOffset.y
      const snapped = snapPoint(rawX, rawY)
      
      const updatedImage = {
        ...selectedImage,
        x: snapped.x,
        y: snapped.y
      }

      setDrawingElements(prev => 
        prev.map(el => el.id === selectedImage.id ? updatedImage : el)
      )
      setSelectedImage(updatedImage)

      // Send update to other users (real-time move)
      if (socket && isTeacher) {
        socket.emit('element-move', {
          elementId: updatedImage.id,
          element: updatedImage
        })
      }
      return
    }

    // Handle image resizing
    if (isResizingImage && selectedImage && initialImageState) {
      const deltaX = x - (initialImageState.x + initialImageState.width/2)
      const deltaY = y - (initialImageState.y + initialImageState.height/2)
      
      let newX = initialImageState.x
      let newY = initialImageState.y
      let newWidth = initialImageState.width
      let newHeight = initialImageState.height

      switch (resizeHandle) {
        case 'se': // southeast
          newWidth = Math.max(20, initialImageState.width + deltaX)
          newHeight = Math.max(20, initialImageState.height + deltaY)
          break
        case 'sw': // southwest
          newWidth = Math.max(20, initialImageState.width - deltaX)
          newHeight = Math.max(20, initialImageState.height + deltaY)
          newX = initialImageState.x + initialImageState.width - newWidth
          break
        case 'ne': // northeast
          newWidth = Math.max(20, initialImageState.width + deltaX)
          newHeight = Math.max(20, initialImageState.height - deltaY)
          newY = initialImageState.y + initialImageState.height - newHeight
          break
        case 'nw': // northwest
          newWidth = Math.max(20, initialImageState.width - deltaX)
          newHeight = Math.max(20, initialImageState.height - deltaY)
          newX = initialImageState.x + initialImageState.width - newWidth
          newY = initialImageState.y + initialImageState.height - newHeight
          break
        case 'n': // north
          newHeight = Math.max(20, initialImageState.height - deltaY)
          newY = initialImageState.y + initialImageState.height - newHeight
          break
        case 's': // south
          newHeight = Math.max(20, initialImageState.height + deltaY)
          break
        case 'w': // west
          newWidth = Math.max(20, initialImageState.width - deltaX)
          newX = initialImageState.x + initialImageState.width - newWidth
          break
        case 'e': // east
          newWidth = Math.max(20, initialImageState.width + deltaX)
          break
      }

      const updatedImage = {
        ...selectedImage,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      }

      setDrawingElements(prev => 
        prev.map(el => el.id === selectedImage.id ? updatedImage : el)
      )
      setSelectedImage(updatedImage)

      // Send update to other users
      if (socket && isTeacher) {
        socket.emit('element-move', {
          elementId: updatedImage.id,
          element: updatedImage
        })
      }
      return
    }
    
    // Handle drawing element dragging
    if (isDraggingElement && selectedElement) {
      const newX = x - elementDragOffset.x
      const newY = y - elementDragOffset.y
      const snapped = snapPoint(newX, newY)
      
      let updatedElement: DrawingElement
      
      if (selectedElement.x !== undefined && selectedElement.y !== undefined) {
        // For elements with x,y position (rectangles, circles, text, etc.)
        updatedElement = {
          ...selectedElement,
          x: snapped.x,
          y: snapped.y
        }
      } else if (selectedElement.points.length >= 2) {
        // For elements with points array (freehand, lines, etc.)
        const deltaX = snapped.x - selectedElement.points[0]
        const deltaY = snapped.y - selectedElement.points[1]
        
        const newPoints = []
        for (let i = 0; i < selectedElement.points.length; i += 2) {
          newPoints.push(selectedElement.points[i] + deltaX)
          newPoints.push(selectedElement.points[i + 1] + deltaY)
        }
        
        updatedElement = {
          ...selectedElement,
          points: newPoints
        }
      } else {
        return // Can't move this element type
      }

      setDrawingElements(prev => 
        prev.map(el => el.id === selectedElement.id ? updatedElement : el)
      )
      setSelectedElement(updatedElement)

      // Send update to other users in real-time
      if (socket && isTeacher) {
        socket.emit('element-move', {
          elementId: selectedElement.id,
          element: updatedElement
        })
      }
      return
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
    } else if (startPoint && (tool === 'rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'line' || tool === 'arrow' || 
               tool === 'filled-rectangle' || tool === 'filled-circle' || tool === 'filled-triangle' || 
               tool === 'diamond' || tool === 'filled-diamond' || tool === 'ellipse' || tool === 'filled-ellipse')) {
      const width = x - startPoint.x
      const height = y - startPoint.y
      
  // Map filled shapes to base types and determine fill (preserve diamond/ellipse)
  const baseType = tool.startsWith('filled-') ? tool.replace('filled-', '') : tool
      
      const shouldFill = tool.startsWith('filled-') || tool === 'filled-diamond' || tool === 'filled-ellipse'
      
      const previewElement: DrawingElement = {
        id: `preview-${tool}`,
        type: baseType as any,
        points: tool === 'line' || tool === 'arrow' ? [startPoint.x, startPoint.y, x, y] : [],
        x: tool === 'line' || tool === 'arrow' ? undefined : Math.min(startPoint.x, x),
        y: tool === 'line' || tool === 'arrow' ? undefined : Math.min(startPoint.y, y),
        width: tool === 'line' || tool === 'arrow' ? undefined : Math.abs(width),
        height: tool === 'line' || tool === 'arrow' ? undefined : Math.abs(height),
        options: {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          fill: shouldFill ? (fillColor === 'transparent' ? strokeColor : fillColor) : 'transparent',
          roughness: roughness
        },
        timestamp: Date.now()
      }
      
      setCurrentDrawingElement(previewElement)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault()
    
    // Handle element dragging end
    if (isDraggingElement) {
      setIsDraggingElement(false)
      setElementDragOffset({x: 0, y: 0})
      return
    }
    
    // Handle image dragging end
    if (isDraggingImage || isResizingImage) {
      setIsDraggingImage(false)
      setIsResizingImage(false)
      setResizeHandle('')
      setInitialImageState(null)
      return
    }
    
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
          // Persist element via legacy channel to ensure students receive final element
          sendDrawingElement(element)
        }
        
        setCurrentDrawingElement(null)
      }
      currentPathRef.current = []
    } else if (startPoint && (tool === 'rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'line' || tool === 'arrow' || 
               tool === 'filled-rectangle' || tool === 'filled-circle' || tool === 'filled-triangle' || 
               tool === 'diamond' || tool === 'filled-diamond' || tool === 'ellipse' || tool === 'filled-ellipse')) {
      const width = x - startPoint.x
      const height = y - startPoint.y
      
      if (Math.abs(width) > 5 || Math.abs(height) > 5) {
  // Map filled shapes to base types and determine fill (preserve diamond/ellipse)
  const baseType = tool.startsWith('filled-') ? tool.replace('filled-', '') : tool
        
        const shouldFill = tool.startsWith('filled-') || tool === 'filled-diamond' || tool === 'filled-ellipse'
        
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
            type: baseType as any,
            points: [],
            x: Math.min(startPoint.x, x),
            y: Math.min(startPoint.y, y),
            width: Math.abs(width),
            height: Math.abs(height),
            options: {
              stroke: strokeColor,
              strokeWidth: strokeWidth,
              fill: shouldFill ? (fillColor === 'transparent' ? strokeColor : fillColor) : 'transparent',
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
    
    // Get classId from props or localStorage
    const currentClassId = classId || localStorage.getItem('currentClassId')
    
    if (!currentClassId) {
      console.error('❌ No classId available to end class')
      alert('❌ Unable to end class: Class ID not found. Please refresh and try again.')
      return
    }
    
    const confirmEnd = window.confirm('Are you sure you want to end this class? All students will be redirected to their dashboard.')
    
    if (confirmEnd) {
      try {
        const userToken = localStorage.getItem('userToken')
        
        if (!userToken) {
          alert('❌ Authentication error. Please login again.')
          return
        }
        
        console.log('🛑 Ending class with ID:', currentClassId)
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/room-classes/${currentClassId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            message: 'The class has been ended by the teacher.'
          })
        })

        if (response.ok) {
          const result = await response.json()
          console.log('✅ Class ended successfully:', result)
          
          localStorage.removeItem('currentRoomId')
          localStorage.removeItem('currentClassId')
          localStorage.removeItem('currentClassroomId')
          localStorage.removeItem('currentLectureData')
          
          alert('✅ Class ended successfully!')
          router.push('/teacher-dashboard')
        } else {
          const error = await response.json()
          console.error('❌ Error ending class:', {
            status: response.status,
            statusText: response.statusText,
            error
          })
          alert(`❌ Failed to end class: ${error.error || error.message || 'Unknown error'}. Please try again.`)
        }
      } catch (error) {
        console.error('❌ Network error ending class:', error)
        alert('❌ Network error. Please check your connection and try again.')
      }
    }
  }

  // Slide management functions
  const createNewSlide = useCallback(() => {
    if (!isTeacher) return
    
    const newSlide = {
      id: `slide-${Date.now()}`,
      elements: [],
      title: `Slide ${slides.length + 1}`
    }
    
    setSlides(prev => [...prev, newSlide])
    setCurrentSlideIndex(slides.length)
    setDrawingElements([])
    
    // Emit slide change to all participants
    if (socket) {
      socket.emit('slide-changed', {
        slideIndex: slides.length,
        slides: [...slides, newSlide]
      })
    }
  }, [isTeacher, slides, socket])

  const navigateToSlide = useCallback((index: number) => {
    if (index < 0 || index >= slides.length) return
    
    // Save current slide before switching
    const updatedSlides = [...slides]
    updatedSlides[currentSlideIndex] = {
      ...updatedSlides[currentSlideIndex],
      elements: drawingElements
    }
    
    setSlides(updatedSlides)
    setCurrentSlideIndex(index)
    setDrawingElements(slides[index]?.elements || [])
    
    // Emit slide change to all participants
    if (socket) {
      socket.emit('slide-changed', {
        slideIndex: index,
        slides: updatedSlides
      })
    }
  }, [slides, currentSlideIndex, drawingElements, socket])

  const duplicateSlide = useCallback(() => {
    if (!isTeacher) return
    
    const currentSlide = slides[currentSlideIndex]
    const newSlide = {
      id: `slide-${Date.now()}`,
      elements: [...currentSlide.elements],
      title: `${currentSlide.title} (Copy)`
    }
    
    const newSlides = [...slides]
    newSlides.splice(currentSlideIndex + 1, 0, newSlide)
    
    setSlides(newSlides)
    setCurrentSlideIndex(currentSlideIndex + 1)
    setDrawingElements(newSlide.elements)
    
    // Emit slide change to all participants
    if (socket) {
      socket.emit('slide-changed', {
        slideIndex: currentSlideIndex + 1,
        slides: newSlides
      })
    }
  }, [isTeacher, slides, currentSlideIndex, socket])

  // Fullscreen functionality
  const requestFullscreen = useCallback(() => {
    const element = document.documentElement
    if (element.requestFullscreen) {
      element.requestFullscreen()
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen()
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen()
    }
    setShowFullscreenPrompt(false)
  }, [])

  const formatElapsedTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const getCompressionEfficiency = () => {
    const ratio = compressionStats.compressionRatio
    if (ratio >= 10) return { label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' }
    if (ratio >= 5) return { label: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' }
    if (ratio >= 2) return { label: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    return { label: 'Low', color: 'text-red-600', bgColor: 'bg-red-100' }
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
    <div className="h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 to-gray-100" style={{ minHeight: '100vh' }}>
      {/* Header - Premium Minimalistic Design */}
      <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 text-white px-3 sm:px-4 py-2 sm:py-3 shadow-xl backdrop-blur-md border-b border-gray-700/30 z-10">
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-5">
          <div className="flex items-center space-x-3 sm:space-x-5 min-w-0 flex-1">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 shadow-lg">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-100" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold truncate text-gray-100">{subject} - {lectureTitle}</h1>
                <p className="text-gray-300 text-xs truncate font-medium">Room: {roomId}</p>
              </div>
            </div>
            
            <div className="hidden sm:block text-xs text-gray-200 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20">
              <span className="font-medium">Teacher:</span> {teacherName}
            </div>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-4 flex-wrap">
            <div className="text-center bg-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl backdrop-blur-md border border-white/20 shadow-lg">
              <div className="text-xs text-gray-300 font-medium">Live Time</div>
              <div className="text-sm font-bold text-gray-100">{formatElapsedTime(elapsedTime)}</div>
            </div>
            
            <div className="text-center bg-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl backdrop-blur-md border border-white/20 shadow-lg">
              <div className="text-xs text-gray-300 font-medium">Connection</div>
              <div className={`text-xs sm:text-sm font-bold flex items-center space-x-2 ${isConnected ? 'text-emerald-300' : 'text-red-300'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' : 'bg-red-400'}`}></div>
                <span className="hidden sm:inline">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
            
            <div className="text-center bg-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl backdrop-blur-md border border-white/20 shadow-lg">
              <div className="text-xs text-gray-300 font-medium">Participants</div>
              <div className="text-xs sm:text-sm font-bold flex items-center space-x-2 justify-center text-gray-100">
                <Users className="w-3 h-3" />
                <span>{connectedUsers.length}</span>
              </div>
            </div>
            
            {/* Chat Toggle Button */}
            <button
              onClick={() => setShowChatModal(!showChatModal)}
              className="bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-3 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 sm:space-x-2 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl"
              title="Toggle Chat"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline text-sm font-medium">Chat</span>
              {connectedUsers.length > 0 && (
                <span className="bg-emerald-400 text-emerald-900 text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  {connectedUsers.length}
                </span>
              )}
            </button>
            
            {/* AI Doubt Solver Button for All Users */}
            <button
              onClick={() => setIsAIDoubtVisible(!isAIDoubtVisible)}
              className="bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-3 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 sm:space-x-2 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl"
              title="AI Doubt Solver"
            >
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline text-sm font-medium">AI Help</span>
            </button>
            
            {/* Simple Audio Client - Working Implementation */}
            <SimpleAudioClient 
              roomId={roomId as string}
              isTeacher={isTeacher}
            />
            
            {/* PDF Viewer Button */}
            <button
              onClick={() => setShowPDFViewer(!showPDFViewer)}
              className="bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-3 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 sm:space-x-2 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl"
              title={isTeacher ? "Open PDF Viewer & Upload Documents" : "Open PDF Viewer"}
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline text-sm font-medium">
                {isTeacher ? 'PDF' : 'Documents'}
              </span>
              {currentPDFName && (
                <span className="bg-green-400 text-green-900 text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  ✓
                </span>
              )}
            </button>
            
            {/* Compression Stats Button for All Users */}
            <button
              onClick={() => setShowCompressionStats(!showCompressionStats)}
              className="bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-3 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 sm:space-x-2 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl"
              title="Compression & Network Stats"
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline text-sm font-medium">Stats</span>
              <span className="bg-emerald-400 text-emerald-900 text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                {compressionStats.compressionRatio > 0 ? 
                  `${compressionStats.compressionRatio.toFixed(1)}x` : 
                  '0x'
                }
              </span>
            </button>
            
            {isTeacher && (
              <button
                onClick={handleEndClass}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg hover:shadow-xl border border-red-400/30"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">End Class</span>
              </button>
            )}
          </div>
        </div>
      </div>

  <div className="flex-1 flex overflow-visible">
        {/* Left Sidebar */}
        <div className={`${showSidebar ? 'w-80 sm:w-96' : 'w-0'} transition-all duration-500 ease-in-out overflow-hidden border-r border-gray-200 bg-gradient-to-b from-white to-gray-50 flex flex-col shadow-lg`}>
          <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800">AI Assistant & Tools</h3>
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-2 rounded-xl hover:bg-white transition-all duration-200 transform hover:scale-105 shadow-sm"
              title="Close Sidebar"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          
          {/* Sidebar Content */}
          <div className="flex-1 flex flex-col overflow-visible">
            {/* Hand Raise Button for Students */}
            {!isTeacher && (
              <div className="p-4 border-b">
                <button
                  onClick={toggleHandRaise}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-start space-x-2 ${
                    handRaised 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <span className="text-lg">✋</span>
                  <span>{handRaised ? 'Lower Hand' : 'Raise Hand'}</span>
                </button>
              </div>
            )}

            {/* Participants List */}
            <div className="p-4 border-b">
              <h4 className="font-medium text-gray-700 mb-3 flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Participants ({connectedUsers.length})</span>
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {connectedUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full bg-green-400`}></div>
                    <span className="flex-1 truncate">{user.name}</span>
                    <span className="text-xs text-gray-500">{user.role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Paper Style Indicator for Students */}
            {!isTeacher && (
              <div className="p-4 border-b">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center space-x-2">
                  <span className="text-lg">
                    {paperType === 'notebook' && '📝'}
                    {paperType === 'graph' && '⊞'}
                    {paperType === 'legal' && '📄'}
                    {paperType === 'plain' && '⬜'}
                  </span>
                  <span>Paper Style</span>
                </h4>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center justify-between mb-1">
                    <span>Type:</span>
                    <span className="font-medium capitalize">{paperType}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span>Texture:</span>
                    <span className="font-medium">{paperTexture ? 'On' : 'Off'}</span>
                  </div>
                  {showGrid && (
                    <div className="flex items-center justify-between">
                      <span>Grid:</span>
                      <span className="font-medium capitalize">{gridType}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main whiteboard area */}
        <div className="flex-1 flex flex-col relative">
          
          {/* Floating toolbar toggle - only for teachers, positioned in canvas corner */}
          {isTeacher && (
            <button
              onClick={() => setShowToolbar(!showToolbar)}
              className={`absolute top-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-200 ${
                showToolbar 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              title={showToolbar ? 'Hide Toolbar' : 'Show Toolbar'}
            >
              {showToolbar ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}
          
          {/* Toolbar */}
          {isTeacher && showToolbar && (
            <div className="absolute top-4 left-4 right-20 z-40 p-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200"
                 style={{ 
                   right: showSidebar ? '24rem' : '5rem'  // Adjust based on sidebar state
                 }}>
              <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto scrollbar-thin scrollbar-hide sm:scrollbar-thin pb-1">
                {/* Tools */}
                <div className="flex items-center space-x-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1.5 shadow-sm border border-gray-200">
                  <button
                    onClick={() => setTool('select')}
                    className={`p-2 sm:p-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                      tool === 'select' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                        : 'hover:bg-white hover:shadow-md'
                    }`}
                    title="Select"
                  >
                    <Move className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('hand')}
                    className={`p-2 sm:p-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                      tool === 'hand' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                        : 'hover:bg-white hover:shadow-md'
                    }`}
                    title="Pan"
                  >
                    <Hand className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1.5 shadow-sm border border-gray-200">
                  <button
                    onClick={() => setTool('pen')}
                    className={`p-2 sm:p-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                      tool === 'pen' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                        : 'hover:bg-white hover:shadow-md'
                    }`}
                    title="Pen"
                  >
                    <PenTool className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('highlighter')}
                    className={`p-2 sm:p-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                      tool === 'highlighter' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                        : 'hover:bg-white hover:shadow-md'
                    }`}
                    title="Highlighter"
                  >
                    <Highlighter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('eraser')}
                    className={`p-2 sm:p-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                      tool === 'eraser' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                        : 'hover:bg-white hover:shadow-md'
                    }`}
                    title="Eraser"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                </div>

                {/* Shapes Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowShapeDropdown(!showShapeDropdown)}
                    className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg border ${
                      shapeGroups.some(group => group.tools.some(t => t.tool === tool)) 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/30 border-indigo-400/50' 
                        : 'bg-white/90 hover:bg-white hover:shadow-xl border-gray-200/50 text-gray-700'
                    }`}
                    title="Shapes"
                  >
                    {(() => {
                      const currentShape = getCurrentShapeInfo(tool)
                      const IconComponent = currentShape.icon
                      return (
                        <>
                          {IconComponent ? <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" /> : (
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 ${
                              tool === 'filled-rectangle' ? 'bg-current rounded-sm' :
                              tool === 'filled-circle' ? 'bg-current rounded-full' :
                              tool === 'filled-triangle' ? 'w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-current' :
                              tool === 'filled-diamond' ? 'bg-current transform rotate-45' :
                              tool === 'diamond' ? 'border-2 border-current transform rotate-45' :
                              tool === 'filled-ellipse' ? 'bg-current rounded-full h-2.5 sm:h-3' :
                              tool === 'ellipse' ? 'border-2 border-current rounded-full h-2.5 sm:h-3' :
                              'bg-current rounded-sm'
                            }`}></div>
                          )}
                          <span className="hidden sm:inline text-sm font-medium">{currentShape.name}</span>
                          <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 ${showShapeDropdown ? 'rotate-180' : ''}`} />
                        </>
                      )
                    })()}
                  </button>
                  
                  {showShapeDropdown && (
                    <div 
                      className="fixed inset-0 z-[1000] bg-black/20 backdrop-blur-sm" 
                      onClick={() => setShowShapeDropdown(false)}
                    >
                      <div 
                        className="absolute bg-white backdrop-blur-xl border-2 border-gray-300 rounded-3xl shadow-2xl w-[90vw] max-w-[380px] max-h-[85vh] overflow-hidden z-[1100] modal-animate"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 12px 25px -8px rgba(0, 0, 0, 0.3)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-4 sm:p-5 border-b border-gray-100">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center space-x-2">
                            <Square className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
                            <span>Shape Tools</span>
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">Choose a shape to draw</p>
                        </div>
                        
                        <div className="overflow-y-auto max-h-[65vh] custom-scrollbar">
                          {shapeGroups.map((group, groupIndex) => (
                            <div key={group.name} className={groupIndex > 0 ? 'border-t border-gray-100' : ''}>
                              <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100">
                                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                  {group.name}
                                </h4>
                              </div>
                              <div className="p-2 sm:p-3 space-y-1">
                                {group.tools.map((shapeItem) => {
                                  const IconComponent = shapeItem.icon
                                  return (
                                    <button
                                      key={shapeItem.tool}
                                      onClick={() => {
                                        setTool(shapeItem.tool)
                                        setShowShapeDropdown(false)
                                      }}
                                      className={`w-full flex items-center space-x-3 p-3 sm:p-4 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation ${
                                        tool === shapeItem.tool 
                                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30' 
                                          : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-md text-gray-700'
                                      }`}
                                      title={shapeItem.name}
                                    >
                                      {IconComponent ? (
                                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                                      ) : (
                                        <div className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 ${
                                          shapeItem.tool === 'filled-rectangle' ? 'bg-current rounded-sm' :
                                          shapeItem.tool === 'filled-circle' ? 'bg-current rounded-full' :
                                          shapeItem.tool === 'filled-triangle' ? 'w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-current' :
                                          shapeItem.tool === 'filled-diamond' ? 'bg-current transform rotate-45' :
                                          shapeItem.tool === 'diamond' ? 'border-2 border-current transform rotate-45' :
                                          shapeItem.tool === 'filled-ellipse' ? 'bg-current rounded-full h-3 sm:h-4' :
                                          shapeItem.tool === 'ellipse' ? 'border-2 border-current rounded-full h-3 sm:h-4' :
                                          'bg-current rounded-sm'
                                        }`}></div>
                                      )}
                                      <span className="text-sm sm:text-base font-medium">{shapeItem.name}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                          
                          <div className="border-t border-gray-100">
                            <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100">
                              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Media
                              </h4>
                            </div>
                            <div className="p-2 sm:p-3">
                              <button
                                onClick={() => {
                                  setTool('image')
                                  setShowShapeDropdown(false)
                                  fileInputRef.current?.click()
                                }}
                                className={`w-full flex items-center space-x-3 p-3 sm:p-4 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation ${
                                  tool === 'image' 
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30' 
                                    : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-md text-gray-700'
                                }`}
                                title="Add Image"
                              >
                                <ImagePlus className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                                <span className="text-sm sm:text-base font-medium">Add Image</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Text Tool */}
                <div className="flex items-center space-x-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1.5 shadow-sm border border-gray-200">
                  <button
                    onClick={() => setTool('text')}
                    className={`p-2 sm:p-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                      tool === 'text' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                        : 'hover:bg-white hover:shadow-md'
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
                    className="flex items-center space-x-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg border bg-white/90 hover:bg-white hover:shadow-xl border-gray-200/50 text-gray-700"
                    title="Color Palette"
                  >
                    <div 
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-xl border-2 border-white shadow-lg"
                      style={{ backgroundColor: strokeColor }}
                    ></div>
                    <Palette className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline text-sm font-medium">Color</span>
                    <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 ${showColorPalette ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showColorPalette && (
                    <div 
                      className="fixed inset-0 z-modal bg-black/20 backdrop-blur-sm" 
                      onClick={() => setShowColorPalette(false)}
                    >
                      <div 
                        className="absolute bg-white backdrop-blur-xl border-2 border-gray-300 rounded-3xl shadow-2xl w-[90vw] max-w-[420px] max-h-[85vh] overflow-hidden z-modal-content modal-animate"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 12px 25px -8px rgba(0, 0, 0, 0.3)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-4 sm:p-5 border-b border-gray-100">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center space-x-2">
                            <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
                            <span>Color Palette</span>
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">Choose a color for drawing</p>
                        </div>
                        
                        <div className="p-4 sm:p-6">
                          <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                            {colors.map(color => (
                              <button
                                key={color}
                                className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl border-3 transition-all duration-300 transform hover:scale-110 active:scale-95 touch-manipulation ${
                                  strokeColor === color 
                                    ? 'border-indigo-500 shadow-2xl shadow-indigo-500/50 scale-110 ring-4 ring-indigo-200' 
                                    : 'border-gray-200 hover:border-gray-400 hover:shadow-lg'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                  setStrokeColor(color)
                                  setShowColorPalette(false)
                                }}
                                title={`Select ${color}`}
                              />
                            ))}
                          </div>
                          
                          <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Selection</h4>
                            <div className="flex items-center space-x-3 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
                              <div 
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 border-white shadow-lg"
                                style={{ backgroundColor: strokeColor }}
                              ></div>
                              <div>
                                <p className="text-sm sm:text-base font-medium text-gray-800">{strokeColor.toUpperCase()}</p>
                                <p className="text-xs sm:text-sm text-gray-500">Active Color</p>
                              </div>
                            </div>
                          </div>
                        </div>
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

                {/* Slide Controls */}
                <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => navigateToSlide(currentSlideIndex - 1)}
                    disabled={currentSlideIndex === 0}
                    className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous Slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    <Presentation className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">
                      {currentSlideIndex + 1} / {slides.length}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => navigateToSlide(currentSlideIndex + 1)}
                    disabled={currentSlideIndex === slides.length - 1}
                    className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next Slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  <div className="w-px h-6 bg-gray-300 mx-1"></div>
                  
                  <button
                    onClick={createNewSlide}
                    className="p-2 rounded-md hover:bg-gray-200 transition-colors"
                    title="New Slide"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={duplicateSlide}
                    className="p-2 rounded-md hover:bg-gray-200 transition-colors"
                    title="Duplicate Slide"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1.5 shadow-sm border border-gray-200">
                  <button
                    onClick={handleUndo}
                    className="p-2 sm:p-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 hover:bg-white hover:shadow-md"
                    title="Undo"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearCanvas}
                    className="p-2 sm:p-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 hover:bg-red-50 hover:shadow-md hover:text-red-600"
                    title="Clear All"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  {/* Grid Controls */}
                  <div className="relative grid-options-container">
                    <button
                      onClick={() => {
                        setShowGrid(!showGrid)
                        // Sync grid visibility to all students
                        if (socket && isTeacher) {
                          socket.emit('paperStyleChanged', {
                            sessionId: roomId,
                            paperType,
                            paperTexture,
                            showGrid: !showGrid,
                            gridType,
                            gridSize,
                            snapToGrid
                          })
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setShowGridOptions(!showGridOptions)
                      }}
                      className={`p-2 rounded-md transition-colors ${
                        showGrid ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                      }`}
                      title={showGrid ? "Hide Grid (Right-click for options)" : "Show Grid (Right-click for options)"}
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </button>
                    
                    {/* Grid Options Dropdown */}
                    {showGridOptions && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-[1100] min-w-56">
                        <div className="text-sm font-medium mb-3">Whiteboard Settings</div>
                        
                        {/* Paper Type */}
                        <div className="mb-3">
                          <label className="text-xs text-gray-600 mb-2 block">Paper Style</label>
                          <div className="grid grid-cols-2 gap-1">
                            {[
                              { type: 'notebook', label: 'Notebook', icon: '📝' },
                              { type: 'graph', label: 'Graph', icon: '⊞' },
                              { type: 'legal', label: 'Legal Pad', icon: '📄' },
                              { type: 'plain', label: 'Plain', icon: '⬜' }
                            ].map(({ type, label, icon }) => (
                              <button
                                key={type}
                                onClick={() => {
                                  setPaperType(type as any)
                                  // Sync paper style to all students
                                  if (socket && isTeacher) {
                                    socket.emit('paperStyleChanged', {
                                      sessionId: roomId,
                                      paperType: type,
                                      paperTexture,
                                      showGrid,
                                      gridType,
                                      gridSize,
                                      snapToGrid
                                    })
                                  }
                                }}
                                className={`px-2 py-1 text-xs rounded flex items-center space-x-1 ${
                                  paperType === type ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                              >
                                <span>{icon}</span>
                                <span>{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Paper Texture */}
                        <div className="mb-3">
                          <label className="flex items-center space-x-2 text-xs">
                            <input
                              type="checkbox"
                              checked={paperTexture}
                              onChange={(e) => {
                                setPaperTexture(e.target.checked)
                                // Sync paper texture to all students
                                if (socket && isTeacher) {
                                  socket.emit('paperStyleChanged', {
                                    sessionId: roomId,
                                    paperType,
                                    paperTexture: e.target.checked,
                                    showGrid,
                                    gridType,
                                    gridSize,
                                    snapToGrid
                                  })
                                }
                              }}
                              className="rounded"
                            />
                            <span>Paper Texture</span>
                          </label>
                        </div>
                        
                        {/* Grid Type - only show for plain and custom */}
                        {(paperType === 'plain' || paperType === 'graph') && (
                          <div className="mb-3">
                            <label className="text-xs text-gray-600 mb-1 block">Grid Type</label>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setGridType('lines')
                                  // Sync grid settings to all students
                                  if (socket && isTeacher) {
                                    socket.emit('paperStyleChanged', {
                                      sessionId: roomId,
                                      paperType,
                                      paperTexture,
                                      showGrid,
                                      gridType: 'lines',
                                      gridSize,
                                      snapToGrid
                                    })
                                  }
                                }}
                                className={`px-2 py-1 text-xs rounded ${
                                  gridType === 'lines' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                                }`}
                              >
                                Lines
                              </button>
                              <button
                                onClick={() => {
                                  setGridType('dots')
                                  // Sync grid settings to all students
                                  if (socket && isTeacher) {
                                    socket.emit('paperStyleChanged', {
                                      sessionId: roomId,
                                      paperType,
                                      paperTexture,
                                      showGrid,
                                      gridType: 'dots',
                                      gridSize,
                                      snapToGrid
                                    })
                                  }
                                }}
                                className={`px-2 py-1 text-xs rounded ${
                                  gridType === 'dots' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                                }`}
                              >
                                Dots
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Grid Size - only for graph and plain */}
                        {(paperType === 'plain' || paperType === 'graph') && (
                          <div className="mb-3">
                            <label className="text-xs text-gray-600 mb-1 block">Size: {gridSize}px</label>
                            <input
                              type="range"
                              min="10"
                              max="50"
                              value={gridSize}
                              onChange={(e) => {
                                const newGridSize = Number(e.target.value)
                                setGridSize(newGridSize)
                                // Sync grid size to all students
                                if (socket && isTeacher) {
                                  socket.emit('paperStyleChanged', {
                                    sessionId: roomId,
                                    paperType,
                                    paperTexture,
                                    showGrid,
                                    gridType,
                                    gridSize: newGridSize,
                                    snapToGrid
                                  })
                                }
                              }}
                              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                              <span>Fine</span>
                              <span>Coarse</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Snap to Grid */}
                        <div className="mb-3">
                          <label className="flex items-center space-x-2 text-xs">
                            <input
                              type="checkbox"
                              checked={snapToGrid}
                              onChange={(e) => {
                                setSnapToGrid(e.target.checked)
                                // Sync snap to grid setting to all students
                                if (socket && isTeacher) {
                                  socket.emit('paperStyleChanged', {
                                    sessionId: roomId,
                                    paperType,
                                    paperTexture,
                                    showGrid,
                                    gridType,
                                    gridSize,
                                    snapToGrid: e.target.checked
                                  })
                                }
                              }}
                              className="rounded"
                            />
                            <span>Snap to Grid</span>
                          </label>
                        </div>
                        
                        <button
                          onClick={() => setShowGridOptions(false)}
                          className="w-full px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Canvas */}
          <div className={`flex-1 relative bg-gradient-to-br from-gray-100 to-gray-200 p-2 sm:p-3 md:p-4 overflow-visible transition-all duration-300 ${
            showSidebar ? '' : 'md:p-6 lg:p-8'  // More padding when sidebar is closed for better visual balance
          }`}>
            {/* Paper-like container with enhanced shadow and edge effects */}
            <div className="relative bg-white rounded-2xl border border-gray-300 shadow-2xl mx-auto" 
                 style={{
                   // Maintain unified aspect ratio centered within available space
                   width: '100%',
                   height: '100%',
                   maxWidth: '100%',
                   maxHeight: '100%',
                   aspectRatio: boardAspect,
                   // When container is constrained by height, aspectRatio ensures width adjusts and centers
                   
                   boxShadow: paperTexture ? 
                     '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 12px 25px -8px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.05)' :
                     '0 20px 40px -8px rgba(0, 0, 0, 0.15), 0 8px 16px -4px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -1px 2px rgba(0, 0, 0, 0.03)',
                   background: paperTexture ? 
                     `linear-gradient(135deg, #fefefe 0%, #fafafa 100%)` :
                     '#fefefe',
                   position: 'relative'
                 }}>
              
              {/* Paper aging/wear effect with subtle gradients */}
              {paperTexture && (
                <>
                  <div 
                    className="absolute inset-0 rounded-sm"
                    style={{
                      background: 'radial-gradient(ellipse at 20% 30%, rgba(139, 69, 19, 0.02) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(139, 69, 19, 0.015) 0%, transparent 50%)',
                      pointerEvents: 'none'
                    }}
                  />
                  {/* Subtle corner wear */}
                  <div 
                    className="absolute top-0 right-0 w-8 h-8 rounded-sm"
                    style={{
                      background: 'radial-gradient(circle at top right, rgba(139, 69, 19, 0.03) 0%, transparent 70%)',
                      pointerEvents: 'none'
                    }}
                  />
                </>
              )}
              
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full rounded-2xl select-none z-0"
                style={{ 
                  touchAction: 'none',
                  cursor: cursorType,
                  background: getPaperBackground(),
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onContextMenu={(e) => e.preventDefault()}
              />
              
              {/* Paper holes for notebook style */}
              {paperType === 'notebook' && (
                <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-around py-6">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border-2 border-gray-300 bg-gray-50"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)'
                      }}
                    />
                  ))}
                </div>
              )}
              
              {/* Legal pad binding for legal style */}
              {paperType === 'legal' && (
                <div 
                  className="absolute top-0 left-0 w-full h-3 border-b border-yellow-300"
                  style={{
                    background: 'linear-gradient(180deg, #fff9e6 0%, #fff3cc 100%)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              )}
              
              {/* Hidden file input for image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>
          
          {/* Student Slide Indicator */}
          {!isTeacher && (
            <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border p-3 flex items-center space-x-2">
              <Presentation className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">
                Slide {currentSlideIndex + 1} of {slides.length}
              </span>
            </div>
          )}
        </div>
        {/* End canvas container */}
        
        {/* Left Sidebar toggle button */}
        {!showSidebar && (
          <button
            onClick={() => setShowSidebar(true)}
            className="absolute top-1/2 left-0 transform -translate-y-1/2 bg-blue-500 text-white p-2 rounded-r-lg shadow-lg hover:bg-blue-600 transition-colors z-50"
          >
            <ChevronRight className="w-4 h-4" />
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
      
      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md h-[85vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Chat Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white p-4 sm:p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Class Chat</h3>
                  <span className="text-blue-100 text-sm">({connectedUsers.length} online)</span>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 transform hover:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Connected Users List */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-3 sm:p-4">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <span className="font-medium">Online:</span>
                <div className="flex flex-wrap gap-1.5">
                  {connectedUsers.slice(0, 5).map(user => (
                    <span 
                      key={user.id}
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.isTeacher 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {user.name}
                    </span>
                  ))}
                  {connectedUsers.length > 5 && (
                    <span className="text-gray-500">+{connectedUsers.length - 5} more</span>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
              <RealtimeChat
                socket={socket}
                currentUserId={userId || ''}
                currentUserName={userName || ''}
                isTeacher={isTeacher}
                connectedUsers={connectedUsers}
                isVisible={true}
                onToggleVisibility={() => {}}
                messages={chatMessages}
                setMessages={setChatMessages}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Fullscreen Prompt */}
      {showFullscreenPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md mx-4">
            <div className="text-center">
              <Monitor className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Better Whiteboard Experience
              </h3>
              <p className="text-gray-600 mb-6">
                For the best experience, we recommend using fullscreen mode while using the whiteboard.
              </p>
              <div className="space-y-3">
                <button
                  onClick={requestFullscreen}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Maximize2 className="w-5 h-5" />
                  <span>Enter Fullscreen</span>
                </button>
                <button
                  onClick={() => setShowFullscreenPrompt(false)}
                  className="w-full text-gray-600 hover:text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Continue without fullscreen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Doubt Solver Modal */}
      {isAIDoubtVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col m-4">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="w-6 h-6" />
                <h3 className="text-lg font-semibold">AI Doubt Solver</h3>
                <span className="text-purple-200 text-sm">
                  {isTeacher ? 'AI Assistant for Teaching' : 'Ask questions about the whiteboard'}
                </span>
              </div>
              <button
                onClick={() => setIsAIDoubtVisible(false)}
                className="text-white hover:text-purple-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              <AIDoubtSolver
                isVisible={true}
                onToggleVisibility={() => setIsAIDoubtVisible(false)}
                canvasRef={canvasRef}
                isStudent={!isTeacher}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Note: Now using SimpleAudioClient in header - no hidden components needed */}
      
      {/* Compression Stats Modal */}
      {showCompressionStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl m-4">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-6 h-6" />
                <h3 className="text-lg font-semibold">Real-time Compression & Network Stats</h3>
                <span className="text-green-200 text-sm">
                  {isTeacher ? 'Teacher Compression Analytics' : 'Student Decompression Analytics'}
                </span>
              </div>
              <button
                onClick={() => setShowCompressionStats(false)}
                className="text-white hover:text-green-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Overview Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">Compression Ratio</h4>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {compressionStats.compressionRatio > 0 ? 
                      `${compressionStats.compressionRatio.toFixed(1)}:1` : 
                      'N/A'
                    }
                  </div>
                  <div className={`text-sm px-2 py-1 rounded-full inline-block mt-2 ${getCompressionEfficiency().bgColor} ${getCompressionEfficiency().color}`}>
                    {getCompressionEfficiency().label}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-800 dark:text-green-200">Data Saved</h4>
                  </div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {compressionStats.originalSize > compressionStats.compressedSize ? 
                      formatBytes(compressionStats.originalSize - compressionStats.compressedSize) :
                      '0 B'
                    }
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    Bandwidth saved
                  </div>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                    <Gauge className="w-5 h-5 mr-2" />
                    Data Transfer Statistics
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Original Size</div>
                      <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {formatBytes(compressionStats.originalSize)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Compressed Size</div>
                      <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {formatBytes(compressionStats.compressedSize)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Packets/Second</div>
                      <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {compressionStats.packetsPerSecond.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Efficiency</div>
                      <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {compressionStats.originalSize > 0 ? 
                          `${(100 - (compressionStats.compressedSize / compressionStats.originalSize * 100)).toFixed(1)}%` :
                          '0%'
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role-specific Information */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900 dark:to-purple-900 p-4 rounded-lg">
                  <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                    {isTeacher ? '👨‍🏫 Teacher Mode' : '👨‍🎓 Student Mode'}
                  </h4>
                  <div className="text-sm text-indigo-700 dark:text-indigo-300">
                    {isTeacher ? (
                      <>
                        <p className="mb-2">• Your drawing data is being compressed in real-time before sending to students</p>
                        <p className="mb-2">• Higher compression ratios mean better performance for students</p>
                        <p>• Ideal ratio: 5:1 or higher for smooth real-time collaboration</p>
                      </>
                    ) : (
                      <>
                        <p className="mb-2">• You're receiving compressed drawing data from the teacher</p>
                        <p className="mb-2">• Data is automatically decompressed for smooth whiteboard experience</p>
                        <p>• Better compression = faster loading and smoother drawing sync</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Connection Quality Indicator */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      Connection Status: {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Network: {bandwidthMode.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowCompressionStats(false)}
                  className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors hover:from-green-600 hover:to-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* PDF Viewer Sidebar */}
      <PDFViewer
        isOpen={showPDFViewer}
        onClose={() => setShowPDFViewer(false)}
        isTeacher={isTeacher}
        roomId={roomId as string}
        socket={socket}
        pdfUrl={currentPDFUrl}
        onPdfUpload={handlePDFUpload}
      />
    </div>
  )
}

export default FullWhiteBoard
