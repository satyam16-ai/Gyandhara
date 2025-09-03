const express = require('express')
const router = express.Router()
const { RoomClass, ClassSession, User, SessionParticipant } = require('../models')

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
    if (!roomId || !teacherId || !subject || !topic || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: roomId, teacherId, subject, topic, scheduledDate'
      })
    }

    // Check if room exists (look for ClassSession with this roomId)
    const session = await ClassSession.findOne({ roomId: roomId })
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      })
    }

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
      const lastClass = await RoomClass.findOne({ roomId })
        .sort({ lectureNumber: -1 })
      finalLectureNumber = lastClass ? lastClass.lectureNumber + 1 : 1
    }

    // Create new class
    const newClass = new RoomClass({
      roomId,
      sessionId: session._id, // Link to the room's session
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

    // Update class status to live
    roomClass.status = 'live'
    roomClass.startTime = new Date()
    await roomClass.save()

    // Populate teacher info
    await roomClass.populate('teacherId', 'name email')

    res.json({
      success: true,
      class: roomClass,
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

// End a class
router.post('/:classId/end', async (req, res) => {
  try {
    const { classId } = req.params

    const roomClass = await RoomClass.findById(classId)
    if (!roomClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      })
    }

    // Update class status to completed
    roomClass.status = 'completed'
    roomClass.endTime = new Date()
    
    // Calculate actual duration if class was started
    if (roomClass.startTime) {
      const actualDuration = Math.round((roomClass.endTime - roomClass.startTime) / (1000 * 60))
      roomClass.duration = actualDuration
    }

    await roomClass.save()

    // Also end the associated session
    if (roomClass.sessionId) {
      const session = await ClassSession.findById(roomClass.sessionId)
      if (session) {
        session.isLive = false
        session.endTime = new Date()
        await session.save()
      }
    }

    // Populate teacher info
    await roomClass.populate('teacherId', 'name email')

    res.json({
      success: true,
      class: roomClass,
      message: 'Class ended successfully'
    })
  } catch (error) {
    console.error('Error ending class:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to end class'
    })
  }
})

// Join a class (student attendance)
router.post('/:classId/join', async (req, res) => {
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

    // Find the associated session for whiteboard access
    const session = await ClassSession.findById(roomClass.sessionId)
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Associated session not found'
      })
    }

    // Check if user is already in attendees
    const existingAttendee = roomClass.attendees.find(
      attendee => attendee.userId.toString() === userId
    )

    if (existingAttendee) {
      // Update join time for re-joining (user can rejoin to update their presence)
      existingAttendee.joinedAt = new Date()
      
      // If user is rejoining, don't clear leftAt time as we want to track total time
      await roomClass.save()
      
      // Ensure SessionParticipant record exists for whiteboard access
      await SessionParticipant.findOneAndUpdate(
        { sessionId: session._id, userId: userId },
        {
          sessionId: session._id,
          userId: userId,
          isActive: true,
          joinedAt: new Date(),
          bandwidthMode: 'normal'
        },
        { upsert: true, new: true }
      )
      
      return res.json({
        success: true,
        message: 'Successfully rejoined class',
        attendeeCount: roomClass.attendees.length,
        isRejoining: true
      })
    }

    // Add user to attendees with initial join time
    roomClass.attendees.push({
      userId,
      joinedAt: new Date(),
      attendancePercentage: 0 // Will be calculated when user leaves or class ends
    })

    // Update stats
    roomClass.stats.totalAttendees = roomClass.attendees.length

    // Create SessionParticipant record for whiteboard access
    await SessionParticipant.findOneAndUpdate(
      { sessionId: session._id, userId: userId },
      {
        sessionId: session._id,
        userId: userId,
        isActive: true,
        joinedAt: new Date(),
        bandwidthMode: 'normal'
      },
      { upsert: true, new: true }
    )

    await roomClass.save()

    res.json({
      success: true,
      message: 'Successfully joined class',
      attendeeCount: roomClass.attendees.length
    })
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

    // Check if user is the teacher
    if (roomClass.teacherId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the teacher can end the class'
      })
    }

    // Update class status and end time
    roomClass.status = 'ended'
    roomClass.endTime = new Date()

    // Calculate final attendance for all attendees
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

    // Update all SessionParticipants to inactive
    if (roomClass.sessionId) {
      await SessionParticipant.updateMany(
        { sessionId: roomClass.sessionId },
        {
          isActive: false,
          leftAt: roomClass.endTime
        }
      )
    }

    await roomClass.save()

    // Broadcast class ended event to all connected clients
    if (req.app.get('io')) {
      req.app.get('io').emit('class-ended', {
        classId: classId,
        roomId: roomClass.roomId,
        message: 'Class has been ended by the teacher'
      })
    }

    res.json({
      success: true,
      message: 'Class ended successfully',
      finalAttendance: roomClass.attendees.map(a => ({
        userId: a.userId,
        attendancePercentage: a.attendancePercentage,
        isPresent: a.isPresent
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
