const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const rateLimit = require('express-rate-limit')
const { User, AdminSession } = require('./models')
const config = require('./config')

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' })
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET)
    
    // Check if user exists and is admin
    const user = await User.findById(decoded.userId)
    if (!user || user.role !== 'admin' || !user.isActive) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' })
    }

    // Check if session is still valid
    const session = await AdminSession.findOne({
      adminId: user._id,
      sessionToken: decoded.sessionToken,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })

    if (!session) {
      return res.status(401).json({ error: 'Session expired. Please login again.' })
    }

    req.admin = user
    req.session = session
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' })
    }
    res.status(500).json({ error: 'Authentication error.' })
  }
}

// Rate limiting for admin login
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
})

// Rate limiting for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts. Please try again in 1 hour.'
  }
})

// Rate limiting for OTP verification
const otpVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 OTP verification attempts
  message: {
    error: 'Too many OTP verification attempts. Please try again later.'
  }
})

// Password validation
const validatePassword = (password) => {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const errors = []
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`)
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number')
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Hash password
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
  return await bcrypt.hash(password, saltRounds)
}

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword)
}

// Generate JWT token for admin
const generateAdminToken = async (admin) => {
  // Create session token
  const sessionToken = jwt.sign({ 
    userId: admin._id, 
    timestamp: Date.now() 
  }, config.JWT_SECRET + 'session')

  // Store session in database
  const session = new AdminSession({
    adminId: admin._id,
    sessionToken,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
  })
  await session.save()

  // Generate main JWT token
  const token = jwt.sign(
    { 
      userId: admin._id, 
      role: admin.role,
      sessionToken 
    },
    config.JWT_SECRET,
    { expiresIn: '8h' }
  )

  return { token, sessionToken }
}

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString() // 6-digit OTP
}

// Account lockout handling
const handleFailedLogin = async (user) => {
  const maxAttempts = 5
  const lockDuration = 30 * 60 * 1000 // 30 minutes

  user.loginAttempts += 1

  if (user.loginAttempts >= maxAttempts) {
    user.lockUntil = new Date(Date.now() + lockDuration)
    user.loginAttempts = 0
  }

  await user.save()
}

const handleSuccessfulLogin = async (user) => {
  user.loginAttempts = 0
  user.lockUntil = undefined
  user.lastLogin = new Date()
  await user.save()
}

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Content-Security-Policy', "default-src 'self'")
  next()
}

// Input sanitization
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}

module.exports = {
  authenticateAdmin,
  adminLoginLimiter,
  passwordResetLimiter,
  otpVerificationLimiter,
  validatePassword,
  hashPassword,
  comparePassword,
  generateAdminToken,
  generateOTP,
  handleFailedLogin,
  handleSuccessfulLogin,
  securityHeaders,
  sanitizeInput
}
