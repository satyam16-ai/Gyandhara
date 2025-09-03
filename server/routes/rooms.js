const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const { ClassSession, User, SessionParticipant } = require('../models')

// Utility function to generate room ID
const generateRoomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Utility function to validate room password
const validateRoomPassword = (password) => {
  return password && password.length >= 4 && password.length <= 20
}

// Create a new room (Teachers only)
router.post('/create', async (req, res) => {
  try {
    const { 
      className, 
      title, 
      subject, 
      description, 
      roomPassword, 
      maxParticipants = 50,
      isPublic = false,
      settings = {}
    } = req.body

    // Validate required fields
    if (!className || !title || !roomPassword) {
      return res.status(400).json({
        error: 'Class name, title, and room password are required'
      })
    }

    // Validate password
    if (!validateRoomPassword(roomPassword)) {
      return res.status(400).json({
        error: 'Room password must be between 4-20 characters'
      })
    }

    // For now, we'll extract teacherId from the request
    // In a real app, this would come from JWT authentication
    const { teacherId } = req.body
    if (!teacherId) {
      return res.status(400).json({
        error: 'Teacher ID is required'
      })
    }

    // Verify teacher exists and has correct role
    const teacher = await User.findById(teacherId)
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({
        error: 'Invalid teacher or insufficient permissions'
      })
    }

    // Generate unique room ID
    let roomId
    let attempts = 0
    do {
      roomId = generateRoomId()
      const existingRoom = await ClassSession.findOne({ roomId })
      if (!existingRoom) break
      attempts++
    } while (attempts < 10)

    if (attempts >= 10) {
      return res.status(500).json({
        error: 'Failed to generate unique room ID. Please try again.'
      })
    }

    // Create room
    const room = new ClassSession({
      teacherId,
      roomId,
      roomPassword,
      className,
      title,
      subject,
      description,
      isPublic,
      maxParticipants: Math.min(Math.max(maxParticipants, 1), 500),
      settings: {
        allowChat: settings.allowChat !== false,
        allowHandRaise: settings.allowHandRaise !== false,
        allowWhiteboard: settings.allowWhiteboard !== false,
        allowAudio: settings.allowAudio !== false,
        recordSession: settings.recordSession !== false,
        allowStudentScreenShare: settings.allowStudentScreenShare || false,
        muteParticipantsOnJoin: settings.muteParticipantsOnJoin || false,
        requireApprovalToJoin: settings.requireApprovalToJoin || false
      },
      roomStatus: 'waiting'
    })

    await room.save()

    // Populate teacher info for response
    await room.populate('teacherId', 'name email')

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: {
        id: room._id,
        roomId: room.roomId,
        className: room.className,
        title: room.title,
        subject: room.subject,
        description: room.description,
        teacher: room.teacherId,
        maxParticipants: room.maxParticipants,
        isPublic: room.isPublic,
        settings: room.settings,
        roomStatus: room.roomStatus,
        createdAt: room.createdAt
      }
    })

  } catch (error) {
    console.error('Error creating room:', error)
    res.status(500).json({
      error: 'Failed to create room. Please try again.'
    })
  }
})

// Join a room (Students and Teachers)
router.post('/join', async (req, res) => {
  try {
    const { roomId, roomPassword, userId } = req.body

    // Validate required fields
    if (!roomId || !roomPassword || !userId) {
      return res.status(400).json({
        error: 'Room ID, password, and user ID are required'
      })
    }

    // Find the room
    const room = await ClassSession.findOne({ 
      roomId: roomId.toUpperCase(),
      isLive: true 
    }).populate('teacherId', 'name email')

    if (!room) {
      return res.status(404).json({
        error: 'Room not found or no longer active'
      })
    }

    // Check if room is ended
    if (room.roomStatus === 'ended') {
      return res.status(400).json({
        error: 'This room has ended'
      })
    }

    // Verify password
    if (room.roomPassword !== roomPassword) {
      return res.status(401).json({
        error: 'Invalid room password'
      })
    }

    // Verify user exists
    const user = await User.findById(userId)
    if (!user || !user.isActive) {
      return res.status(400).json({
        error: 'Invalid user or account not active'
      })
    }

    // Check if user is already in the room
    let participant = await SessionParticipant.findOne({
      sessionId: room._id,
      userId: userId
    })

    // Check room capacity (exclude teacher from count)
    const currentParticipants = await SessionParticipant.countDocuments({
      sessionId: room._id,
      isActive: true,
      userId: { $ne: room.teacherId }
    })

    if (!participant && currentParticipants >= room.maxParticipants && user.role !== 'teacher') {
      return res.status(400).json({
        error: 'Room is at maximum capacity'
      })
    }

    // Create or update participant record
    if (participant) {
      // User rejoining
      participant.isActive = true
      participant.leftAt = null
      participant.handRaised = false
      participant.handRaisedAt = null
      await participant.save()
    } else {
      // New participant
      participant = new SessionParticipant({
        sessionId: room._id,
        userId: userId,
        joinedAt: new Date(),
        bandwidthMode: user.preferences?.bandwidthMode || 'normal'
      })
      await participant.save()

      // Update room stats
      room.stats.totalParticipants += 1
      room.stats.currentParticipants = await SessionParticipant.countDocuments({
        sessionId: room._id,
        isActive: true
      })
      room.stats.maxConcurrentUsers = Math.max(
        room.stats.maxConcurrentUsers,
        room.stats.currentParticipants
      )
      await room.save()
    }

    // Set room to active if teacher joins and it's waiting
    if (user._id.toString() === room.teacherId._id.toString() && room.roomStatus === 'waiting') {
      room.roomStatus = 'active'
      await room.save()
    }

    res.json({
      success: true,
      message: 'Successfully joined room',
      room: {
        id: room._id,
        roomId: room.roomId,
        className: room.className,
        title: room.title,
        subject: room.subject,
        description: room.description,
        teacher: room.teacherId,
        settings: room.settings,
        roomStatus: room.roomStatus,
        currentParticipants: room.stats.currentParticipants,
        maxParticipants: room.maxParticipants
      },
      participant: {
        id: participant._id,
        joinedAt: participant.joinedAt,
        bandwidthMode: participant.bandwidthMode,
        isTeacher: user._id.toString() === room.teacherId._id.toString()
      }
    })

  } catch (error) {
    console.error('Error joining room:', error)
    res.status(500).json({
      error: 'Failed to join room. Please try again.'
    })
  }
})

// Leave a room
router.post('/leave', async (req, res) => {
  try {
    const { roomId, userId } = req.body

    if (!roomId || !userId) {
      return res.status(400).json({
        error: 'Room ID and user ID are required'
      })
    }

    // Find the room
    const room = await ClassSession.findOne({ roomId: roomId.toUpperCase() })
    if (!room) {
      return res.status(404).json({
        error: 'Room not found'
      })
    }

    // Find and update participant
    const participant = await SessionParticipant.findOne({
      sessionId: room._id,
      userId: userId,
      isActive: true
    })

    if (participant) {
      participant.isActive = false
      participant.leftAt = new Date()
      participant.handRaised = false
      participant.handRaisedAt = null
      await participant.save()

      // Update room current participants count
      room.stats.currentParticipants = await SessionParticipant.countDocuments({
        sessionId: room._id,
        isActive: true
      })
      await room.save()
    }

    res.json({
      success: true,
      message: 'Successfully left room'
    })

  } catch (error) {
    console.error('Error leaving room:', error)
    res.status(500).json({
      error: 'Failed to leave room'
    })
  }
})

// Get room details
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params

    const room = await ClassSession.findOne({ 
      roomId: roomId.toUpperCase(),
      isLive: true 
    }).populate('teacherId', 'name email profile')

    if (!room) {
      return res.status(404).json({
        error: 'Room not found'
      })
    }

    // Get current participants
    const participants = await SessionParticipant.find({
      sessionId: room._id,
      isActive: true
    }).populate('userId', 'name role profile')

    res.json({
      success: true,
      room: {
        id: room._id,
        roomId: room.roomId,
        className: room.className,
        title: room.title,
        subject: room.subject,
        description: room.description,
        teacher: room.teacherId,
        settings: room.settings,
        roomStatus: room.roomStatus,
        stats: room.stats,
        maxParticipants: room.maxParticipants,
        isPublic: room.isPublic,
        createdAt: room.createdAt,
        participants: participants.map(p => ({
          id: p._id,
          user: p.userId,
          joinedAt: p.joinedAt,
          handRaised: p.handRaised,
          handRaisedAt: p.handRaisedAt,
          bandwidthMode: p.bandwidthMode,
          connectionQuality: p.connectionQuality
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching room details:', error)
    res.status(500).json({
      error: 'Failed to fetch room details'
    })
  }
})

// Get teacher's rooms
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params
    const { status = 'all', limit = 20, page = 1 } = req.query

    // Build query
    const query = { teacherId }
    if (status !== 'all') {
      if (status === 'active') {
        query.isLive = true
        query.roomStatus = { $in: ['waiting', 'active', 'paused'] }
      } else if (status === 'ended') {
        query.roomStatus = 'ended'
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const rooms = await ClassSession.find(query)
      .populate('teacherId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await ClassSession.countDocuments(query)

    // Get participant counts for each room
    const roomsWithStats = await Promise.all(
      rooms.map(async (room) => {
        const currentParticipants = await SessionParticipant.countDocuments({
          sessionId: room._id,
          isActive: true
        })

        return {
          ...room.toObject(),
          currentParticipants
        }
      })
    )

    res.json({
      success: true,
      rooms: roomsWithStats,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: rooms.length,
        totalRooms: total
      }
    })

  } catch (error) {
    console.error('Error fetching teacher rooms:', error)
    res.status(500).json({
      error: 'Failed to fetch rooms'
    })
  }
})

// Update room settings (Teacher only)
router.put('/:roomId/settings', async (req, res) => {
  try {
    const { roomId } = req.params
    const { teacherId, settings } = req.body

    const room = await ClassSession.findOne({ 
      roomId: roomId.toUpperCase(),
      teacherId 
    })

    if (!room) {
      return res.status(404).json({
        error: 'Room not found or unauthorized'
      })
    }

    // Update settings
    Object.assign(room.settings, settings)
    await room.save()

    res.json({
      success: true,
      message: 'Room settings updated successfully',
      settings: room.settings
    })

  } catch (error) {
    console.error('Error updating room settings:', error)
    res.status(500).json({
      error: 'Failed to update room settings'
    })
  }
})

// End room (Teacher only)
router.post('/:roomId/end', async (req, res) => {
  try {
    const { roomId } = req.params
    const { teacherId } = req.body

    const room = await ClassSession.findOne({ 
      roomId: roomId.toUpperCase(),
      teacherId 
    })

    if (!room) {
      return res.status(404).json({
        error: 'Room not found or unauthorized'
      })
    }

    // End the room
    room.roomStatus = 'ended'
    room.isLive = false
    room.endTime = new Date()
    await room.save()

    // Mark all participants as inactive
    await SessionParticipant.updateMany(
      { sessionId: room._id, isActive: true },
      { 
        isActive: false, 
        leftAt: new Date(),
        handRaised: false,
        handRaisedAt: null
      }
    )

    res.json({
      success: true,
      message: 'Room ended successfully'
    })

  } catch (error) {
    console.error('Error ending room:', error)
    res.status(500).json({
      error: 'Failed to end room'
    })
  }
})

// Get available rooms for students
router.get('/student/available', async (req, res) => {
  try {
    // Get all active rooms that are public or can be joined
    const availableRooms = await ClassSession.find({
      roomStatus: { $in: ['waiting', 'active'] },
      $or: [
        { isPublic: true },
        { isPublic: false } // For now, include all rooms - add proper filtering later
      ]
    })
    .populate('teacherId', 'name email')
    .sort({ createdAt: -1 })
    .limit(50)

    // Format the response to match the expected structure
    const formattedRooms = availableRooms.map(room => ({
      id: room._id,
      roomId: room.roomId,
      className: room.className,
      title: room.title,
      subject: room.subject,
      description: room.description,
      teacher: {
        _id: room.teacherId._id,
        name: room.teacherId.name,
        email: room.teacherId.email
      },
      roomStatus: room.roomStatus,
      currentParticipants: room.currentParticipants || 0,
      maxParticipants: room.maxParticipants || 50,
      isPublic: room.isPublic,
      settings: room.settings || {},
      createdAt: room.createdAt
    }))

    res.json({
      success: true,
      rooms: formattedRooms
    })

  } catch (error) {
    console.error('Error fetching available rooms:', error)
    res.status(500).json({
      error: 'Failed to fetch available rooms'
    })
  }
})

module.exports = router
