const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const rateLimit = require('express-rate-limit')
const { User } = require('../models')
const config = require('../config')

const router = express.Router()

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET /api/auth/profile',
      'PUT /api/auth/profile'
    ]
  })
})

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts. Try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Input validation
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('mobile').isMobilePhone().withMessage('Valid mobile number is required'),
  body('username').trim().isLength({ min: 3, max: 20 }).isAlphanumeric().withMessage('Username must be 3-20 alphanumeric characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['teacher', 'student']).withMessage('Role must be teacher or student')
]

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('role').isIn(['teacher', 'student']).withMessage('Role must be teacher or student')
]

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }
  next()
}

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id, 
      username: user.username, 
      role: user.role 
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  )
}

// User Registration
router.post('/register',
  authLimiter,
  registerValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, mobile, username, password, role } = req.body

      // Check if user already exists by email, mobile, or username
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
          { 'profile.phone': mobile }
        ]
      })

      if (existingUser) {
        let conflictField = 'email or username'
        if (existingUser.profile?.phone === mobile) {
          conflictField = 'mobile number'
        } else if (existingUser.email === email.toLowerCase()) {
          conflictField = 'email'
        } else if (existingUser.username === username.toLowerCase()) {
          conflictField = 'username'
        }

        return res.status(409).json({
          error: 'User already exists',
          message: `A user with this ${conflictField} already exists`
        })
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12)

      // Create user
      const user = new User({
        name: name.trim(),
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        role,
        isActive: true,
        createdAt: new Date(),
        lastLogin: null,
        profile: {
          phone: mobile,
          preferences: {
            bandwidthMode: 'normal',
            notifications: true,
            theme: false
          }
        }
      })

      await user.save()

      // Generate token
      const token = generateToken(user)

      // Return user data (without password)
      const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        profile: user.profile
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: userData
      })

    } catch (error) {
      console.error('❌ Registration error:', error)
      res.status(500).json({
        error: 'Registration failed',
        message: 'Internal server error'
      })
    }
  }
)

// User Login
router.post('/login',
  authLimiter,
  loginValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, password, role } = req.body

      // Find user
      const user = await User.findOne({
        username: username.toLowerCase(),
        role: role,
        isActive: true
      })

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Username, password, or role is incorrect'
        })
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash)

      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Username, password, or role is incorrect'
        })
      }

      // Update last login
      await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date(),
        isOnline: true
      })

      // Generate token
      const token = generateToken(user)

      // Return user data (without password)
      const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        profile: user.profile,
        lastLogin: new Date()
      }

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userData
      })

    } catch (error) {
      console.error('❌ Login error:', error)
      res.status(500).json({
        error: 'Login failed',
        message: 'Internal server error'
      })
    }
  }
)

// User Logout
router.post('/logout',
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, config.JWT_SECRET)
        
        // Update user online status
        await User.findByIdAndUpdate(decoded.userId, {
          isOnline: false
        })
      }

      res.json({
        success: true,
        message: 'Logout successful'
      })

    } catch (error) {
      console.error('❌ Logout error:', error)
      res.json({
        success: true,
        message: 'Logout successful'
      })
    }
  }
)

// Verify Token (middleware for protected routes)
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, config.JWT_SECRET)

    // Get user from database
    const user = await User.findById(decoded.userId).select('-passwordHash')
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token or user inactive'
      })
    }

    req.user = user
    next()

  } catch (error) {
    console.error('❌ Authentication error:', error)
    res.status(401).json({
      error: 'Access denied',
      message: 'Invalid token'
    })
  }
}

// Get Current User Profile
router.get('/profile',
  authenticateUser,
  async (req, res) => {
    try {
      res.json({
        success: true,
        user: req.user
      })
    } catch (error) {
      console.error('❌ Profile fetch error:', error)
      res.status(500).json({
        error: 'Failed to fetch profile',
        message: 'Internal server error'
      })
    }
  }
)

// Update User Profile
router.put('/profile',
  authenticateUser,
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('profile.preferences.bandwidthMode').optional().isIn(['ultra-low', 'low', 'normal']),
    body('profile.preferences.notifications').optional().isBoolean(),
    body('profile.preferences.theme').optional().isIn(['light'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const allowedUpdates = ['name', 'email', 'profile']
      const updates = {}

      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key]
        }
      })

      if (updates.email) {
        // Check if email is already taken
        const existingUser = await User.findOne({
          email: updates.email.toLowerCase(),
          _id: { $ne: req.user._id }
        })

        if (existingUser) {
          return res.status(409).json({
            error: 'Email already taken',
            message: 'This email is already registered to another account'
          })
        }

        updates.email = updates.email.toLowerCase()
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
      ).select('-passwordHash')

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      })

    } catch (error) {
      console.error('❌ Profile update error:', error)
      res.status(500).json({
        error: 'Failed to update profile',
        message: 'Internal server error'
      })
    }
  }
)

module.exports = router
