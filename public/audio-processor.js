// Ultra-Low Latency AudioWorklet processor for real-time binary audio streaming
class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    
    // Initialize processor with configurable buffer size for ultra-low latency
    this.bufferSize = options?.processorOptions?.bufferSize || 320 // Default ~6.7ms at 48kHz
    this.buffer = new Float32Array(this.bufferSize)
    this.bufferIndex = 0
    this.sampleCount = 0
    this.chunkId = 0
    
    // Audio analysis for real-time monitoring
    this.prevSample = 0
    this.rmsWindow = new Float32Array(64) // Smaller window for faster response
    this.rmsIndex = 0
    
    // Performance tracking
    this.lastChunkTime = 0
    this.processingLatency = 0
    
    console.log('�️ Ultra-Low Latency AudioProcessor initialized:', {
      bufferSize: this.bufferSize,
      expectedLatencyMs: (this.bufferSize / 48000 * 1000).toFixed(1) + 'ms',
      rmsWindowSize: this.rmsWindow.length
    })
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    const now = currentFrame / sampleRate // Use currentFrame and sampleRate from global scope
    
    if (input && input.length > 0 && input[0]) {
      const inputChannel = input[0]
      
      // Process each sample immediately for minimal latency
      for (let i = 0; i < inputChannel.length; i++) {
        const sample = inputChannel[i]
        
        // Store sample in buffer
        this.buffer[this.bufferIndex] = sample
        this.bufferIndex++
        this.sampleCount++
        
        // Update rolling RMS calculation
        this.rmsWindow[this.rmsIndex] = sample * sample
        this.rmsIndex = (this.rmsIndex + 1) % this.rmsWindow.length
        
        // Send chunk immediately when buffer is full (minimal latency)
        if (this.bufferIndex >= this.bufferSize) {
          // Calculate current RMS
          let sumSquares = 0
          for (let j = 0; j < this.rmsWindow.length; j++) {
            sumSquares += this.rmsWindow[j]
          }
          const rms = Math.sqrt(sumSquares / this.rmsWindow.length)
          
          // Enhanced debugging for audio level detection
          if (this.chunkId % 10 === 0) { // Every 10th chunk
            console.log('🎤 WORKLET RMS DEBUG:', {
              chunkId: this.chunkId,
              rms: rms.toFixed(6),
              sumSquares: sumSquares.toFixed(6),
              windowLength: this.rmsWindow.length,
              bufferSamples: this.bufferSize,
              hasSignal: rms > 0.001 ? 'YES' : 'NO',
              peakSample: Math.max(...Array.from(this.buffer.map(Math.abs))).toFixed(6)
            })
          }
          
          // Create chunk data copy
          const chunkData = new Float32Array(this.buffer)
          
          // Calculate processing latency
          if (this.lastChunkTime > 0) {
            this.processingLatency = now - this.lastChunkTime
          }
          this.lastChunkTime = now
          
          // Send audio chunk immediately with minimal metadata
          this.port.postMessage({
            type: 'audioChunk',
            data: chunkData,
            rms: rms,
            chunkId: this.chunkId++,
            timestamp: now * 1000, // Convert to milliseconds
            sampleRate: sampleRate, // Use global sampleRate
            samples: this.bufferSize,
            processingLatency: this.processingLatency
          })
          
          // Reset buffer immediately
          this.bufferIndex = 0
          
          // Performance monitoring (reduced frequency logging)
          if (this.chunkId % 200 === 0) { // Every 200th chunk
            console.log('⚡ Ultra-Low Latency Stats:', {
              chunkId: this.chunkId,
              rms: rms.toFixed(6),
              processingLatencyMs: (this.processingLatency * 1000).toFixed(2),
              bufferSizeMs: (this.bufferSize / sampleRate * 1000).toFixed(1),
              totalSamples: this.sampleCount
            })
          }
        }
      }
      
      // Optional: Pass-through for monitoring (with volume reduction)
      if (output && output.length > 0 && output[0]) {
        const outputChannel = output[0]
        for (let i = 0; i < inputChannel.length; i++) {
          outputChannel[i] = inputChannel[i] * 0.05 // Very quiet monitoring
        }
      }
    }
    
    // Keep processor alive
    return true
  }
  
  // Static method for parameter descriptors (required)
  static get parameterDescriptors() {
    return []
  }
}

// Register the processor for ultra-low latency audio streaming
registerProcessor('audio-processor', AudioProcessor)
