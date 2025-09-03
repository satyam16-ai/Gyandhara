// Production-safe logging utility
const isDevelopment = process.env.NODE_ENV === 'development'
const isClient = typeof window !== 'undefined'

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (isDevelopment || !isClient) {
      console.log(`ℹ️ ${message}`, ...args)
    }
  },
  
  success: (message: string, ...args: any[]) => {
    if (isDevelopment || !isClient) {
      console.log(`✅ ${message}`, ...args)
    }
  },
  
  warning: (message: string, ...args: any[]) => {
    if (isDevelopment || !isClient) {
      console.warn(`⚠️ ${message}`, ...args)
    }
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`❌ ${message}`, ...args)
  },
  
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.debug(`🐛 ${message}`, ...args)
    }
  }
}

export default logger
