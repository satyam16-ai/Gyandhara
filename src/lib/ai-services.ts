// AI/ML Services for VoiceBoard

// Speech-to-Text Service
export class SpeechToTextService {
  private recognition: any = null
  private speechSupported: boolean = false

  constructor() {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition()
      this.speechSupported = true
      this.setupRecognition()
    }
  }

  private setupRecognition() {
    if (!this.recognition) return

    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = 'en-US' // Default language

    this.recognition.onstart = () => {
      console.log('Speech recognition started')
    }

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
    }

    this.recognition.onend = () => {
      console.log('Speech recognition ended')
    }
  }

  startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    language: string = 'en-US'
  ) {
    if (!this.speechSupported || !this.recognition) {
      console.warn('Speech recognition not supported')
      return
    }

    this.recognition.lang = language

    this.recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      onResult(finalTranscript || interimTranscript, !!finalTranscript)
    }

    this.recognition.start()
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop()
    }
  }

  isSupported(): boolean {
    return this.speechSupported
  }
}

// Audio Processing Service
export class AudioProcessingService {
  private audioContext: AudioContext | null = null

  constructor() {
    try {
      this.audioContext = new AudioContext()
    } catch (error) {
      console.error('AudioContext not supported:', error)
    }
  }

  async compressAudio(
    audioBlob: Blob, 
    targetBitrate: number = 32000
  ): Promise<Blob> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available')
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      // Simple compression by reducing sample rate and channels
      const targetSampleRate = targetBitrate > 32000 ? 44100 : 22050
      const channels = targetBitrate > 16000 ? 2 : 1
      
      const compressedBuffer = this.resampleAudio(audioBuffer, targetSampleRate, channels)
      
      // Convert back to blob (simplified - in real implementation use proper encoding)
      const wavBlob = this.audioBufferToWav(compressedBuffer)
      
      return wavBlob
    } catch (error) {
      console.error('Audio compression failed:', error)
      return audioBlob
    }
  }

  private resampleAudio(
    audioBuffer: AudioBuffer, 
    targetSampleRate: number, 
    targetChannels: number
  ): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available')

    const originalSampleRate = audioBuffer.sampleRate
    const ratio = originalSampleRate / targetSampleRate
    const targetLength = Math.round(audioBuffer.length / ratio)

    const newBuffer = this.audioContext.createBuffer(
      targetChannels,
      targetLength,
      targetSampleRate
    )

    for (let channel = 0; channel < Math.min(targetChannels, audioBuffer.numberOfChannels); channel++) {
      const originalData = audioBuffer.getChannelData(channel)
      const newData = newBuffer.getChannelData(channel)

      for (let i = 0; i < targetLength; i++) {
        const originalIndex = Math.round(i * ratio)
        newData[i] = originalData[Math.min(originalIndex, originalData.length - 1)]
      }
    }

    return newBuffer
  }

  private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const length = audioBuffer.length
    const numberOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * 2, true)

    // Audio data
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample * 0x7FFF, true)
        offset += 2
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  async applyNoiseReduction(audioBlob: Blob): Promise<Blob> {
    // Simplified noise reduction - in real implementation use more sophisticated algorithms
    try {
      if (!this.audioContext) return audioBlob

      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      // Apply basic high-pass filter to remove low-frequency noise
      const filteredBuffer = this.applyHighPassFilter(audioBuffer, 80) // 80Hz cutoff
      
      return this.audioBufferToWav(filteredBuffer)
    } catch (error) {
      console.error('Noise reduction failed:', error)
      return audioBlob
    }
  }

  private applyHighPassFilter(audioBuffer: AudioBuffer, cutoffFreq: number): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available')

    const filteredBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    const sampleRate = audioBuffer.sampleRate
    const rc = 1.0 / (cutoffFreq * 2 * Math.PI)
    const dt = 1.0 / sampleRate
    const alpha = rc / (rc + dt)

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = filteredBuffer.getChannelData(channel)
      
      let prevInput = 0
      let prevOutput = 0

      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = alpha * (prevOutput + inputData[i] - prevInput)
        prevInput = inputData[i]
        prevOutput = outputData[i]
      }
    }

    return filteredBuffer
  }
}

// Stroke Optimization Service
export class StrokeOptimizationService {
  // Simplify stroke paths for low bandwidth
  static simplifyStrokes(strokes: any[], tolerance: number = 2): any[] {
    return strokes.map(stroke => this.simplifyStroke(stroke, tolerance))
  }

  private static simplifyStroke(stroke: any, tolerance: number): any {
    // Douglas-Peucker algorithm for path simplification
    if (!stroke.path || stroke.path.length < 3) return stroke

    const simplified = this.douglasPeucker(stroke.path, tolerance)
    
    return {
      ...stroke,
      path: simplified,
      simplified: true
    }
  }

  private static douglasPeucker(points: any[], tolerance: number): any[] {
    if (points.length <= 2) return points

    let maxDistance = 0
    let maxIndex = 0
    const end = points.length - 1

    for (let i = 1; i < end; i++) {
      const distance = this.perpendicularDistance(points[i], points[0], points[end])
      if (distance > maxDistance) {
        maxDistance = distance
        maxIndex = i
      }
    }

    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance)
      
      return left.slice(0, -1).concat(right)
    } else {
      return [points[0], points[end]]
    }
  }

  private static perpendicularDistance(point: any, lineStart: any, lineEnd: any): number {
    const A = point.x - lineStart.x
    const B = point.y - lineStart.y
    const C = lineEnd.x - lineStart.x
    const D = lineEnd.y - lineStart.y

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B)

    const param = dot / lenSq
    
    let xx: number, yy: number
    
    if (param < 0) {
      xx = lineStart.x
      yy = lineStart.y
    } else if (param > 1) {
      xx = lineEnd.x
      yy = lineEnd.y
    } else {
      xx = lineStart.x + param * C
      yy = lineStart.y + param * D
    }

    const dx = point.x - xx
    const dy = point.y - yy
    
    return Math.sqrt(dx * dx + dy * dy)
  }
}

// Translation Service (Placeholder for real translation API)
export class TranslationService {
  private static supportedLanguages = {
    'en': 'English',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'te': 'Telugu',
    'ta': 'Tamil',
    'gu': 'Gujarati',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'pa': 'Punjabi',
    'or': 'Odia'
  }

  static async translateText(
    text: string, 
    targetLanguage: string, 
    sourceLanguage: string = 'en'
  ): Promise<string> {
    // Placeholder implementation - in real app, use Google Translate API or similar
    try {
      // For demo purposes, just return formatted text indicating translation
      if (targetLanguage === sourceLanguage) return text
      
      const targetLangName = this.supportedLanguages[targetLanguage as keyof typeof this.supportedLanguages]
      return `[${targetLangName}] ${text}`
    } catch (error) {
      console.error('Translation error:', error)
      return text
    }
  }

  static getSupportedLanguages() {
    return this.supportedLanguages
  }

  static detectLanguage(text: string): string {
    // Simple language detection - in real app use proper language detection
    const hindiPattern = /[\u0900-\u097F]/
    const bengaliPattern = /[\u0980-\u09FF]/
    
    if (hindiPattern.test(text)) return 'hi'
    if (bengaliPattern.test(text)) return 'bn'
    
    return 'en' // Default to English
  }
}

// Export all services
export const aiServices = {
  speechToText: new SpeechToTextService(),
  audioProcessing: new AudioProcessingService(),
  strokeOptimization: StrokeOptimizationService,
  translation: TranslationService
}
