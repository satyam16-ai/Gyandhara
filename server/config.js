// Environment configuration
require('dotenv').config()

module.exports = {
  // MongoDB Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/voiceboard',
  
  // Server Configuration
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'voiceboard_jwt_secret_key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  
  // Audio Configuration
  DEFAULT_AUDIO_BITRATE: parseInt(process.env.DEFAULT_AUDIO_BITRATE) || 32000,
  MAX_AUDIO_CHUNK_SIZE: parseInt(process.env.MAX_AUDIO_CHUNK_SIZE) || 2048,
  
  // File Upload Configuration
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  
  // AI/ML Service Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY || '',
  
  // Bandwidth Settings
  BANDWIDTH_CONFIGS: {
    'ultra-low': {
      audioBitrate: 16000,
      maxStrokesPerSecond: 5,
      compressionLevel: 0.9,
      enableVideo: false
    },
    'low': {
      audioBitrate: 32000,
      maxStrokesPerSecond: 10,
      compressionLevel: 0.7,
      enableVideo: false
    },
    'normal': {
      audioBitrate: 64000,
      maxStrokesPerSecond: 30,
      compressionLevel: 0.5,
      enableVideo: true
    }
  }
}
