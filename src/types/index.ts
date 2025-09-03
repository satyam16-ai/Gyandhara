// Core types for VoiceBoard platform

export interface StrokeData {
  x1: number
  y1: number
  x2: number
  y2: number
  time: number
  color?: string
  thickness?: number
  tool?: 'pen' | 'eraser' | 'highlighter'
}

export interface DrawingElement {
  id: string
  type: 'freehand' | 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | 'text' | 'highlight'
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

export interface AudioChunk {
  chunk: string // base64 encoded audio data
  time: number
  duration: number
}

export interface ClassSession {
  id: string
  teacherId: string
  title: string
  subject: string
  startTime: Date
  endTime?: Date
  strokes: StrokeData[]
  audioChunks: AudioChunk[]
  isLive: boolean
  bandwidth: 'ultra-low' | 'low' | 'normal'
}

export interface Student {
  id: string
  name: string
  isOnline: boolean
  handRaised: boolean
  bandwidthMode: 'ultra-low' | 'low' | 'normal'
}

export interface Teacher {
  id: string
  name: string
  subject: string
  isTeaching: boolean
}

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: Date
  type: 'text' | 'voice' | 'question'
}

export interface BandwidthSettings {
  mode: 'ultra-low' | 'low' | 'normal'
  maxAudioBitrate: number
  strokeSimplification: boolean
  autoCompress: boolean
}
