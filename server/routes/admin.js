const express = require('express')
const bcrypt = require('bcryptjs')
const { 
  User, 
  OTP, 
  ClassSession, 
  SessionParticipant,
  AdminSession 
} = require('../models')
const { 
  AuthUtils,
  authenticateAdmin,
  adminLoginLimiter,
  loginValidation,
  createUserValidation,
  otpValidation,
  passwordResetValidation,
  handleValidationErrors,
  auditLog,
  protectAdminRoutes
} = require('../middleware/auth')
const OTPService = require('../services/otpService')

const router = express.Router()

// Apply admin route protection and security headers
router.use(protectAdminRoutes)

// Admin Login
router.post('/login', 
  adminLoginLimiter,
  loginValidation,
  handleValidationErrors,
  auditLog('ADMIN_LOGIN_ATTEMPT'),
  async (req, res) => {
    try {
      const { email, password } = req.body

      // Find admin user
      const admin = await User.findOne({ 
        email: email.toLowerCase(), 
        role: 'admin',
        isActive: true 
      })

      if (!admin) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials'
        })
      }

      // Check if account is locked
      if (admin.isLocked) {
        return res.status(423).json({
          error: 'Account locked',
          message: 'Account is temporarily locked due to too many failed attempts'
        })
      }

      // Verify password
      const isValidPassword = await AuthUtils.comparePassword(password, admin.passwordHash)
      
      if (!isValidPassword) {
        // Increment login attempts
        await User.findByIdAndUpdate(admin._id, {
          $inc: { loginAttempts: 1 },
          $set: { 
            lockUntil: admin.loginAttempts >= 4 ? 
              new Date(Date.now() + 30 * 60 * 1000) : // Lock for 30 minutes after 5 attempts
              undefined
          }
        })

        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials'
        })
      }

      // Reset login attempts on successful login
      await User.findByIdAndUpdate(admin._id, {
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { 
          lastLogin: new Date(),
          isOnline: true 
        }
      })

      // Generate JWT token
      const token = AuthUtils.generateToken({
        userId: admin._id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      })

      // Create admin session record
      const session = new AdminSession({
        adminId: admin._id,
        token: token.substring(0, 10) + '...', // Store partial token for tracking
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      })
      await session.save()

      console.log(`✅ Admin login successful: ${admin.email}`)

      res.json({
        success: true,
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          mustChangePassword: admin.mustChangePassword,
          preferences: admin.preferences
        },
        sessionId: session._id
      })

    } catch (error) {
      console.error('❌ Admin login error:', error)
      res.status(500).json({
        error: 'Login failed',
        message: 'Internal server error'
      })
    }
  }
)

// Create User (Teacher/Student)
router.post('/create-user',
  authenticateAdmin,
  createUserValidation,
  handleValidationErrors,
  auditLog('CREATE_USER'),
  async (req, res) => {
    try {
      const { name, email, username, password, role, phone, profile = {} } = req.body

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: email?.toLowerCase() },
          { username: username?.toLowerCase() }
        ]
      })

      if (existingUser) {
        return res.status(409).json({
          error: 'User exists',
          message: 'A user with this email or username already exists'
        })
      }

      // Hash password
      const passwordHash = await AuthUtils.hashPassword(password)

      // Create user
      const user = new User({
        name: name.trim(),
        email: email?.toLowerCase(),
        username: username?.toLowerCase(),
        passwordHash,
        role,
        profile: {
          ...profile,
          phone
        },
        mustChangePassword: true // Force password change on first login
      })

      await user.save()

      // Send welcome email with credentials
      if (email) {
        try {
          await OTPService.sendWelcomeEmail(email, {
            name,
            username: username || email,
            tempPassword: password,
            role,
            loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
          })
        } catch (emailError) {
          console.error('❌ Welcome email failed:', emailError)
          // Don't fail user creation if email fails
        }
      }

      console.log(`✅ User created: ${user.email || user.username} (${role})`)

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      })

    } catch (error) {
      console.error('❌ Create user error:', error)
      res.status(500).json({
        error: 'User creation failed',
        message: 'Internal server error'
      })
    }
  }
)

// Get All Users
router.get('/users',
  authenticateAdmin,
  auditLog('VIEW_USERS'),
  async (req, res) => {
    try {
      const { 
        role, 
        isActive, 
        page = 1, 
        limit = 20, 
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query

      // Build filter
      const filter = {}
      if (role && role !== 'all') filter.role = role
      if (isActive !== undefined) filter.isActive = isActive === 'true'
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ]
      }

      // Build sort
      const sort = {}
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1

      // Execute query with pagination
      const users = await User.find(filter)
        .select('-passwordHash') // Exclude password hash
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean()

      // Get total count
      const total = await User.countDocuments(filter)

      // Get additional stats for each user
      const userStats = await Promise.all(
        users.map(async (user) => {
          const stats = {}
          
          if (user.role === 'teacher') {
            stats.totalSessions = await ClassSession.countDocuments({ teacherId: user._id })
            stats.activeSessions = await ClassSession.countDocuments({ 
              teacherId: user._id, 
              isLive: true 
            })
          } else if (user.role === 'student') {
            stats.sessionParticipations = await SessionParticipant.countDocuments({ userId: user._id })
            stats.currentSession = await SessionParticipant.findOne({ 
              userId: user._id, 
              isActive: true 
            }).populate('sessionId', 'title')
          }

          return { ...user, stats }
        })
      )

      res.json({
        success: true,
        users: userStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      })

    } catch (error) {
      console.error('❌ Get users error:', error)
      res.status(500).json({
        error: 'Failed to fetch users',
        message: 'Internal server error'
      })
    }
  }
)

// Update User
router.patch('/user/:id',
  authenticateAdmin,
  handleValidationErrors,
  auditLog('UPDATE_USER'),
  async (req, res) => {
    try {
      const { id } = req.params
      const updates = req.body

      // Remove sensitive fields that shouldn't be updated this way
      delete updates.passwordHash
      delete updates.role // Role changes need special handling
      delete updates._id

      const user = await User.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-passwordHash')

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The specified user does not exist'
        })
      }

      console.log(`✅ User updated: ${user.email || user.username}`)

      res.json({
        success: true,
        message: 'User updated successfully',
        user
      })

    } catch (error) {
      console.error('❌ Update user error:', error)
      res.status(500).json({
        error: 'User update failed',
        message: 'Internal server error'
      })
    }
  }
)

// Deactivate User
router.delete('/user/:id',
  authenticateAdmin,
  auditLog('DEACTIVATE_USER'),
  async (req, res) => {
    try {
      const { id } = req.params

      const user = await User.findByIdAndUpdate(
        id,
        { isActive: false, isOnline: false },
        { new: true }
      ).select('-passwordHash')

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The specified user does not exist'
        })
      }

      // End any active sessions for this user
      if (user.role === 'teacher') {
        await ClassSession.updateMany(
          { teacherId: id, isLive: true },
          { isLive: false, endTime: new Date() }
        )
      }

      await SessionParticipant.updateMany(
        { userId: id, isActive: true },
        { isActive: false, leftAt: new Date() }
      )

      console.log(`✅ User deactivated: ${user.email || user.username}`)

      res.json({
        success: true,
        message: 'User deactivated successfully',
        user
      })

    } catch (error) {
      console.error('❌ Deactivate user error:', error)
      res.status(500).json({
        error: 'User deactivation failed',
        message: 'Internal server error'
      })
    }
  }
)

// Permanently Delete User
router.delete('/users/:id',
  authenticateAdmin,
  auditLog('DELETE_USER_PERMANENT'),
  async (req, res) => {
    try {
      const { id } = req.params

      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The specified user does not exist'
        })
      }

      // Prevent deletion of admin users
      if (user.role === 'admin') {
        return res.status(403).json({
          error: 'Cannot delete admin user',
          message: 'Admin users cannot be permanently deleted'
        })
      }

      // Clean up related data
      if (user.role === 'teacher') {
        // Delete all sessions created by this teacher
        await ClassSession.deleteMany({ teacherId: id })
        
        // Delete all strokes from their sessions
        const teacherSessions = await ClassSession.find({ teacherId: id })
        const sessionIds = teacherSessions.map(session => session._id)
        await Stroke.deleteMany({ sessionId: { $in: sessionIds } })
        await ChatMessage.deleteMany({ sessionId: { $in: sessionIds } })
      }
      
      // Remove from session participants
      await SessionParticipant.deleteMany({ userId: id })
      
      // Delete the user
      await User.findByIdAndDelete(id)

      console.log(`✅ User permanently deleted: ${user.email || user.username}`)

      res.json({
        success: true,
        message: 'User deleted permanently',
        deletedUser: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      })

    } catch (error) {
      console.error('❌ Delete user error:', error)
      res.status(500).json({
        error: 'User deletion failed',
        message: 'Internal server error'
      })
    }
  }
)

// Force Password Reset
router.post('/reset-password/:id',
  authenticateAdmin,
  auditLog('FORCE_PASSWORD_RESET'),
  async (req, res) => {
    try {
      const { id } = req.params

      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The specified user does not exist'
        })
      }

      // Generate temporary password
      const tempPassword = AuthUtils.generateTempPassword()
      const passwordHash = await AuthUtils.hashPassword(tempPassword)

      // Update user
      await User.findByIdAndUpdate(id, {
        passwordHash,
        mustChangePassword: true,
        loginAttempts: 0,
        $unset: { lockUntil: 1 }
      })

      // Send reset notification
      if (user.email) {
        try {
          await OTPService.sendAdminReset(user.email, tempPassword, user.name)
        } catch (emailError) {
          console.error('❌ Password reset email failed:', emailError)
          return res.status(500).json({
            error: 'Reset failed',
            message: 'Failed to send reset email'
          })
        }
      }

      console.log(`✅ Password reset for user: ${user.email || user.username}`)

      res.json({
        success: true,
        message: 'Password reset successfully. Temporary credentials sent to user.',
        tempPassword: user.email ? undefined : tempPassword // Only return if no email
      })

    } catch (error) {
      console.error('❌ Force password reset error:', error)
      res.status(500).json({
        error: 'Password reset failed',
        message: 'Internal server error'
      })
    }
  }
)

// Request OTP for Password Reset (User-initiated)
router.post('/request-otp',
  otpValidation,
  handleValidationErrors,
  auditLog('OTP_REQUEST'),
  async (req, res) => {
    try {
      const { email, phone } = req.body

      if (!email && !phone) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Either email or phone number is required'
        })
      }

      // Find user
      const user = await User.findOne({
        $or: [
          ...(email ? [{ email: email.toLowerCase() }] : []),
          ...(phone ? [{ 'profile.phone': phone }] : [])
        ],
        isActive: true
      })

      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          success: true,
          message: 'If the account exists, an OTP has been sent'
        })
      }

      // Generate OTP
      const otpCode = OTPService.generateOTP()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

      // Save OTP
      await OTP.findOneAndUpdate(
        { email: user.email, type: 'password_reset' },
        {
          email: user.email,
          phone: user.profile?.phone,
          otpCode,
          type: 'password_reset',
          expiresAt,
          attempts: 0
        },
        { upsert: true }
      )

      // Send OTP
      const otpResult = await OTPService.sendDualOTP(
        user.email,
        user.profile?.phone,
        otpCode,
        'password reset'
      )

      if (!otpResult.success) {
        return res.status(500).json({
          error: 'OTP delivery failed',
          message: 'Failed to send OTP. Please try again.'
        })
      }

      console.log(`✅ OTP sent for password reset: ${user.email}`)

      res.json({
        success: true,
        message: 'OTP sent successfully',
        deliveryMethods: {
          email: otpResult.email?.success || false,
          sms: otpResult.sms?.success || false
        }
      })

    } catch (error) {
      console.error('❌ OTP request error:', error)
      res.status(500).json({
        error: 'OTP request failed',
        message: 'Internal server error'
      })
    }
  }
)

// Verify OTP and Reset Password
router.post('/verify-otp',
  passwordResetValidation,
  handleValidationErrors,
  auditLog('OTP_VERIFY'),
  async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body

      // Find and verify OTP
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        type: 'password_reset',
        otpCode: otp,
        expiresAt: { $gt: new Date() }
      })

      if (!otpRecord) {
        // Increment attempts for existing OTP
        await OTP.findOneAndUpdate(
          { email: email.toLowerCase(), type: 'password_reset' },
          { $inc: { attempts: 1 } }
        )

        return res.status(400).json({
          error: 'Invalid OTP',
          message: 'OTP is invalid or has expired'
        })
      }

      // Check attempt limit
      if (otpRecord.attempts >= 3) {
        await OTP.deleteOne({ _id: otpRecord._id })
        return res.status(429).json({
          error: 'Too many attempts',
          message: 'Maximum OTP verification attempts exceeded'
        })
      }

      // Find user and update password
      const user = await User.findOne({ email: email.toLowerCase() })
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User account not found'
        })
      }

      const passwordHash = await AuthUtils.hashPassword(newPassword)
      
      await User.findByIdAndUpdate(user._id, {
        passwordHash,
        mustChangePassword: false,
        loginAttempts: 0,
        $unset: { lockUntil: 1 }
      })

      // Delete used OTP
      await OTP.deleteOne({ _id: otpRecord._id })

      console.log(`✅ Password reset completed: ${user.email}`)

      res.json({
        success: true,
        message: 'Password reset successfully'
      })

    } catch (error) {
      console.error('❌ OTP verification error:', error)
      res.status(500).json({
        error: 'Password reset failed',
        message: 'Internal server error'
      })
    }
  }
)

// Get Admin Dashboard Stats
router.get('/dashboard',
  authenticateAdmin,
  auditLog('VIEW_DASHBOARD'),
  async (req, res) => {
    try {
      const [
        totalUsers,
        activeUsers,
        totalTeachers,
        totalStudents,
        activeSessions,
        totalSessions,
        onlineUsers
      ] = await Promise.all([
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: true, lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
        User.countDocuments({ role: 'teacher', isActive: true }),
        User.countDocuments({ role: 'student', isActive: true }),
        ClassSession.countDocuments({ isLive: true }),
        ClassSession.countDocuments(),
        User.countDocuments({ isOnline: true })
      ])

      // Get recent activity
      const recentSessions = await ClassSession.find()
        .populate('teacherId', 'name')
        .sort({ startTime: -1 })
        .limit(5)

      const recentUsers = await User.find({ isActive: true })
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .limit(5)

      res.json({
        success: true,
        stats: {
          users: {
            total: totalUsers,
            active: activeUsers,
            teachers: totalTeachers,
            students: totalStudents,
            online: onlineUsers
          },
          sessions: {
            total: totalSessions,
            active: activeSessions
          }
        },
        recentActivity: {
          sessions: recentSessions,
          users: recentUsers
        }
      })

    } catch (error) {
      console.error('❌ Dashboard stats error:', error)
      res.status(500).json({
        error: 'Failed to fetch dashboard data',
        message: 'Internal server error'
      })
    }
  }
)

// Admin Logout
router.post('/logout',
  authenticateAdmin,
  auditLog('ADMIN_LOGOUT'),
  async (req, res) => {
    try {
      // Update user status
      await User.findByIdAndUpdate(req.userId, { isOnline: false })

      // Invalidate session if sessionId provided
      if (req.body.sessionId) {
        await AdminSession.findByIdAndUpdate(req.body.sessionId, {
          isActive: false,
          endedAt: new Date()
        })
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      })

    } catch (error) {
      console.error('❌ Admin logout error:', error)
      res.status(500).json({
        error: 'Logout failed',
        message: 'Internal server error'
      })
    }
  }
)

module.exports = router
