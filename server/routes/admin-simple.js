const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { User, Parent } = require('../models')
const config = require('../config')

const router = express.Router()

// Simple test route (no protection)
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes are working!',
    timestamp: new Date().toISOString()
  })
})

// Admin Login (no protection needed)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    console.log('Login attempt:', { username, hasPassword: !!password })

    // Find admin user
    const admin = await User.findOne({ 
      username: username.toLowerCase(), 
      role: 'admin',
      isActive: true 
    })

    console.log('Admin found:', !!admin)

    if (!admin) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash)
    console.log('Password valid:', isValidPassword)

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        role: admin.role
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRE }
    )

    // Update last login
    await User.findByIdAndUpdate(admin._id, {
      lastLogin: new Date()
    })

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error'
    })
  }
})

// Middleware to protect other routes
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' })
    }

    const decoded = jwt.verify(token, config.JWT_SECRET)
    const admin = await User.findById(decoded.id)
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' })
    }

    req.admin = admin
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' })
  }
}

// Apply protection to all routes below this point
router.use(authenticateAdmin)

// Dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const activeUsers = await User.countDocuments({ isActive: true })
    const totalTeachers = await User.countDocuments({ role: 'teacher' })
    const totalStudents = await User.countDocuments({ role: 'student' })

    res.json({
      totalUsers,
      activeUsers,
      totalSessions: 0, // TODO: Implement when sessions are ready
      activeSessions: 0,
      totalTeachers,
      totalStudents
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query
    
    const query = {}
    if (role && role !== 'all') query.role = role
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ]
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await User.countDocuments(query)

    res.json({
      users,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Create user
router.post('/users', async (req, res) => {
  try {
    const { name, email, mobile, role = 'student', parentName, parentEmail, parentMobile, relationship = 'parent' } = req.body

    // Validate required fields
    if (!name || !email || !mobile) {
      return res.status(400).json({ error: 'Name, email, and mobile number are required' })
    }

    // Check if user exists by email
    const existingUserByEmail = await User.findOne({ email: email.toLowerCase() })
    if (existingUserByEmail) {
      return res.status(400).json({ error: 'User with this email already exists' })
    }

    // Check if user exists by mobile
    const existingUserByMobile = await User.findOne({ 'profile.phone': mobile })
    if (existingUserByMobile) {
      return res.status(400).json({ error: 'User with this mobile number already exists' })
    }

    // For students, validate parent details if provided
    let parentUser = null
    if (role === 'student' && (parentName || parentEmail || parentMobile)) {
      if (!parentName || !parentEmail || !parentMobile) {
        return res.status(400).json({ 
          error: 'When creating a student with parent details, parent name, email, and mobile are all required' 
        })
      }

      // Check if parent email already exists
      const existingParentByEmail = await User.findOne({ email: parentEmail.toLowerCase() })
      if (existingParentByEmail) {
        return res.status(400).json({ error: 'Parent with this email already exists' })
      }

      // Check if parent mobile already exists
      const existingParentByMobile = await User.findOne({ 'profile.phone': parentMobile })
      if (existingParentByMobile) {
        return res.status(400).json({ error: 'Parent with this mobile number already exists' })
      }
    }

    // Generate temporary password and username for student
    const tempPassword = Math.random().toString(36).slice(-8) + '!'
    const hashedPassword = await bcrypt.hash(tempPassword, 12)
    const username = email.split('@')[0].toLowerCase() + Math.random().toString(36).substr(2, 3)

    // Create student user
    const user = new User({
      name,
      email: email.toLowerCase(),
      username,
      passwordHash: hashedPassword,
      role,
      isActive: true,
      profile: {
        phone: mobile
      },
      createdAt: new Date()
    })

    await user.save()

    // If creating a student and parent details are provided, create parent account
    if (role === 'student' && parentName && parentEmail && parentMobile) {
      try {
        // Generate parent credentials
        const parentTempPassword = Math.random().toString(36).slice(-8) + '!'
        const parentHashedPassword = await bcrypt.hash(parentTempPassword, 12)
        const parentUsername = parentEmail.split('@')[0].toLowerCase() + Math.random().toString(36).substr(2, 3)

        // Create parent user
        parentUser = new User({
          name: parentName,
          email: parentEmail.toLowerCase(),
          username: parentUsername,
          passwordHash: parentHashedPassword,
          role: 'parent',
          isActive: true,
          profile: {
            phone: parentMobile
          },
          createdAt: new Date()
        })

        await parentUser.save()

        // Create parent-student relationship
        const parentRelationship = new Parent({
          parentId: parentUser._id,
          studentId: user._id,
          relationship: relationship,
          permissions: {
            viewProgress: true,
            viewAttendance: true,
            receiveNotifications: true,
            communicateWithTeachers: true
          },
          isActive: true,
          createdBy: req.admin._id
        })

        await parentRelationship.save()

        console.log(`👨‍👩‍👧‍👦 Parent account created for student: ${parentUser.email}`)
      } catch (parentError) {
        console.error('❌ Parent account creation failed:', parentError.message)
        // Don't fail the entire operation if parent creation fails
      }
    }

    // Send welcome notifications via both email and SMS
    try {
      const OTPService = require('../services/otpService')
      
      // Prepare user data for notifications
      const userData = {
        name,
        username,
        tempPassword,
        role,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
      }

      // Send welcome email to student
      let emailResult = null
      try {
        await OTPService.sendWelcomeEmail(email, userData)
        console.log(`📧 Welcome email sent to ${email}`)
        emailResult = { success: true, message: 'Email sent successfully' }
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError.message)
        emailResult = { success: false, message: emailError.message }
      }

      // Send SMS with credentials to student
      let smsResult = null
      if (mobile) {
        try {
          smsResult = await OTPService.sendCredentialsSMS(mobile, {
            name,
            username,
            tempPassword,
            loginUrl: userData.loginUrl
          })
          
          if (smsResult.trialAccountLimitation) {
            console.log(`📱 Trial account limitation for ${mobile}`)
          } else if (smsResult.fallback) {
            console.log(`📱 SMS fallback used for ${mobile}`)
          } else {
            console.log(`📱 Credentials SMS sent to ${mobile}`)
          }
        } catch (smsError) {
          console.error('❌ SMS sending failed:', smsError.message)
          smsResult = { success: false, message: smsError.message }
        }
      }

      // Send parent notifications if parent was created
      let parentNotifications = null
      if (parentUser) {
        try {
          const parentNotificationData = {
            parentName: parentUser.name,
            studentName: name,
            username: parentUser.username,
            tempPassword: parentTempPassword,
            loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
          }

          // Send parent credentials email
          let parentEmailResult = null
          try {
            await OTPService.sendParentCredentialsEmail(parentUser.email, parentNotificationData)
            console.log(`📧 Parent credentials email sent to ${parentUser.email}`)
            parentEmailResult = { success: true, message: 'Parent email sent successfully' }
          } catch (parentEmailError) {
            console.error('❌ Parent email sending failed:', parentEmailError.message)
            parentEmailResult = { success: false, message: parentEmailError.message }
          }

          // Send parent SMS
          let parentSmsResult = null
          if (parentMobile) {
            try {
              parentSmsResult = await OTPService.sendParentCredentialsSMS(parentMobile, parentNotificationData)
              console.log(`📱 Parent credentials SMS sent to ${parentMobile}`)
            } catch (parentSmsError) {
              console.error('❌ Parent SMS sending failed:', parentSmsError.message)
              parentSmsResult = { success: false, message: parentSmsError.message }
            }
          }

          parentNotifications = {
            email: parentEmailResult,
            sms: parentSmsResult
          }
        } catch (parentNotificationError) {
          console.error('❌ Parent notification failed:', parentNotificationError.message)
          parentNotifications = { error: parentNotificationError.message }
        }
      }

      const response = {
        success: true,
        message: role === 'student' && parentUser ? 
          'Student and parent accounts created successfully!' : 
          'User created successfully!',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.profile.phone,
          username: user.username,
          role: user.role
        },
        notifications: {
          student: {
            email: emailResult,
            sms: smsResult
          }
        }
      }

      // Add parent info to response if parent was created
      if (parentUser) {
        response.parent = {
          id: parentUser._id,
          name: parentUser.name,
          email: parentUser.email,
          mobile: parentUser.profile.phone,
          username: parentUser.username,
          role: parentUser.role,
          relationship: relationship
        }
        response.notifications.parent = parentNotifications
      }

      res.json(response)
    } catch (notificationError) {
      console.error('❌ Notification failed:', notificationError.message)
      
      // User creation succeeded, but notifications failed
      const response = {
        success: true,
        message: 'User created successfully, but notification delivery failed',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.profile.phone,
          username: user.username,
          role: user.role,
          tempPassword // Provide credentials for manual delivery
        },
        warning: 'Email/SMS delivery failed - please provide credentials manually'
      }

      // Add parent info if created
      if (parentUser) {
        response.parent = {
          id: parentUser._id,
          name: parentUser.name,
          email: parentUser.email,
          mobile: parentUser.profile.phone,
          username: parentUser.username,
          role: parentUser.role,
          tempPassword: parentTempPassword,
          relationship: relationship
        }
      }

      res.json(response)
    }
  } catch (error) {
    console.error('Create user error:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// Update user
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const updates = req.body

    // Don't allow updating password through this route
    delete updates.passwordHash
    delete updates.password

    const user = await User.findByIdAndUpdate(
      userId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).select('-passwordHash')

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// Reset user password
router.post('/users/:userId/reset-password', async (req, res) => {
  try {
    const { userId } = req.params
    
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Generate new temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + '!'
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    await User.findByIdAndUpdate(userId, {
      passwordHash: hashedPassword,
      updatedAt: new Date()
    })

    const OTPService = require('../services/otpService')
    const notifications = {
      email: null,
      sms: null,
      success: false
    }

    // Send password reset email
    try {
      await OTPService.sendAdminReset(user.email, tempPassword, user.name)
      console.log(`📧 Password reset email sent to ${user.email}`)
      notifications.email = { success: true }
    } catch (emailError) {
      console.error('❌ Password reset email failed:', emailError.message)
      notifications.email = { success: false, error: emailError.message }
    }

    // Send password reset SMS if user has mobile number
    if (user.profile?.phone) {
      try {
        await OTPService.sendPasswordResetSMS(user.profile.phone, {
          name: user.name,
          username: user.username,
          tempPassword,
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
        })
        console.log(`📱 Password reset SMS sent to ${user.profile.phone}`)
        notifications.sms = { success: true }
      } catch (smsError) {
        console.error('❌ Password reset SMS failed:', smsError.message)
        notifications.sms = { success: false, error: smsError.message }
      }
    }

    // Check if at least one notification method succeeded
    notifications.success = notifications.email?.success || notifications.sms?.success

    if (notifications.success) {
      res.json({
        success: true,
        message: 'Password reset successfully and notifications sent',
        notifications
      })
    } else {
      // Both notifications failed, provide temp password to admin
      res.json({
        success: true,
        message: 'Password reset successfully (notification delivery failed)',
        tempPassword, // Fallback - provide to admin
        notifications
      })
    }
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// Delete user permanently
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent deletion of admin users
    if (user.role === 'admin') {
      return res.status(403).json({ 
        error: 'Cannot delete admin user',
        message: 'Admin users cannot be permanently deleted for security reasons'
      })
    }

    // Delete the user
    await User.findByIdAndDelete(userId)

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
    console.error('Delete user error:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// Bulk user operations
router.post('/users/bulk-action', async (req, res) => {
  try {
    const { action, userIds } = req.body

    if (!action || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'Invalid bulk action parameters' })
    }

    let result = {}

    switch (action) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: true, updatedAt: new Date() }
        )
        break
      
      case 'deactivate':
        result = await User.updateMany(
          { _id: { $in: userIds }, role: { $ne: 'admin' } }, // Don't deactivate admins
          { isActive: false, updatedAt: new Date() }
        )
        break
      
      case 'delete':
        result = await User.deleteMany(
          { _id: { $in: userIds }, role: { $ne: 'admin' } } // Don't delete admins
        )
        break
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      affectedCount: result.modifiedCount || result.deletedCount
    })
  } catch (error) {
    console.error('Bulk action error:', error)
    res.status(500).json({ error: 'Failed to perform bulk action' })
  }
})

// Export users data
router.get('/users/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query
    
    const users = await User.find({ isActive: true })
      .select('-passwordHash')
      .sort({ role: 1, name: 1 })

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = 'Name,Email,Username,Role,Created At,Last Login,Status\n'
      const csvData = users.map(user => {
        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'
        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'
        const status = user.isActive ? 'Active' : 'Inactive'
        
        return `"${user.name}","${user.email}","${user.username}","${user.role}","${createdAt}","${lastLogin}","${status}"`
      }).join('\n')
      
      const filename = `voiceboard-users-${new Date().toISOString().split('T')[0]}.csv`
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Pragma', 'no-cache')
      
      // Add BOM for proper UTF-8 encoding in Excel
      res.write('\ufeff')
      res.send(csvHeaders + csvData)
    } else {
      res.json({
        success: true,
        data: users,
        exportedAt: new Date(),
        totalRecords: users.length
      })
    }
  } catch (error) {
    console.error('Export users error:', error)
    res.status(500).json({ error: 'Failed to export users' })
  }
})

// Get detailed user profile
router.get('/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params
    
    const user = await User.findById(userId).select('-passwordHash')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get additional user statistics
    const stats = {
      accountAge: Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24)),
      lastLoginDays: user.lastLogin ? Math.floor((new Date() - user.lastLogin) / (1000 * 60 * 60 * 24)) : null,
      loginCount: user.loginCount || 0
    }

    res.json({
      success: true,
      user,
      stats
    })
  } catch (error) {
    console.error('Get user profile error:', error)
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
})

// Admin activity logs
router.get('/activity-logs', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    
    // This would require an ActivityLog model, for now return mock data
    const mockLogs = [
      {
        id: '1',
        action: 'User Created',
        target: 'john.doe@example.com',
        adminId: req.admin._id,
        adminName: req.admin.name,
        timestamp: new Date(),
        details: 'Created new student account'
      },
      {
        id: '2',
        action: 'Password Reset',
        target: 'jane.smith@example.com',
        adminId: req.admin._id,
        adminName: req.admin.name,
        timestamp: new Date(Date.now() - 3600000),
        details: 'Reset password for teacher account'
      }
    ]

    res.json({
      success: true,
      logs: mockLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mockLogs.length,
        pages: Math.ceil(mockLogs.length / limit)
      }
    })
  } catch (error) {
    console.error('Get activity logs error:', error)
    res.status(500).json({ error: 'Failed to fetch activity logs' })
  }
})

module.exports = router
