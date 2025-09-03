'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import rough from 'roughjs'
import { useWhiteboard } from '@/contexts/WhiteboardContext'
import { CompressedDrawingData } from '@/utils/compression'
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
  Maximize
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

interface WhiteBoardProps {
  isTeacher: boolean
  bandwidthMode: 'ultra-low' | 'low' | 'normal'
  roomId?: string
  classId?: string
}

type Tool = 'select' | 'pen' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'highlighter' | 'eraser' | 'triangle' | 'hand'

const colors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
  '#800000', '#000080', '#808080', '#C0C0C0', '#FFFFFF'
]

const WhiteBoard: React.FC<WhiteBoardProps> = ({
  isTeacher,
  bandwidthMode,
  roomId,
  classId
}) => {
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
    clearElements
  } = useWhiteboard()

  // Add missing functions
  const sendElementErase = (elementId: string) => {
    // Send erase command via the existing sendDrawingUpdate function
    sendDrawingUpdate('erase', undefined, elementId)
  }

  const findElementAtPosition = (x: number, y: number): DrawingElement | null => {
    // Check elements in reverse order (top to bottom)
    for (let i = drawingElements.length - 1; i >= 0; i--) {
      const element = drawingElements[i]
      
      if (element.type === 'freehand' || element.type === 'highlight') {
        // Check if point is near any point in the path
        for (let j = 0; j < element.points.length - 2; j += 2) {
          const px = element.points[j]
          const py = element.points[j + 1]
          const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
          if (distance <= (element.options.strokeWidth + 5)) {
            return element
          }
        }
      } else if (element.x !== undefined && element.y !== undefined) {
        // Check rectangular bounds for shapes
        const right = element.x + (element.width || 0)
        const bottom = element.y + (element.height || 0)
        
        if (x >= element.x && x <= right && y >= element.y && y <= bottom) {
          return element
        }
      } else if (element.points.length >= 4) {
        // Check line/arrow elements
        const [x1, y1, x2, y2] = element.points
        const distance = distanceToLine(x, y, x1, y1, x2, y2)
        if (distance <= (element.options.strokeWidth + 5)) {
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

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const roughCanvasRef = useRef<any>(null)
  const isDrawingRef = useRef(false)
  const currentPathRef = useRef<number[]>([])
  const currentElementIdRef = useRef<string>('')
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
  const [showFullscreenSuggestion, setShowFullscreenSuggestion] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showCompressionStats, setShowCompressionStats] = useState(false)

  // Initialize rough canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    roughCanvasRef.current = rough.canvas(canvas)
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    
    redrawCanvas()
  }, [])

  // Redraw all elements when they change
  useEffect(() => {
    redrawCanvas()
  }, [drawingElements, currentDrawingElement])

  // Redraw all elements
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const roughCanvas = roughCanvasRef.current
    if (!canvas || !roughCanvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear and set background
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Apply zoom and pan
    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(panOffset.x, panOffset.y)

    // Draw grid for teaching assistance
    if (isTeacher) {
      drawGrid(ctx)
    }

    // Draw all elements
    drawingElements.forEach(element => {
      try {
        if (element.type === 'freehand') {
          drawFreehand(roughCanvas, element)
        } else if (element.type === 'rectangle') {
          drawRectangle(roughCanvas, element)
        } else if (element.type === 'circle') {
          drawCircle(roughCanvas, element)
        } else if (element.type === 'triangle') {
          drawTriangle(roughCanvas, element)
        } else if (element.type === 'line') {
          drawLine(roughCanvas, element)
        } else if (element.type === 'arrow') {
          drawArrow(ctx, element)
        } else if (element.type === 'text') {
          drawText(ctx, element)
        } else if (element.type === 'highlight') {
          drawHighlight(ctx, element)
        }
      } catch (error) {
        console.error('Error drawing element:', error)
      }
    })

    // Draw current drawing element (for real-time preview)
    if (currentDrawingElement && isTeacher) {
      try {
        if (currentDrawingElement.type === 'freehand') {
          drawFreehand(roughCanvas, currentDrawingElement)
        } else if (currentDrawingElement.type === 'rectangle') {
          drawRectangle(roughCanvas, currentDrawingElement)
        } else if (currentDrawingElement.type === 'circle') {
          drawCircle(roughCanvas, currentDrawingElement)
        } else if (currentDrawingElement.type === 'triangle') {
          drawTriangle(roughCanvas, currentDrawingElement)
        } else if (currentDrawingElement.type === 'line') {
          drawLine(roughCanvas, currentDrawingElement)
        } else if (currentDrawingElement.type === 'arrow') {
          drawArrow(ctx, currentDrawingElement)
        } else if (currentDrawingElement.type === 'highlight') {
          drawHighlight(ctx, currentDrawingElement)
        }
      } catch (error) {
        console.error('Error drawing current element:', error)
      }
    }

    // Draw teacher cursor for students
    if (!isTeacher && teacherCursor) {
      drawTeacherCursor(ctx, teacherCursor)
    }

    ctx.restore()
  }, [drawingElements, currentDrawingElement, teacherCursor, zoom, panOffset, isTeacher])

  // Drawing functions
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = 20
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 0.5
    
    for (let x = 0; x < ctx.canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, ctx.canvas.height)
      ctx.stroke()
    }
    
    for (let y = 0; y < ctx.canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(ctx.canvas.width, y)
      ctx.stroke()
    }
  }

  const drawTeacherCursor = (ctx: CanvasRenderingContext2D, cursor: any) => {
    const { x, y, tool, isDrawing } = cursor
    
    ctx.save()
    ctx.strokeStyle = '#ff0000'
    ctx.fillStyle = '#ff0000'
    ctx.lineWidth = 2
    
    // Draw cursor circle
    ctx.beginPath()
    ctx.arc(x, y, isDrawing ? 8 : 5, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw tool indicator
    ctx.fillStyle = '#ffffff'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(tool.charAt(0).toUpperCase(), x, y + 3)
    
    ctx.restore()
  }

  const drawFreehand = (roughCanvas: any, element: DrawingElement) => {
    if (element.points.length < 4) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.strokeStyle = element.options.stroke
    ctx.lineWidth = element.options.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // Use smooth curves for better drawing experience
    ctx.beginPath()
    
    if (element.points.length === 2) {
      // Single point - draw a circle
      ctx.arc(element.points[0], element.points[1], element.options.strokeWidth / 2, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    
    // Move to first point
    ctx.moveTo(element.points[0], element.points[1])
    
    if (element.points.length === 4) {
      // Two points - draw a line
      ctx.lineTo(element.points[2], element.points[3])
    } else {
      // Multiple points - draw smooth curves
      for (let i = 2; i < element.points.length - 2; i += 2) {
        const xc = (element.points[i] + element.points[i + 2]) / 2
        const yc = (element.points[i + 1] + element.points[i + 3]) / 2
        ctx.quadraticCurveTo(element.points[i], element.points[i + 1], xc, yc)
      }
      
      // Handle the last segment
      if (element.points.length > 4) {
        const lastIndex = element.points.length - 2
        ctx.quadraticCurveTo(
          element.points[lastIndex - 2], 
          element.points[lastIndex - 1], 
          element.points[lastIndex], 
          element.points[lastIndex + 1]
        )
      }
    }
    
    ctx.stroke()
  }

  const drawRectangle = (roughCanvas: any, element: DrawingElement) => {
    if (!element.x || !element.y || !element.width || !element.height) return
    roughCanvas.rectangle(element.x, element.y, element.width, element.height, element.options)
  }

  const drawCircle = (roughCanvas: any, element: DrawingElement) => {
    if (!element.x || !element.y || !element.width || !element.height) return
    const centerX = element.x + element.width / 2
    const centerY = element.y + element.height / 2
    const radius = Math.min(Math.abs(element.width), Math.abs(element.height)) / 2
    roughCanvas.circle(centerX, centerY, radius * 2, element.options)
  }

  const drawTriangle = (roughCanvas: any, element: DrawingElement) => {
    if (!element.x || !element.y || !element.width || !element.height) return
    const x1 = element.x + element.width / 2
    const y1 = element.y
    const x2 = element.x
    const y2 = element.y + element.height
    const x3 = element.x + element.width
    const y3 = element.y + element.height
    
    roughCanvas.polygon([[x1, y1], [x2, y2], [x3, y3]], element.options)
  }

  const drawLine = (roughCanvas: any, element: DrawingElement) => {
    if (element.points.length >= 4) {
      roughCanvas.line(
        element.points[0], element.points[1],
        element.points[2], element.points[3],
        element.options
      )
    }
  }

  const drawArrow = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (element.points.length < 4) return
    
    const [x1, y1, x2, y2] = element.points
    const headLength = 15
    const angle = Math.atan2(y2 - y1, x2 - x1)
    
    ctx.strokeStyle = element.options.stroke
    ctx.lineWidth = element.options.strokeWidth
    ctx.lineCap = 'round'
    
    // Draw line
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    
    // Draw arrowhead
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
  }

  const drawText = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (!element.text || !element.x || !element.y) return
    
    ctx.font = `${element.options.strokeWidth * 8}px Arial`
    ctx.fillStyle = element.options.stroke
    ctx.textBaseline = 'top'
    ctx.fillText(element.text, element.x, element.y)
  }

  const drawHighlight = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (element.points.length < 4) return
    
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = element.options.stroke
    ctx.lineWidth = element.options.strokeWidth * 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    
    if (element.points.length === 2) {
      // Single point
      ctx.arc(element.points[0], element.points[1], element.options.strokeWidth, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    
    // Move to first point
    ctx.moveTo(element.points[0], element.points[1])
    
    if (element.points.length === 4) {
      // Two points - draw a line
      ctx.lineTo(element.points[2], element.points[3])
    } else {
      // Multiple points - draw smooth curves
      for (let i = 2; i < element.points.length - 2; i += 2) {
        const xc = (element.points[i] + element.points[i + 2]) / 2
        const yc = (element.points[i + 1] + element.points[i + 3]) / 2
        ctx.quadraticCurveTo(element.points[i], element.points[i + 1], xc, yc)
      }
      
      // Handle the last segment
      if (element.points.length > 4) {
        const lastIndex = element.points.length - 2
        ctx.quadraticCurveTo(
          element.points[lastIndex - 2], 
          element.points[lastIndex - 1], 
          element.points[lastIndex], 
          element.points[lastIndex + 1]
        )
      }
    }
    
    ctx.stroke()
    ctx.restore()
  }

  // Event handlers
  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isTeacher || bandwidthMode === 'ultra-low') return
    
    const { x, y } = getMousePos(e)
    isDrawingRef.current = true
    
    // Send cursor position to students
    sendTeacherCursor(x, y, tool, true)
    
    if (tool === 'hand') {
      setIsPanning(true)
      return
    }
    
    if (tool === 'text') {
      setTextPosition({ x, y })
      return
    }
    
    if (tool === 'eraser') {
      // Find element at this position and remove it
      const elementToErase = findElementAtPosition(x, y)
      if (elementToErase) {
        // Remove locally for teacher
        setDrawingElements(prev => prev.filter(el => el.id !== elementToErase.id))
        
        // Send compressed erase command
        sendCompressedDrawing({
          action: 'erase',
          elementId: elementToErase.id,
          x,
          y,
          timestamp: Date.now()
        })
        
        // Legacy support
        sendElementErase(elementToErase.id)
      }
      return
    }
    
    if (tool === 'pen' || tool === 'highlighter') {
      currentPathRef.current = [x, y]
      
      // Send compressed draw start
      const elementId = `${tool}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      currentElementIdRef.current = elementId
      
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
    } else {
      setStartPoint({ x, y })
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const { x, y } = getMousePos(e)
    
    // Always send cursor position if teacher
    if (isTeacher) {
      sendTeacherCursor(x, y, tool, isDrawingRef.current)
    }
    
    if (!isTeacher || !isDrawingRef.current || bandwidthMode === 'ultra-low') return
    
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
      // Continue erasing if dragging
      const elementToErase = findElementAtPosition(x, y)
      if (elementToErase) {
        setDrawingElements(prev => prev.filter(el => el.id !== elementToErase.id))
        
        // Send compressed erase immediately (no throttling)
        sendCompressedDrawing({
          action: 'erase',
          elementId: elementToErase.id,
          x,
          y,
          timestamp: Date.now()
        })
        
        sendElementErase(elementToErase.id)
      }
      return
    }
    
    if (tool === 'pen' || tool === 'highlighter') {
      // NO DISTANCE FILTERING for ultra-smooth drawing
      currentPathRef.current.push(x, y)
      
      // Send EVERY point compressed for real-time smoothness
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
      
      // Create real-time preview element with immediate update
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
      
      // Update current drawing element for local preview
      setCurrentDrawingElement(previewElement)
      
      // Send legacy preview for older clients
      sendDrawingPreview(previewElement, false)
    }
  }

  const handlePointerUp = () => {
    if (!isTeacher || !isDrawingRef.current) return
    
    isDrawingRef.current = false
    setIsPanning(false)
    
    // Send cursor position update
    const { x, y } = getMousePos(event as any)
    sendTeacherCursor(x, y, tool, false)
    
    if (tool === 'pen' || tool === 'highlighter') {
      if (currentPathRef.current.length >= 4) {
        // Send compressed draw end
        sendCompressedDrawing({
          action: 'draw_end',
          tool: tool === 'pen' ? 'pencil' : 'highlighter',
          elementId: currentElementIdRef.current,
          isComplete: true,
          timestamp: Date.now()
        })
        
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
        
        // Add to local state immediately for teacher
        setDrawingElements(prev => [...prev, element])
        
        // Legacy support - Send to server for students
        sendDrawingElement(element)
        
        // Clear preview
        setCurrentDrawingElement(null)
      }
      currentPathRef.current = []
    } else if (startPoint && tool !== 'text' && tool !== 'hand') {
      // Handle shape creation
      const width = x - startPoint.x
      const height = y - startPoint.y
      
      let element: DrawingElement
      
      if (tool === 'line' || tool === 'arrow') {
        element = {
          id: `${tool}-${Date.now()}`,
          type: tool,
          points: [startPoint.x, startPoint.y, x, y],
          options: {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            roughness: roughness,
            fill: fillColor !== 'transparent' ? fillColor : undefined
          },
          timestamp: Date.now()
        }
      } else {
        element = {
          id: `${tool}-${Date.now()}`,
          type: tool as any,
          points: [],
          x: Math.min(startPoint.x, x),
          y: Math.min(startPoint.y, y),
          width: Math.abs(width),
          height: Math.abs(height),
          options: {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            roughness: roughness,
            fill: fillColor !== 'transparent' ? fillColor : undefined,
            fillStyle: 'hachure'
          },
          timestamp: Date.now()
        }
      }
      
      if (Math.abs(width) > 5 || Math.abs(height) > 5) {
        // Add to local state immediately for teacher
        setDrawingElements(prev => [...prev, element])
        
        // Send to server for students
        sendDrawingElement(element)
      }
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
      sendDrawingElement(element)
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

  const undo = () => {
    if (undoStack.length > 0) {
      const prevState = undoStack[undoStack.length - 1]
      setRedoStack(prev => [...prev, drawingElements])
      setUndoStack(prev => prev.slice(0, -1))
      sendDrawingUpdate('bulk-update', prevState)
    }
  }

  const redo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1]
      setUndoStack(prev => [...prev, drawingElements])
      setRedoStack(prev => prev.slice(0, -1))
      sendDrawingUpdate('bulk-update', nextState)
    }
  }

  // Action handlers for enhanced toolbar
  const handleUndo = useCallback(() => {
    if (drawingElements.length > 0) {
      const lastElement = drawingElements[drawingElements.length - 1]
      setDrawingElements(prev => prev.slice(0, -1))
      
      // Send undo action through compression
      sendCompressedDrawing({
        action: 'erase',
        elementId: lastElement.id,
        timestamp: Date.now()
      })
    }
  }, [drawingElements, sendCompressedDrawing])

  const handleClearCanvas = useCallback(() => {
    if (drawingElements.length > 0) {
      setDrawingElements([])
      setCurrentDrawingElement(null)
      
      // Send clear action through compression
      sendCompressedDrawing({
        action: 'clear',
        timestamp: Date.now()
      })
    }
  }, [drawingElements, sendCompressedDrawing])

  const exportDrawing = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const link = document.createElement('a')
    link.download = `whiteboard-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }, [])

  const importDrawing = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = new Image()
          img.onload = () => {
            const canvas = canvasRef.current
            const ctx = canvas?.getContext('2d')
            if (canvas && ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            }
          }
          img.src = event.target?.result as string
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }, [])

  // Fullscreen functionality
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
        setShowFullscreenSuggestion(false)
      }).catch(console.error)
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch(console.error)
    }
  }, [])

  // Check fullscreen status on mount
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Auto-hide fullscreen suggestion after 10 seconds
  useEffect(() => {
    if (showFullscreenSuggestion) {
      const timer = setTimeout(() => {
        setShowFullscreenSuggestion(false)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [showFullscreenSuggestion])

  if (bandwidthMode === 'ultra-low') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-2">📱</div>
          <p className="font-medium">Ultra Low Bandwidth Mode</p>
          <p className="text-sm">Audio-only learning enabled</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ✨ ENHANCED ULTRA-MODERN TOOLBAR ✨ */}
      {isTeacher && (
        <div className="p-4 border-b bg-gradient-to-r from-slate-50 via-blue-50 to-purple-50 overflow-x-auto shadow-sm">
          <div className="flex items-center space-x-3 min-w-max">
            {/* 🎯 Tool Selection Group */}
            <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-white/60 shadow-lg">
              <div className="text-xs font-semibold text-gray-600 px-2">Navigate</div>
              <button
                onClick={() => setTool('select')}
                className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  tool === 'select' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'hover:bg-blue-50 text-gray-600 hover:shadow-md'
                }`}
                title="Select & Move Objects"
              >
                <Move className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('hand')}
                className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  tool === 'hand' 
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25' 
                    : 'hover:bg-emerald-50 text-gray-600 hover:shadow-md'
                }`}
                title="Pan Canvas"
              >
                <Hand className="w-5 h-5" />
              </button>
            </div>

            {/* 🎨 Drawing Tools Group */}
            <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-white/60 shadow-lg">
              <div className="text-xs font-semibold text-gray-600 px-2">Draw</div>
              <button
                onClick={() => setTool('pen')}
                className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 relative ${
                  tool === 'pen' 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'hover:bg-indigo-50 text-gray-600 hover:shadow-md'
                }`}
                title="Ultra-Smooth Pen (Real-time)"
              >
                <PenTool className="w-5 h-5" />
                {tool === 'pen' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>}
              </button>
              <button
                onClick={() => setTool('highlighter')}
                className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  tool === 'highlighter' 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/25' 
                    : 'hover:bg-yellow-50 text-gray-600 hover:shadow-md'
                }`}
                title="Highlighter Tool"
              >
                <Highlighter className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  tool === 'eraser' 
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/25' 
                    : 'hover:bg-red-50 text-gray-600 hover:shadow-md'
                }`}
                title="Eraser Tool"
              >
                <Eraser className="w-5 h-5" />
              </button>
            </div>

            {/* 📐 Shape Tools Group */}
            <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-white/60 shadow-lg">
              <div className="text-xs font-semibold text-gray-600 px-2">Shapes</div>
              <button
                onClick={() => setTool('line')}
                className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  tool === 'line' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
                    : 'hover:bg-cyan-50 text-gray-600 hover:shadow-md'
                }`}
                title="Draw Line"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('arrow')}
                className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  tool === 'arrow' 
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25' 
                    : 'hover:bg-teal-50 text-gray-600 hover:shadow-md'
                }`}
                title="Draw Arrow"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('rectangle')}
                className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  tool === 'rectangle' 
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25' 
                    : 'hover:bg-violet-50 text-gray-600 hover:shadow-md'
                }`}
                title="Draw Rectangle"
              >
                <Square className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('circle')}
                className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  tool === 'circle' 
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25' 
                    : 'hover:bg-pink-50 text-gray-600 hover:shadow-md'
                }`}
                title="Draw Circle"
              >
                <Circle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('triangle')}
                className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  tool === 'triangle' 
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25' 
                    : 'hover:bg-orange-50 text-gray-600 hover:shadow-md'
                }`}
                title="Draw Triangle"
              >
                <Triangle className="w-5 h-5" />
              </button>
            </div>

            {/* ✏️ Text & Special Tools */}
            <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-white/60 shadow-lg">
              <div className="text-xs font-semibold text-gray-600 px-2">Text</div>
              <button
                onClick={() => setTool('text')}
                className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  tool === 'text' 
                    ? 'bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-lg shadow-slate-500/25' 
                    : 'hover:bg-slate-50 text-gray-600 hover:shadow-md'
                }`}
                title="Add Text"
              >
                <Type className="w-5 h-5" />
              </button>
            </div>

            {/* 🎨 Color & Style Tools */}
            <div className="flex items-center space-x-2">
              {/* Enhanced Color Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPalette(!showColorPalette)}
                  className="p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-white/60 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 hover:scale-105 active:scale-95"
                  title="Choose Color"
                >
                  <Palette className="w-5 h-5 text-gray-600" />
                  <div 
                    className="w-6 h-6 rounded-lg border-2 border-white shadow-sm" 
                    style={{ backgroundColor: strokeColor }}
                  ></div>
                </button>
                
                {showColorPalette && (
                  <div className="absolute top-full left-0 mt-2 bg-white/95 backdrop-blur-sm border border-white/60 rounded-xl p-3 shadow-xl z-10 min-w-[200px]">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Quick Colors</div>
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {colors.map(color => (
                        <button
                          key={color}
                          onClick={() => {
                            setStrokeColor(color)
                            setShowColorPalette(false)
                          }}
                          className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-all duration-200 shadow-sm ${
                            strokeColor === color ? 'border-gray-800 shadow-lg' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="text-xs font-semibold text-gray-600 mb-2">Custom Color</div>
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Enhanced Stroke Width */}
              <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white/60 shadow-lg">
                <div className="text-xs font-semibold text-gray-600">Size</div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="text-sm font-medium text-gray-700 w-8 text-center">{strokeWidth}</div>
              </div>
            </div>

            {/* 🛠️ Action Tools */}
            <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-white/60 shadow-lg">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-white rounded-lg border hover:bg-gray-100"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              {showSettings && (
                <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg p-3 shadow-lg z-10 w-48">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Roughness:</label>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={roughness}
                        onChange={(e) => setRoughness(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Fill Color:</label>
                      <select
                        value={fillColor}
                        onChange={(e) => setFillColor(e.target.value)}
                        className="w-full p-1 border rounded text-xs"
                      >
                        <option value="transparent">None</option>
                        <option value={strokeColor}>Same as stroke</option>
                        <option value="#ff000020">Light Red</option>
                        <option value="#00ff0020">Light Green</option>
                        <option value="#0000ff20">Light Blue</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border">
              <button
                onClick={undo}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Undo"
                disabled={undoStack.length === 0}
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Redo"
                disabled={redoStack.length === 0}
              >
                <Redo className="w-4 h-4" />
              </button>
              <button
                onClick={clearCanvas}
                className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                title="Clear All"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleFullscreen}
                className={`p-2 rounded transition-colors ${isFullscreen ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F11)'}
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border">
              <button
                onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
                className="px-2 py-1 hover:bg-gray-100 rounded text-sm"
              >
                -
              </button>
              <span className="text-xs px-2">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                className="px-2 py-1 hover:bg-gray-100 rounded text-sm"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text Input Modal */}
      {textPosition && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-medium mb-3">Add Text</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text..."
              className="w-full p-2 border rounded mb-3"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={handleTextSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setTextPosition(null)
                  setTextInput('')
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
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
        
        {/* Student View Overlay */}
        {!isTeacher && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm">
            👀 Student View
          </div>
        )}
        
        {/* Zoom indicator */}
        {zoom !== 1 && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>

      {/* Fullscreen Suggestion Popup */}
      {showFullscreenSuggestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center">
            <div className="text-4xl mb-4">📱➡️💻</div>
            <h3 className="text-xl font-bold mb-3">Better Learning Experience</h3>
            <p className="text-gray-600 mb-4">
              For the best whiteboard experience, we recommend switching to fullscreen mode. 
              This gives you more space to see teacher's drawings and interact with the content.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={toggleFullscreen}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Enable Fullscreen
              </button>
              <button
                onClick={() => setShowFullscreenSuggestion(false)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Maybe Later
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              You can press F11 or use the toolbar button anytime to toggle fullscreen
            </p>
          </div>
        </div>
      )}

      {/* Compression Stats Toggle Button - Fixed on Right Side */}
      {isTeacher && compressionStats.originalSize > 0 && (
        <button
          onClick={() => setShowCompressionStats(!showCompressionStats)}
          className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-gradient-to-l from-blue-500 to-purple-600 text-white p-2 rounded-l-lg shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 z-50 group"
          title={showCompressionStats ? "Hide Compression Stats" : "Show Compression Stats"}
        >
          <div className="flex items-center space-x-1">
            <span className="text-sm font-bold">📦</span>
            <div className="hidden group-hover:block text-xs whitespace-nowrap">
              {showCompressionStats ? "Hide" : "Stats"}
            </div>
          </div>
        </button>
      )}

      {/* Compression Stats Panel - Sliding from Right */}
      {isTeacher && compressionStats.originalSize > 0 && (
        <div className={`fixed top-1/2 right-0 transform -translate-y-1/2 transition-transform duration-300 ease-in-out z-40 ${
          showCompressionStats ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="bg-white/95 backdrop-blur-sm p-4 rounded-l-xl shadow-xl border-l-4 border-blue-500 mr-12 min-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📦</span>
                <h3 className="text-sm font-bold text-gray-800">Compression Analytics</h3>
              </div>
              <button
                onClick={() => setShowCompressionStats(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Data Size Stats */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Data Transfer</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-gray-600">Original</div>
                    <div className="font-bold text-red-600">{(compressionStats.originalSize / 1024).toFixed(1)} KB</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Compressed</div>
                    <div className="font-bold text-green-600">{(compressionStats.compressedSize / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Performance</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Compression Ratio:</span>
                    <span className="font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      {compressionStats.compressionRatio.toFixed(1)}:1
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Size Reduction:</span>
                    <span className="font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                      {((1 - compressionStats.compressedSize/compressionStats.originalSize) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Packets/sec:</span>
                    <span className="font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                      {compressionStats.packetsPerSecond.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Network Mode */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Network Mode</h4>
                <div className="flex justify-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    (bandwidthMode as string) === 'ultra-low' ? 'bg-orange-100 text-orange-600' :
                    (bandwidthMode as string) === 'low' ? 'bg-yellow-100 text-yellow-600' : 
                    'bg-green-100 text-green-600'
                  }`}>
                    {(bandwidthMode as string) === 'ultra-low' ? '🐌 Ultra-Low Bandwidth' :
                     (bandwidthMode as string) === 'low' ? '⚡ Low Bandwidth' : 
                     '🚀 Normal Mode'}
                  </span>
                </div>
              </div>

              {/* Real-time Status */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-2 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-gray-700">Live Compression Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WhiteBoard
