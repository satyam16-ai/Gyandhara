const express = require('express')
const router = express.Router()
const { RoomClass, User, SessionParticipant } = require('../models')

// Get student attendance data
router.get('/attendance/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    // Find user
    const user = await User.findById(userId)
    if (!user || user.role !== 'student') {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      })
    }

    // Get all classes the student has joined
    const joinedClasses = await RoomClass.find({
      'attendees.userId': userId
    }).populate('teacherId', 'name')

    // Calculate attendance metrics
    let totalClasses = joinedClasses.length
    let classesAttended = 0
    let totalTimeSpent = 0
    let possibleTimeSpent = 0

    const attendanceDetails = []

    for (const classData of joinedClasses) {
      const attendee = classData.attendees.find(a => a.userId.toString() === userId)
      if (attendee) {
        const classDuration = classData.duration || 60 // default 60 minutes
        possibleTimeSpent += classDuration

        let actualTimeSpent = 0
        let attendancePercentage = 0

        // Calculate time spent based on join/leave times
        if (attendee.joinedAt && classData.status === 'completed') {
          const joinTime = new Date(attendee.joinedAt)
          const leaveTime = attendee.leftAt ? new Date(attendee.leftAt) : classData.endTime
          
          if (leaveTime) {
            actualTimeSpent = Math.max(0, (leaveTime - joinTime) / (1000 * 60)) // minutes
            attendancePercentage = Math.min(100, (actualTimeSpent / classDuration) * 100)
            
            // Mark as attended if student spent more than 50% of class time
            if (attendancePercentage >= 50) {
              classesAttended++
            }
          }
        } else if (classData.status === 'live') {
          // For live classes, calculate current time spent
          const joinTime = new Date(attendee.joinedAt)
          const now = new Date()
          actualTimeSpent = (now - joinTime) / (1000 * 60)
          attendancePercentage = Math.min(100, (actualTimeSpent / classDuration) * 100)
        }

        totalTimeSpent += actualTimeSpent

        attendanceDetails.push({
          classId: classData._id,
          roomId: classData.roomId,
          subject: classData.subject,
          topic: classData.topic,
          lectureNumber: classData.lectureNumber,
          teacher: classData.teacherId.name,
          scheduledDate: classData.scheduledDate,
          status: classData.status,
          duration: classDuration,
          timeSpent: Math.round(actualTimeSpent),
          attendancePercentage: Math.round(attendancePercentage),
          isPresent: attendancePercentage >= 50,
          joinedAt: attendee.joinedAt,
          leftAt: attendee.leftAt
        })
      }
    }

    const overallPercentage = totalClasses > 0 ? Math.round((classesAttended / totalClasses) * 100) : 0
    const classesAbsent = totalClasses - classesAttended

    res.json({
      success: true,
      attendance: {
        userId,
        userName: user.name,
        totalClasses,
        classesAttended,
        classesAbsent,
        overallPercentage,
        totalTimeSpent: Math.round(totalTimeSpent),
        possibleTimeSpent,
        attendanceDetails
      }
    })

  } catch (error) {
    console.error('Error fetching attendance:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance data'
    })
  }
})

// Update attendance when student joins/leaves class
router.post('/attendance/update', async (req, res) => {
  try {
    const { classId, userId, action, timestamp } = req.body

    if (!classId || !userId || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      })
    }

    const roomClass = await RoomClass.findById(classId)
    if (!roomClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      })
    }

    const attendeeIndex = roomClass.attendees.findIndex(a => a.userId.toString() === userId)
    
    if (attendeeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Student not enrolled in this class'
      })
    }

    if (action === 'join') {
      roomClass.attendees[attendeeIndex].joinedAt = timestamp || new Date()
    } else if (action === 'leave') {
      roomClass.attendees[attendeeIndex].leftAt = timestamp || new Date()
    }

    await roomClass.save()

    res.json({
      success: true,
      message: 'Attendance updated successfully'
    })

  } catch (error) {
    console.error('Error updating attendance:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update attendance'
    })
  }
})

module.exports = router
