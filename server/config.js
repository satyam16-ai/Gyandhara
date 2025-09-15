// Environment configuration
require('dotenv').config()

const isProduction = process.env.NODE_ENV === 'production'

module.exports = {
  // MongoDB Configuration
  MONGODB_URI: process.env.MONGODB_URI || (isProduction 
    ? 'mongodb+srv://satyam_ai:satyamtiwari01@gyandhara.ordgmuf.mongodb.net/gyaandhara?retryWrites=true&w=majority&appName=GYANDHARA'
    : 'mongodb://localhost:27017/voiceboard'
  ),
  
  // Server Configuration
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || (isProduction ? 'https://gyandhara-satyam.vercel.app' : 'http://localhost:3000'),
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || (isProduction 
    ? 'CHANGE_THIS_IN_PRODUCTION_IMMEDIATELY' 
    : 'voiceboard_jwt_secret_key'
  ),
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  
  // File Upload Configuration
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  
  // AI/ML Service Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  
  // Security Configuration
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 200 : 100),
  RATE_LIMIT_WINDOW_MINUTES: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15,
  
  // Performance Configuration
  MAX_PARTICIPANTS_PER_SESSION: parseInt(process.env.MAX_PARTICIPANTS_PER_SESSION) || (isProduction ? 50 : 30),
  SESSION_TIMEOUT_MINUTES: parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 480,
  COMPRESSION_LEVEL: parseInt(process.env.COMPRESSION_LEVEL) || (isProduction ? 6 : 5),
  
  // Feature Flags
  ENABLE_AI_FEATURES: process.env.ENABLE_AI_FEATURES === 'true',
  ENABLE_SMS_NOTIFICATIONS: process.env.ENABLE_SMS_NOTIFICATIONS === 'true',
  ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
  ENABLE_COMPRESSION: process.env.ENABLE_COMPRESSION !== 'false',
  DEBUG_MODE: process.env.DEBUG_MODE === 'true' && !isProduction,
  
  // Bandwidth Settings
  BANDWIDTH_CONFIGS: {
    'ultra-low': {
      maxStrokesPerSecond: 5,
      compressionLevel: 0.9,
      enableVideo: false
    },
    'low': {
      maxStrokesPerSecond: 10,
      compressionLevel: 0.7,
      enableVideo: false
    },
    'normal': {
      maxStrokesPerSecond: isProduction ? 40 : 30,
      compressionLevel: 0.5,
      enableVideo: true
    }
  },
  
  // Production-specific settings
  IS_PRODUCTION: isProduction,
  SSL_ENABLED: process.env.SSL_ENABLED === 'true',
  FORCE_HTTPS: process.env.FORCE_HTTPS === 'true' && isProduction
}
