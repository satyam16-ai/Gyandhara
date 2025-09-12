// AI/ML Services for Gyaandhara

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
  strokeOptimization: StrokeOptimizationService,
  translation: TranslationService
}
