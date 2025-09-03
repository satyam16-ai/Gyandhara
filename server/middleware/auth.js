const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const rateLimit = require('express-rate-limit')
const { body, validationResult } = require('express-validator')
const { User } = require('../models')

// JWT utilities
class AuthUtils {
  
  // Generate JWT token
  static generateToken(payload, expiresIn = '7d') {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn })
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
      throw new Error('Invalid or expired token')
    }
  }

  // Hash password
  static async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
    return await bcrypt.hash(password, saltRounds)
  }

  // Compare password
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword)
  }

  // Generate secure temporary password
  static generateTempPassword(length = 12) {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*'
    let password = ''
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length)
      password += charset[randomIndex]
    }
    
    return password
  }
}

// Rate limiting configuration
const createLoginLimiter = (maxAttempts, windowMinutes) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxAttempts,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      error: `Too many login attempts. Try again in ${windowMinutes} minutes.`
    }
  })
}

// Admin login rate limiter (stricter)
const adminLoginLimiter = createLoginLimiter(15 * 60 * 1000, 3) // 3 attempts per 15 minutes

// Regular login rate limiter
const regularLoginLimiter = createLoginLimiter(15 * 60 * 1000, 5) // 5 attempts per 15 minutes

// OTP request rate limiter
const otpRequestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // 2 OTP requests per minute
  message: {
    error: 'Too many OTP requests',
    message: 'Please wait before requesting another OTP'
  }
})

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'No token provided' 
      })
    }

    const decoded = AuthUtils.verifyToken(token)
    
    // Fetch user details
    const user = await User.findById(decoded.userId).select('-passwordHash')
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'User not found or inactive' 
      })
    }

    req.user = user
    req.userId = decoded.userId
    req.userRole = decoded.role
    next()
    
  } catch (error) {
    console.error('🔒 Auth middleware error:', error.message)
    return res.status(401).json({ 
      error: 'Access denied', 
      message: 'Invalid token' 
    })
  }
}

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ 
          error: 'Access forbidden', 
          message: 'Admin privileges required' 
        })
      }
      next()
    })
  } catch (error) {
    return res.status(401).json({ 
      error: 'Access denied', 
      message: 'Authentication failed' 
    })
  }
}

// Input validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
]

const createUserValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least 8 characters, including uppercase, lowercase, number, and special character'),
  body('role')
    .isIn(['teacher', 'student', 'admin'])
    .withMessage('Role must be teacher, student, or admin'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number required')
]

const otpValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number required')
]

const passwordResetValidation = [
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must meet security requirements')
]

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    })
  }
  next()
}

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
}

// Admin route protection (additional layer)
const protectAdminRoutes = (req, res, next) => {
  const adminPath = process.env.ADMIN_SECRET_PATH || 'admin-secure-7x9k2m'
  
  if (!req.path.includes(adminPath)) {
    return res.status(404).json({ 
      error: 'Not found',
      message: 'The requested resource does not exist'
    })
  }
  
  next()
}

// Audit logging middleware
const auditLog = (action) => {
  return (req, res, next) => {
    const originalSend = res.send
    
    res.send = function(data) {
      // Log the action
      console.log(`🔍 AUDIT: ${action}`, {
        userId: req.userId || 'anonymous',
        userRole: req.userRole || 'unknown',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        success: res.statusCode < 400
      })
      
      originalSend.call(this, data)
    }
    
    next()
  }
}

module.exports = {
  AuthUtils,
  authenticateToken,
  authenticateAdmin,
  adminLoginLimiter,
  regularLoginLimiter,
  otpRequestLimiter,
  loginValidation,
  createUserValidation,
  otpValidation,
  passwordResetValidation,
  handleValidationErrors,
  securityHeaders,
  protectAdminRoutes,
  auditLog
}
