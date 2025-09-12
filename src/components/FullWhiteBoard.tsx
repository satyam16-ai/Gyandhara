'use client'

import React from 'react'
import { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import rough from 'roughjs'
import { useWhiteboard } from '../contexts/WhiteboardContext'
import { CompressedDrawingData } from '../utils/compression'
import RealtimeChat from './RealtimeChat'
import AIDoubtSolver from './AIDoubtSolver'
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
  Volume2,
  VolumeX,
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
  Notebook
} from 'lucide-react'

interface DrawingElement {
  id: string
  type: 'freehand' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'highlight' | 'triangle' | 'image'
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

type Tool = 'select' | 'pen' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'highlighter' | 'eraser' | 'triangle' | 'hand' | 'image'

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
  
  // Image handling
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<DrawingElement | null>(null)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [isResizingImage, setIsResizingImage] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string>('')
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  const [initialImageState, setInitialImageState] = useState<{x: number, y: number, width: number, height: number} | null>(null)
  const [cursorType, setCursorType] = useState<string>('default')
  
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
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Chat and sidebar state
  const [showSidebar, setShowSidebar] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  
  // AI Doubt Solver state
  const [isAIDoubtVisible, setIsAIDoubtVisible] = useState(false)
  
  // Slide system state
  const [slides, setSlides] = useState<Array<{id: string, elements: DrawingElement[], title: string}>>([
    { id: 'slide-1', elements: [], title: 'Slide 1' }
  ])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true)
  
  // Timer state
  const [classStartTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)

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

  // Redraw canvas
  useEffect(() => {
    redrawCanvas()
  }, [drawingElements, currentDrawingElement, zoom, panOffset])

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedImage && isTeacher) {
          // Delete selected image
          setDrawingElements(prev => prev.filter(el => el.id !== selectedImage.id))
          setSelectedImage(null)
          
          // Send deletion to other users
          if (socket) {
            socket.emit('drawing', {
              action: 'delete',
              elementId: selectedImage.id
            })
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
        // Force canvas resize to match teacher dimensions
        const canvas = canvasRef.current
        if (canvas && canvas.parentElement) {
          const container = canvas.parentElement
          const currentRect = container.getBoundingClientRect()
          
          // If dimensions are significantly different, log for debugging
          if (Math.abs(currentRect.width - dimensionData.width) > 10 || 
              Math.abs(currentRect.height - dimensionData.height) > 10) {
            console.log('📐 Canvas size mismatch detected:', {
              student: { width: currentRect.width, height: currentRect.height },
              teacher: { width: dimensionData.width, height: dimensionData.height }
            })
          }
        }
      }
    }

    socket.on('paperStyleChanged', handlePaperStyleChanged)
    socket.on('canvasDimensionsChanged', handleCanvasDimensionsChanged)
    
    return () => {
      socket.off('paperStyleChanged', handlePaperStyleChanged)
      socket.off('canvasDimensionsChanged', handleCanvasDimensionsChanged)
    }
  }, [socket, isTeacher, roomId])

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
      
      // Send to other users
      if (socket) {
        socket.emit('drawing', {
          element: imageElement
        })
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
    const x = (event.clientX - rect.left - panOffset.x) / zoom
    const y = (event.clientY - rect.top - panOffset.y) / zoom

    const updatedImage = {
      ...selectedImage,
      x: x - (selectedImage.width || 100) / 2,
      y: y - (selectedImage.height || 75) / 2
    }

    setDrawingElements(prev => 
      prev.map(el => el.id === selectedImage.id ? updatedImage : el)
    )
    setSelectedImage(updatedImage)

    // Send update to other users
    if (socket) {
      socket.emit('drawing', {
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
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Canvas now uses transparent background to show CSS grid
    // ctx.fillStyle = '#ffffff'
    // ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(panOffset.x, panOffset.y)

    // Canvas now has CSS grid background, no need to draw grid

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

      // Send update to other users
      if (socket) {
        socket.emit('drawing', {
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
      if (socket) {
        socket.emit('drawing', {
          element: updatedImage
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
            
            {/* Chat Toggle Button */}
            <button
              onClick={() => setShowChatModal(!showChatModal)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              title="Toggle Chat"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat</span>
              {connectedUsers.length > 0 && (
                <span className="bg-blue-300 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {connectedUsers.length}
                </span>
              )}
            </button>
            
            {/* AI Doubt Solver Button for All Users */}
            <button
              onClick={() => setIsAIDoubtVisible(!isAIDoubtVisible)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              title="AI Doubt Solver"
            >
              <Bot className="w-4 h-4" />
              <span>AI Help</span>
            </button>
            
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
        {/* Left Sidebar */}
        <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r bg-white flex flex-col`}>
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">AI Assistant & Tools</h3>
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1 rounded-md hover:bg-gray-200 transition-colors"
              title="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Sidebar Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
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
                  <button
                    onClick={() => {
                      setTool('image')
                      fileInputRef.current?.click()
                    }}
                    className={`p-2 rounded-md transition-colors ${
                      tool === 'image' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    title="Add Image"
                  >
                    <ImagePlus className="w-4 h-4" />
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
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-50 min-w-56">
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
                                onClick={() => setGridType('lines')}
                                className={`px-2 py-1 text-xs rounded ${
                                  gridType === 'lines' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                                }`}
                              >
                                Lines
                              </button>
                              <button
                                onClick={() => setGridType('dots')}
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
                              onChange={(e) => setGridSize(Number(e.target.value))}
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
                              onChange={(e) => setSnapToGrid(e.target.checked)}
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
          <div className="flex-1 relative bg-gray-100 p-4">
            {/* Paper-like container with enhanced shadow and edge effects */}
            <div className="w-full h-full relative bg-white rounded-sm border border-gray-200" 
                 style={{
                   boxShadow: paperTexture ? 
                     '0 8px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 10px -3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)' :
                     '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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
                className="absolute inset-0 w-full h-full rounded-sm"
                style={{ 
                  touchAction: 'none',
                  cursor: cursorType,
                  background: getPaperBackground()
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-96 h-[80vh] flex flex-col">
            {/* Chat Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-semibold">Class Chat</h3>
                <span className="text-blue-200 text-sm">({connectedUsers.length} online)</span>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-white hover:text-blue-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Connected Users List */}
            <div className="bg-gray-50 border-b border-gray-200 p-2">
              <div className="flex items-center space-x-1 text-xs text-gray-600">
                <Users className="w-3 h-3" />
                <span>Online:</span>
                <div className="flex flex-wrap gap-1">
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
    </div>
  )
}

export default FullWhiteBoard
