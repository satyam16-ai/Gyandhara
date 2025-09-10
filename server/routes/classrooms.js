const express = require('express')
const router = express.Router()
const { Classroom, RoomClass, User } = require('../models')

// Startup logs to verify load
console.log('🧭 classrooms.js: loading router module')

// Trace middleware for all /api/classrooms requests
router.use((req, res, next) => {
  console.log(`📥 [classrooms] ${req.method} ${req.originalUrl || req.path}`)
  next()
})

// Generate unique classroom code
function generateClassroomCode() {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Create classroom
router.post('/create', async (req, res) => {
  try {
    const { name, subject, description, teacherId, teacherName } = req.body
    if (!name || !teacherId) {
      return res.status(400).json({ success: false, error: 'Name and teacher ID are required' })
    }

    // Generate unique classroom code
    let classroomCode
    let isUnique = false
    while (!isUnique) {
      classroomCode = generateClassroomCode()
      const existingClassroom = await Classroom.findOne({ classroomCode })
      if (!existingClassroom) isUnique = true
    }

    const classroom = new Classroom({
      name,
      subject,
      description,
      classroomCode,
      teacherId,
      teacherName,
      enrolledStudents: [],
      stats: { totalLectures: 0, totalStudents: 0, totalHours: 0, averageAttendance: 0 }
    })
    await classroom.save()

    res.json({ success: true, classroom, message: 'Classroom created successfully' })
  } catch (error) {
    console.error('Error creating classroom:', error)
    res.status(500).json({ success: false, error: 'Failed to create classroom' })
  }
})

// Get all classrooms for a teacher
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params
    const classrooms = await Classroom.find({ teacherId }).sort({ createdAt: -1 })

    // Get lectures for each classroom
    const classroomsWithLectures = await Promise.all(
      classrooms.map(async (classroom) => {
        const lectures = await RoomClass.find({ classroomId: classroom._id }).sort({ lectureNumber: 1 })
        return { ...classroom.toObject(), lectures }
      })
    )

    res.json({ success: true, classrooms: classroomsWithLectures, message: 'Classrooms retrieved successfully' })
  } catch (error) {
    console.error('Error fetching teacher classrooms:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch classrooms' })
  }
})

// Get all classrooms for a student (enrolled)
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params
    const classrooms = await Classroom.find({ 'enrolledStudents.userId': studentId }).sort({ createdAt: -1 })

    const classroomsWithLectures = await Promise.all(
      classrooms.map(async (classroom) => {
        const lectures = await RoomClass.find({ classroomId: classroom._id }).sort({ lectureNumber: 1 })
        
        // Find the enrolled student to get attendance stats
        const enrolledStudent = classroom.enrolledStudents.find(student => 
          student.userId.toString() === studentId
        )
        
        // Default attendance stats if not found
        const attendanceStats = {
          totalLecturesAttended: 0,
          totalLecturesScheduled: lectures.length,
          attendancePercentage: 0
        }
        
        return { 
          ...classroom.toObject(), 
          lectures, 
          enrollmentStatus: 'enrolled',
          attendanceStats
        }
      })
    )

    res.json({ success: true, classrooms: classroomsWithLectures, message: 'Student classrooms retrieved successfully' })
  } catch (error) {
    console.error('Error fetching student classrooms:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch student classrooms' })
  }
})

// Get classroom details
router.get('/:classroomId/details', async (req, res) => {
  try {
    const { classroomId } = req.params
    const classroom = await Classroom.findById(classroomId)
    if (!classroom) {
      return res.status(404).json({ success: false, error: 'Classroom not found' })
    }

    const lectures = await RoomClass.find({ classroomId }).sort({ lectureNumber: 1 })
    const detailedClassroom = { ...classroom.toObject(), lectures }
    res.json({ success: true, classroom: detailedClassroom, message: 'Classroom details retrieved successfully' })
  } catch (error) {
    console.error('Error fetching classroom details:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch classroom details' })
  }
})

// List lectures in a classroom (optional status filter)
router.get('/:classroomId/lectures', async (req, res) => {
  try {
    const { classroomId } = req.params
    const { status } = req.query

    const query = { classroomId }
    if (status && status !== 'all') {
      query.status = status
    }

    const lectures = await RoomClass.find(query).sort({ lectureNumber: 1, scheduledDate: 1 })
    res.json({ success: true, lectures, count: lectures.length })
  } catch (error) {
    console.error('Error listing lectures:', error)
    res.status(500).json({ success: false, error: 'Failed to list lectures' })
  }
})

// Create lecture in classroom
router.post('/:classroomId/lectures', async (req, res) => {
  try {
    const { classroomId } = req.params
    const { topic, description, scheduledDate, duration, teacherId } = req.body
    const classroom = await Classroom.findById(classroomId)
    if (!classroom) {
      return res.status(404).json({ success: false, error: 'Classroom not found' })
    }
    const existingLectures = await RoomClass.find({ classroomId })
    const lectureNumber = existingLectures.length + 1
    const roomId = `room_${classroomId}_${lectureNumber}_${Date.now()}`
    const lecture = new RoomClass({
      roomId,
      classroomId,
      classroomCode: classroom.classroomCode,
      lectureNumber,
      subject: classroom.subject || classroom.name,
      topic,
      description,
      scheduledDate: new Date(scheduledDate),
      duration,
      teacherId,
      status: 'scheduled'
    })
    await lecture.save()
    res.json({ success: true, lecture, message: 'Lecture created successfully' })
  } catch (error) {
    console.error('Error creating lecture:', error)
    res.status(500).json({ success: false, error: 'Failed to create lecture' })
  }
})

// Join classroom (for students)
router.post('/join', async (req, res) => {
  try {
    const { classroomCode, studentId } = req.body
    console.log('🎫 Join classroom request:', { classroomCode, studentId })
    if (!classroomCode || !studentId) {
      return res.status(400).json({ success: false, error: 'Classroom code and student ID are required' })
    }

    const classroom = await Classroom.findOne({ classroomCode })
    if (!classroom) {
      return res.status(404).json({ success: false, error: 'Classroom not found' })
    }

    const isAlreadyEnrolled = classroom.enrolledStudents.some(s => s.userId.toString() === studentId)
    if (isAlreadyEnrolled) {
      return res.status(400).json({ success: false, error: 'Student is already enrolled in this classroom' })
    }

    const student = await User.findById(studentId)
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' })
    }

    classroom.enrolledStudents.push({
      userId: studentId,
      studentName: student.name,
      enrolledAt: new Date(),
      status: 'active'
    })
    await classroom.save()

    res.json({ success: true, classroom, message: 'Successfully joined classroom' })
  } catch (error) {
    console.error('Error joining classroom:', error)
    res.status(500).json({ success: false, error: 'Failed to join classroom' })
  }
})

console.log('✅ classrooms.js: routes registered (create, teacher, student, details, lectures[list|create], join)')
module.exports = router
