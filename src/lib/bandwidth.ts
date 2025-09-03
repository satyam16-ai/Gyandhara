// Bandwidth management utilities for VoiceBoard

export type BandwidthMode = 'ultra-low' | 'low' | 'normal'

export interface BandwidthConfig {
  mode: BandwidthMode
  audioBitrate: number
  videoEnabled: boolean
  strokeSimplification: boolean
  maxStrokesPerSecond: number
  audioChunkSize: number
  compressionLevel: number
}

export const BANDWIDTH_CONFIGS: Record<BandwidthMode, BandwidthConfig> = {
  'ultra-low': {
    mode: 'ultra-low',
    audioBitrate: 16000,
    videoEnabled: false,
    strokeSimplification: true,
    maxStrokesPerSecond: 5,
    audioChunkSize: 512,
    compressionLevel: 0.9
  },
  'low': {
    mode: 'low',
    audioBitrate: 32000,
    videoEnabled: true,
    strokeSimplification: true,
    maxStrokesPerSecond: 15,
    audioChunkSize: 1024,
    compressionLevel: 0.7
  },
  'normal': {
    mode: 'normal',
    audioBitrate: 64000,
    videoEnabled: true,
    strokeSimplification: false,
    maxStrokesPerSecond: 30,
    audioChunkSize: 2048,
    compressionLevel: 0.5
  }
}

export class BandwidthManager {
  private currentMode: BandwidthMode = 'normal'
  private networkSpeed: number = 1000 // kbps
  private latency: number = 50 // ms
  private dataUsage: number = 0 // bytes

  constructor(initialMode: BandwidthMode = 'normal') {
    this.currentMode = initialMode
    this.startNetworkMonitoring()
  }

  private startNetworkMonitoring() {
    // Monitor network conditions and auto-adjust if needed
    setInterval(() => {
      this.measureNetworkSpeed()
      this.autoAdjustBandwidth()
    }, 5000)
  }

  private async measureNetworkSpeed() {
    try {
      // Simple network speed test using a small image
      const startTime = performance.now()
      
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache'
      })
      
      const endTime = performance.now()
      const responseSize = response.headers.get('content-length') || '1000'
      const duration = (endTime - startTime) / 1000 // seconds
      
      this.networkSpeed = (parseInt(responseSize) * 8) / (duration * 1000) // kbps
      this.latency = endTime - startTime
      
    } catch (error) {
      console.warn('Network monitoring failed:', error)
    }
  }

  private autoAdjustBandwidth() {
    let recommendedMode: BandwidthMode = this.currentMode

    if (this.networkSpeed < 50) {
      recommendedMode = 'ultra-low'
    } else if (this.networkSpeed < 200) {
      recommendedMode = 'low'
    } else {
      recommendedMode = 'normal'
    }

    if (recommendedMode !== this.currentMode) {
      console.log(`Auto-adjusting bandwidth from ${this.currentMode} to ${recommendedMode}`)
      this.setMode(recommendedMode)
    }
  }

  setMode(mode: BandwidthMode) {
    this.currentMode = mode
    console.log(`Bandwidth mode set to: ${mode}`)
  }

  getMode(): BandwidthMode {
    return this.currentMode
  }

  getConfig(): BandwidthConfig {
    return BANDWIDTH_CONFIGS[this.currentMode]
  }

  getNetworkStats() {
    return {
      speed: this.networkSpeed,
      latency: this.latency,
      dataUsage: this.dataUsage,
      mode: this.currentMode
    }
  }

  addDataUsage(bytes: number) {
    this.dataUsage += bytes
  }

  getEstimatedVideoEquivalent(): number {
    // Estimate how much data a video call would use
    return this.dataUsage * 25 // Assume video uses 25x more data
  }

  getSavingsPercentage(): number {
    const videoEquivalent = this.getEstimatedVideoEquivalent()
    return videoEquivalent > 0 ? ((videoEquivalent - this.dataUsage) / videoEquivalent) * 100 : 0
  }

  // Compress data based on current bandwidth mode
  compressStrokeData(strokes: any[]): any[] {
    const config = this.getConfig()
    
    if (!config.strokeSimplification) return strokes

    // Apply stroke simplification based on bandwidth mode
    return strokes.filter((_, index) => {
      // Skip some strokes for ultra-low bandwidth
      if (config.mode === 'ultra-low') {
        return index % 3 === 0 // Keep every 3rd stroke
      } else if (config.mode === 'low') {
        return index % 2 === 0 // Keep every 2nd stroke
      }
      return true
    })
  }

  shouldSendStroke(): boolean {
    const config = this.getConfig()
    const now = Date.now()
    
    // Implement rate limiting based on bandwidth mode
    if (!this.lastStrokeTime) {
      this.lastStrokeTime = now
      return true
    }

    const timeSinceLastStroke = now - this.lastStrokeTime
    const minInterval = 1000 / config.maxStrokesPerSecond

    if (timeSinceLastStroke >= minInterval) {
      this.lastStrokeTime = now
      return true
    }

    return false
  }

  private lastStrokeTime: number = 0
}

// Export utilities
export const bandwidthUtils = {
  formatBytes: (bytes: number): string => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  formatSpeed: (kbps: number): string => {
    if (kbps < 1000) {
      return `${kbps.toFixed(0)} kbps`
    } else {
      return `${(kbps / 1000).toFixed(1)} Mbps`
    }
  },

  getConnectionQuality: (speed: number): { label: string; color: string } => {
    if (speed > 1000) return { label: 'Excellent', color: 'green' }
    if (speed > 500) return { label: 'Good', color: 'blue' }
    if (speed > 200) return { label: 'Fair', color: 'yellow' }
    if (speed > 50) return { label: 'Poor', color: 'orange' }
    return { label: 'Very Poor', color: 'red' }
  }
}
