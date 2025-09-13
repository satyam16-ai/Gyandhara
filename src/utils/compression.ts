/**
 * 3-Step Ultra-Compression System for Real-time Drawing Data  
 * Target: 100KB → 5KB (20:1 compression ratio)
 * 
 * STEP 1: Serialize → Optimize data structure
 * STEP 2: Binary Pack → Bit-level optimization  
 * STEP 3: Deflate → Maximum size reduction
 */

import * as pako from 'pako'

// Optimized tool codes (4 bits only)
export const TOOL_CODES = {
  'pen': 1,
  'pencil': 1, 
  'eraser': 2,
  'rectangle': 3,
  'circle': 4,
  'line': 5,
  'arrow': 6,
  'text': 7,
  'highlighter': 8,
  'triangle': 9,
  'select': 10,
  'hand': 11,
  'freehand': 1
} as const

export const TOOL_DECODE = Object.fromEntries(
  Object.entries(TOOL_CODES).map(([key, value]) => [value, key])
)

// Compact color palette (16 most common colors - 4 bits each)
export const COLOR_PALETTE = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#800000', '#008000', '#000080', '#808000',
  '#800080', '#008080', '#C0C0C0', '#808080'
] as const

export const COLOR_TO_INDEX = new Map<string, number>(
  COLOR_PALETTE.map((color, index) => [color, index] as [string, number])
)

// Optimized action codes (3 bits)
export const ACTION_CODES = {
  'draw_start': 1,
  'draw_move': 2, 
  'draw_end': 3,
  'erase': 4,
  'clear': 5
} as const

export const ACTION_DECODE = Object.fromEntries(
  Object.entries(ACTION_CODES).map(([key, value]) => [value, key])
)

export interface CompressedDrawingData {
  action: keyof typeof ACTION_CODES
  tool?: keyof typeof TOOL_CODES
  x?: number
  y?: number
  deltaX?: number
  deltaY?: number
  color?: string
  strokeWidth?: number
  elementId?: string
  timestamp?: number
  isComplete?: boolean
}

// Ultra-compact binary packet (2-8 bytes total)
export interface UltraCompactPacket {
  header: number // [action:3bits][tool:4bits][hasCoords:1bit]
  coordX?: number // Delta X coordinate
  coordY?: number // Delta Y coordinate
  colorIdx?: number // Color index (4 bits)
  strokeW?: number // Stroke width (4 bits)
}

export class UltraDrawingCompressor {
  private static instance: UltraDrawingCompressor
  private lastX: number = 0
  private lastY: number = 0
  private lastTool: number = 1
  private lastColor: number = 0
  private lastStroke: number = 20 // 2.0

  static getInstance(): UltraDrawingCompressor {
    if (!UltraDrawingCompressor.instance) {
      UltraDrawingCompressor.instance = new UltraDrawingCompressor()
    }
    return UltraDrawingCompressor.instance
  }

  /**
   * 3-Step Ultra-compression: Serialize → Binary Pack → Deflate
   */
  compress(data: CompressedDrawingData): Uint8Array {
    try {
      // STEP 1: Serialize with optimal data structure
      const optimizedData = this.serializeOptimal(data)
      
      // STEP 2: ~with bit-level optimization
      const binaryPacked = this.binaryPack(optimizedData)
      
      // STEP 3: Deflate compression for maximum size reduction
      const compressed = pako.deflate(binaryPacked, { 
        level: 9,
        strategy: 3, // Z_HUFFMAN_ONLY for drawing data
        windowBits: 10 // Smaller window for tiny packets
      })
      
      return compressed
    } catch (error) {
      console.error('🔥 Compression error:', error)
      // Fallback to minimal packet
      return new Uint8Array([ACTION_CODES[data.action] || 1])
    }
  }

  /**
   * 3-Step Decompression: Inflate → Binary Unpack → Deserialize
   */
  decompress(compressedData: Uint8Array): CompressedDrawingData {
    try {
      // STEP 1: Inflate (reverse of deflate)
      const inflated = pako.inflate(compressedData)
      
      // STEP 2: Binary unpack
      const packet = this.binaryUnpack(inflated)
      
      // STEP 3: Deserialize to original structure
      return this.deserializeOptimal(packet)
      
    } catch (error) {
      console.error('🔥 Decompression error:', error)
      // Fallback minimal data
      return {
        action: 'draw_move',
        x: 0,
        y: 0
      }
    }
  }

  /**
   * STEP 1: Serialize with optimal data structure
   */
  private serializeOptimal(data: CompressedDrawingData): UltraCompactPacket {
    const packet: UltraCompactPacket = {
      header: 0
    }

    // Pack header byte: [action:3][tool:4][hasCoords:1]
    const action = ACTION_CODES[data.action] || 1
    const tool = (data.tool && TOOL_CODES[data.tool] !== this.lastTool) ? 
      TOOL_CODES[data.tool] : this.lastTool
    
    if (data.tool && TOOL_CODES[data.tool] !== this.lastTool) {
      this.lastTool = TOOL_CODES[data.tool]
    }

    // Ultra-smooth coordinate delta encoding (1px precision for smoothness!)
    let hasCoords = 0
    if (data.x !== undefined && data.y !== undefined) {
      const quantX = Math.round(data.x) // 1px precision for ultra-smoothness
      const quantY = Math.round(data.y)
      
      const deltaX = Math.max(-127, Math.min(127, quantX - this.lastX))
      const deltaY = Math.max(-127, Math.min(127, quantY - this.lastY))
      
      if (deltaX !== 0 || deltaY !== 0) {
        packet.coordX = deltaX
        packet.coordY = deltaY
        hasCoords = 1
        this.lastX = quantX
        this.lastY = quantY
      }
    }

    // Pack header
    packet.header = (action << 5) | (tool << 1) | hasCoords

    // Color compression (4 bits)
    if (data.color) {
      const colorIdx = COLOR_TO_INDEX.get(data.color) ?? this.findClosestColor(data.color)
      if (colorIdx !== this.lastColor) {
        packet.colorIdx = colorIdx
        this.lastColor = colorIdx
      }
    }

    // Stroke width (4 bits: 0.1-1.5)
    if (data.strokeWidth !== undefined) {
      const strokeW = Math.max(0, Math.min(15, Math.round(data.strokeWidth * 10)))
      if (strokeW !== this.lastStroke) {
        packet.strokeW = strokeW
        this.lastStroke = strokeW
      }
    }

    return packet
  }

  /**
   * STEP 2: Binary pack with bit-level optimization
   */
  private binaryPack(packet: UltraCompactPacket): Uint8Array {
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    let offset = 0

    // Header byte
    view.setUint8(offset++, packet.header)

    // Coordinates (2 bytes)
    if (packet.coordX !== undefined && packet.coordY !== undefined) {
      view.setInt8(offset++, packet.coordX)
      view.setInt8(offset++, packet.coordY)
    }

    // Color index (4 bits) + Stroke width (4 bits) = 1 byte
    if (packet.colorIdx !== undefined || packet.strokeW !== undefined) {
      const colorStroke = ((packet.colorIdx || 0) << 4) | (packet.strokeW || 0)
      view.setUint8(offset++, colorStroke)
    }

    return new Uint8Array(buffer, 0, offset)
  }

  /**
   * STEP 2 (Reverse): Binary unpack
   */
  private binaryUnpack(data: Uint8Array): UltraCompactPacket {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    let offset = 0

    const packet: UltraCompactPacket = {
      header: view.getUint8(offset++)
    }

    // Check if coordinates are present
    const hasCoords = packet.header & 1
    if (hasCoords && offset + 1 < data.length) {
      packet.coordX = view.getInt8(offset++)
      packet.coordY = view.getInt8(offset++)
    }

    // Color + stroke (1 byte)
    if (offset < data.length) {
      const colorStroke = view.getUint8(offset++)
      packet.colorIdx = (colorStroke >> 4) & 0xF
      packet.strokeW = colorStroke & 0xF
    }

    return packet
  }

  /**
   * STEP 3: Deserialize to original structure
   */
  private deserializeOptimal(packet: UltraCompactPacket): CompressedDrawingData {
    // Unpack header
    const action = (packet.header >> 5) & 0x7
    const tool = (packet.header >> 1) & 0xF
    const hasCoords = packet.header & 1

    const actionName = Object.keys(ACTION_CODES).find(
      key => ACTION_CODES[key as keyof typeof ACTION_CODES] === action
    ) as keyof typeof ACTION_CODES || 'draw_move'

    const result: CompressedDrawingData = {
      action: actionName
    }

    // Add tool if changed
    if (tool !== this.lastTool) {
      const toolName = Object.keys(TOOL_CODES).find(
        key => TOOL_CODES[key as keyof typeof TOOL_CODES] === tool
      ) as keyof typeof TOOL_CODES
      if (toolName) {
        result.tool = toolName
        this.lastTool = tool
      }
    }

    // Reconstruct coordinates
    if (hasCoords && packet.coordX !== undefined && packet.coordY !== undefined) {
      this.lastX += packet.coordX
      this.lastY += packet.coordY
      result.x = this.lastX
      result.y = this.lastY
    }

    // Add color if changed
    if (packet.colorIdx !== undefined && packet.colorIdx !== this.lastColor) {
      result.color = COLOR_PALETTE[packet.colorIdx] || '#000000'
      this.lastColor = packet.colorIdx
    }

    // Add stroke width if changed
    if (packet.strokeW !== undefined && packet.strokeW !== this.lastStroke) {
      result.strokeWidth = packet.strokeW / 10
      this.lastStroke = packet.strokeW
    }

    return result
  }

  /**
   * Find closest color in palette
   */
  private findClosestColor(targetColor: string): number {
    // Simple hex distance calculation
    const getDistance = (c1: string, c2: string) => {
      const hex1 = parseInt(c1.slice(1), 16)
      const hex2 = parseInt(c2.slice(1), 16)
      
      const r1 = (hex1 >> 16) & 255
      const g1 = (hex1 >> 8) & 255
      const b1 = hex1 & 255
      
      const r2 = (hex2 >> 16) & 255
      const g2 = (hex2 >> 8) & 255
      const b2 = hex2 & 255
      
      return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)
    }

    let closestIdx = 0
    let minDistance = Infinity

    COLOR_PALETTE.forEach((color, idx) => {
      const distance = getDistance(targetColor, color)
      if (distance < minDistance) {
        minDistance = distance
        closestIdx = idx
      }
    })

    return closestIdx
  }

  /**
   * Reset compression state
   */
  reset(): void {
    this.lastX = 0
    this.lastY = 0
    this.lastTool = 1
    this.lastColor = 0
    this.lastStroke = 20
  }
}

// Singleton instance
const compressor = UltraDrawingCompressor.getInstance()

// Export utility functions
export const compressDrawingData = (data: CompressedDrawingData): Uint8Array => {
  return compressor.compress(data)
}

export const decompressDrawingData = (data: Uint8Array): CompressedDrawingData => {
  return compressor.decompress(data)
}

export const resetCompression = (): void => {
  compressor.reset()
}

// Network configuration for real-time performance
export const NETWORK_CONFIG = {
  batchInterval: 16, // 60fps for ultra-smooth real-time
  maxPacketSize: 512,
  compressionLevel: 9,
  windowSize: 10,
  strategy: 3 // Z_HUFFMAN_ONLY
}

// Teacher and student compressor instances (for backward compatibility)
export const teacherCompressor = compressor
export const studentDecompressor = compressor

export default UltraDrawingCompressor
