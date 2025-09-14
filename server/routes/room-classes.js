const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { RoomClass, ClassSession, User, SessionParticipant } = require('../models')

// Get a specific class by ID
router.get('/:classId', async (req, res) => {
  try {
    const { classId } = req.params

    const roomClass = await RoomClass.findById(classId)
      .populate('teacherId', 'name email')

    if (!roomClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      })
    }

    res.json({
      success: true,
      class: roomClass
    })
  } catch (error) {
    console.error('Error fetching class:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch class'
    })
  }
})

// Get all classes for a room
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params
    const { status } = req.query

    let query = { roomId }
    if (status && status !== 'all') {
      query.status = status
    }

    const classes = await RoomClass.find(query)
      .populate('teacherId', 'name email')
      .sort({ lectureNumber: 1, scheduledDate: 1 })

    res.json({
      success: true,
      classes,
      count: classes.length
    })
  } catch (error) {
    console.error('Error fetching room classes:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room classes'
    })
  }
})

// Create a new class in a room
router.post('/create', async (req, res) => {
  try {
    const {
      roomId,
      teacherId,
      subject,
      lectureNumber,
      topic,
      description,
      scheduledDate
    } = req.body

    // Validate required fields
    if (!teacherId || !subject || !topic || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: teacherId, subject, topic, scheduledDate'
      })
    }

    // Generate roomId if not provided
    const finalRoomId = roomId || `ROOM-${Date.now().toString().slice(-6)}`

    // Verify teacher
    const teacher = await User.findById(teacherId)
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can create classes'
      })
    }

    // Auto-generate lecture number if not provided
    let finalLectureNumber = lectureNumber
    if (!finalLectureNumber) {
      const lastClass = await RoomClass.findOne({ roomId: finalRoomId })
        .sort({ lectureNumber: -1 })
      finalLectureNumber = lastClass ? lastClass.lectureNumber + 1 : 1
    }

    // Create new class (sessionId will be created when class starts)
    const newClass = new RoomClass({
      roomId: finalRoomId,
      // sessionId: null, // Will be created when class actually starts
      teacherId,
      lectureNumber: finalLectureNumber,
      subject,
      topic,
      description,
      scheduledDate: new Date(scheduledDate),
      status: 'scheduled',
      attendees: []
    })

    await newClass.save()

    // Populate teacher info
    await newClass.populate('teacherId', 'name email')

    res.status(201).json({
      success: true,
      class: newClass,
      message: 'Class created successfully'
    })

  } catch (error) {
    console.error('Error creating class:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create class'
    })
  }
})

// Update a class
router.put('/:classId', async (req, res) => {
  try {
    const { classId } = req.params
    const updates = req.body

    // Remove fields that shouldn't be updated directly
    delete updates._id
    delete updates.roomId
    delete updates.sessionId
    delete updates.lectureNumber
    delete updates.createdAt
    delete updates.updatedAt

    const updatedClass = await RoomClass.findByIdAndUpdate(
      classId,
      updates,
      { new: true, runValidators: true }
    ).populate('teacherId', 'name email')

    if (!updatedClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      })
    }

    res.json({
      success: true,
      class: updatedClass,
      message: 'Class updated successfully'
    })
  } catch (error) {
    console.error('Error updating class:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update class'
    })
  }
})

// Start a class (make it live)
router.post('/:classId/start', async (req, res) => {
  try {
    const { classId } = req.params

    const roomClass = await RoomClass.findById(classId)
    if (!roomClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      })
    }

    // Create a ClassSession if it doesn't exist
    if (!roomClass.sessionId) {
      // Generate a unique 8-character roomId for ClassSession (within 10 char limit)
      // Format: L{lectureNumber}{timestamp_last4}{random2}
      const timestamp4 = Date.now().toString().slice(-4)
      const random2 = Math.random().toString(36).substring(2, 4).toUpperCase()
      const shortRoomId = `L${roomClass.lectureNumber}${timestamp4}${random2}`
      
      const newSession = new ClassSession({
        teacherId: roomClass.teacherId,
        roomId: shortRoomId, // Use shorter roomId for ClassSession
        roomPassword: Math.random().toString(36).substring(2, 8).toUpperCase(), // Generate random password
        className: `${roomClass.subject} - ${roomClass.topic}`,
        title: roomClass.topic,
        subject: roomClass.subject,
        description: roomClass.description || `Live class for ${roomClass.subject}`,
        isLive: true,
        startTime: new Date(),
        bandwidthMode: 'normal'
      })
      await newSession.save()
      
      roomClass.sessionId = newSession._id
      console.log('📚 Created new session for class:', roomClass.sessionId, 'with short roomId:', newSession.roomId)
    }

    // Update class status to live
    roomClass.status = 'live'
    roomClass.startTime = new Date()
    await roomClass.save()

    // Populate teacher info and session info
    await roomClass.populate('teacherId', 'name email')
    await roomClass.populate('sessionId')

    res.json({
      success: true,
      class: roomClass,
      session: roomClass.sessionId,
      message: 'Class started successfully'
    })
  } catch (error) {
    console.error('Error starting class:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to start class'
    })
  }
})

// Join a class (student attendance)
router.post('/:classId/join', async (req, res) => {
  try {
    const { classId } = req.params
    const { userId } = req.body

    console.log('📋 Join class request:', { classId, userId })

    if (!userId) {
      console.log('❌ Missing userId in join request')
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      })
    }

    const roomClass = await RoomClass.findById(classId)
    if (!roomClass) {
      console.log('❌ Class not found:', classId)
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      })
    }

    console.log('🏫 Found class:', {
      id: roomClass._id,
      topic: roomClass.topic,
      sessionId: roomClass.sessionId,
      hasSessionId: !!roomClass.sessionId
    })

    // Find the associated session for whiteboard access
    const session = await ClassSession.findById(roomClass.sessionId)
    if (!session) {
      console.log('❌ Associated session not found for sessionId:', roomClass.sessionId)
      return res.status(404).json({
        success: false,
        error: 'Associated session not found'
      })
    }

    console.log('🎓 Found session:', {
      id: session._id,
      roomId: session.roomId,
      teacherId: session.teacherId,
      isLive: session.isLive
    })

    // Check if user is already in attendees
    const existingAttendee = roomClass.attendees.find(
      attendee => attendee.userId.toString() === userId
    )

    if (existingAttendee) {
      console.log('👤 Existing attendee found, updating join time')
      // Update join time for re-joining (user can rejoin to update their presence)
      existingAttendee.joinedAt = new Date()
      
      // If user is rejoining, don't clear leftAt time as we want to track total time
      await roomClass.save()
      
      // Ensure SessionParticipant record exists for whiteboard access
      console.log('🔄 Creating/updating SessionParticipant for existing attendee:', {
        sessionId: session._id,
        userId: userId
      })
      
      const participant = await SessionParticipant.findOneAndUpdate(
        { sessionId: session._id, userId: new mongoose.Types.ObjectId(userId) },
        {
          sessionId: session._id,
          userId: new mongoose.Types.ObjectId(userId),
          isActive: true,
          joinedAt: new Date(),
          bandwidthMode: 'normal'
        },
        { upsert: true, new: true }
      )
      
      console.log('✅ SessionParticipant created/updated:', participant._id)
      
      const rejoinResponse = {
        success: true,
        message: 'Successfully rejoined class',
        attendeeCount: roomClass.attendees.length,
        isRejoining: true,
        sessionParticipantId: participant._id,
        sessionRoomId: session.roomId // Include the ClassSession roomId for WebSocket connection
      }
      
      console.log('📤 Sending rejoin response:', rejoinResponse)
      return res.json(rejoinResponse)
    }

    console.log('➕ Adding new attendee to class')
    
    // Add user to attendees with initial join time
    roomClass.attendees.push({
      userId,
      joinedAt: new Date(),
      attendancePercentage: 0 // Will be calculated when user leaves or class ends
    })

    // Update stats
    roomClass.stats.totalAttendees = roomClass.attendees.length

    // Create SessionParticipant record for whiteboard access
    console.log('🔄 Creating SessionParticipant for new attendee:', {
      sessionId: session._id,
      userId: userId
    })
    
    const participant = await SessionParticipant.findOneAndUpdate(
      { sessionId: session._id, userId: new mongoose.Types.ObjectId(userId) },
      {
        sessionId: session._id,
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        joinedAt: new Date(),
        bandwidthMode: 'normal'
      },
      { upsert: true, new: true }
    )

    console.log('✅ SessionParticipant created:', participant._id)

    await roomClass.save()

    const response = {
      success: true,
      message: 'Successfully joined class',
      attendeeCount: roomClass.attendees.length,
      sessionParticipantId: participant._id,
      sessionRoomId: session.roomId // Include the ClassSession roomId for WebSocket connection
    }
    
    console.log('📤 Sending join response:', response)
    res.json(response)
  } catch (error) {
    console.error('Error joining class:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to join class'
    })
  }
})

// Leave a class (student leaves)
router.post('/:classId/leave', async (req, res) => {
  try {
    const { classId } = req.params
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      })
    }

    const roomClass = await RoomClass.findById(classId)
    if (!roomClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      })
    }

    // Find the attendee
    const attendeeIndex = roomClass.attendees.findIndex(
      attendee => attendee.userId.toString() === userId
    )

    if (attendeeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Student not found in class attendees'
      })
    }

    // Update leave time and calculate attendance
    const attendee = roomClass.attendees[attendeeIndex]
    attendee.leftAt = new Date()

    // Calculate time spent and attendance percentage
    if (attendee.joinedAt) {
      const timeSpentMs = attendee.leftAt - new Date(attendee.joinedAt)
      const timeSpentMinutes = timeSpentMs / (1000 * 60)
      const classDuration = roomClass.duration || 60 // default 60 minutes
      
      attendee.attendancePercentage = Math.min(100, Math.round((timeSpentMinutes / classDuration) * 100))
    }

    // Update SessionParticipant to inactive
    if (roomClass.sessionId) {
      await SessionParticipant.findOneAndUpdate(
        { sessionId: roomClass.sessionId, userId: userId },
        {
          isActive: false,
          leftAt: new Date()
        }
      )
    }

    await roomClass.save()

    res.json({
      success: true,
      message: 'Successfully left class',
      attendancePercentage: attendee.attendancePercentage
    })

  } catch (error) {
    console.error('Error leaving class:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to leave class'
    })
  }
})

// Delete a class
router.delete('/:classId', async (req, res) => {
  try {
    const { classId } = req.params

    const roomClass = await RoomClass.findById(classId)
    if (!roomClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      })
    }

    // Only allow deletion if class hasn't started yet
    if (roomClass.status === 'live' || roomClass.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete a class that has already started or completed'
      })
    }

    await RoomClass.findByIdAndDelete(classId)

    res.json({
      success: true,
      message: 'Class deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting class:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete class'
    })
  }
})

// Get teacher's upcoming classes
router.get('/teacher/:teacherId/upcoming', async (req, res) => {
  try {
    const { teacherId } = req.params
    const { limit = 10 } = req.query

    const upcomingClasses = await RoomClass.find({
      teacherId,
      status: { $in: ['scheduled', 'live'] },
      scheduledDate: { $gte: new Date() }
    })
    .populate('sessionId', 'className roomId')
    .sort({ scheduledDate: 1 })
    .limit(parseInt(limit))

    res.json({
      success: true,
      classes: upcomingClasses,
      count: upcomingClasses.length
    })
  } catch (error) {
    console.error('Error fetching upcoming classes:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming classes'
    })
  }
})

//End a class (teacher ends the class)
router.post('/:classId/end', async (req, res) => {
  try {
    const { classId } = req.params
    const { teacherId, message } = req.body

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        error: 'Teacher ID is required'
      })
    }

    const roomClass = await RoomClass.findById(classId)
    if (!roomClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      })
    }

    // Check if user is the teacher - convert both to strings for comparison
    if (roomClass.teacherId.toString() !== teacherId.toString()) {
      console.log('❌ Teacher ID mismatch:', {
        roomClassTeacherId: roomClass.teacherId.toString(),
        providedTeacherId: teacherId.toString(),
        match: roomClass.teacherId.toString() === teacherId.toString()
      })
      return res.status(403).json({
        success: false,
        error: 'Only the teacher can end the class'
      })
    }

    // Update class status and end time
    roomClass.status = 'completed'
    roomClass.endTime = new Date()

    // Calculate final attendance for all attendees
    if (roomClass.startTime) {
      const actualDuration = roomClass.endTime - new Date(roomClass.startTime)
      const actualDurationMinutes = actualDuration / (1000 * 60)

      roomClass.attendees.forEach(attendee => {
        if (attendee.joinedAt) {
          const leaveTime = attendee.leftAt || roomClass.endTime
          const timeSpentMs = leaveTime - new Date(attendee.joinedAt)
          const timeSpentMinutes = timeSpentMs / (1000 * 60)
          
          // Student is present if they spent more than 50% of the actual class time
          attendee.attendancePercentage = Math.min(100, Math.round((timeSpentMinutes / actualDurationMinutes) * 100))
          attendee.isPresent = attendee.attendancePercentage >= 50
          
          if (!attendee.leftAt) {
            attendee.leftAt = roomClass.endTime
          }
        }
      })
    }

    // Update associated session
    if (roomClass.sessionId) {
      const session = await ClassSession.findById(roomClass.sessionId)
      if (session) {
        session.isLive = false
        session.endTime = new Date()
        await session.save()
      }

      // Update all SessionParticipants to inactive
      await SessionParticipant.updateMany(
        { sessionId: roomClass.sessionId },
        {
          isActive: false,
          leftAt: roomClass.endTime
        }
      )
    }

    await roomClass.save()

    // Broadcast class ended event to all connected clients via socket
    const io = req.app.get('io')
    if (io) {
      // Emit to the specific room/session
      io.to(roomClass.sessionId.toString()).emit('class-ended', {
        classId: classId,
        roomId: roomClass.roomId,
        teacherId: teacherId, // Include teacherId to identify who ended the class
        message: message || 'Class has been ended by the teacher',
        endedAt: roomClass.endTime.toISOString(),
        redirectTo: '/student-dashboard'
      })
      
      // Also emit teacher ended class event for socket handling
      io.to(roomClass.sessionId.toString()).emit('teacher-ended-class', {
        classId: classId,
        roomId: roomClass.roomId,
        teacherId: teacherId, // Include teacherId for consistency
        message: message || 'Class has been ended by the teacher'
      })
      
      console.log('🛑 Class ended event broadcasted to room:', roomClass.sessionId.toString())
    }

    res.json({
      success: true,
      message: 'Class ended successfully',
      finalAttendance: roomClass.attendees.map(a => ({
        userId: a.userId,
        attendancePercentage: a.attendancePercentage,
        isPresent: a.isPresent || false
      }))
    })

  } catch (error) {
    console.error('Error ending class:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to end class'
    })
  }
})

module.exports = router
