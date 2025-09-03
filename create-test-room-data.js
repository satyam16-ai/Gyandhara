const mongoose = require('mongoose')
const { User, ClassSession, RoomClass } = require('./server/models')

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/voiceboard', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    console.log('Connected to MongoDB')

    // Find existing teacher
    let teacher = await User.findOne({ role: 'teacher' })
    if (!teacher) {
      // Create a test teacher
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash('teacher123', 10)
      
      teacher = new User({
        name: 'Dr. John Smith',
        email: 'teacher@test.com',
        username: 'teacher123',
        passwordHash: hashedPassword,
        role: 'teacher',
        isActive: true,
        profile: {
          subject: 'Mathematics',
          institution: 'Gyaandhara Academy'
        }
      })
      await teacher.save()
      console.log('Created test teacher:', teacher.name)
    } else {
      console.log('Using existing teacher:', teacher.name)
    }

    // Create test rooms (ClassSessions)
    const testRooms = [
      {
        roomId: 'MATH101',
        roomPassword: 'pass123',
        className: 'Advanced Mathematics',
        title: 'Calculus and Linear Algebra',
        subject: 'Mathematics',
        description: 'Learn advanced mathematical concepts',
        teacherId: teacher._id,
        isPublic: true,
        maxParticipants: 30,
        roomStatus: 'active'
      },
      {
        roomId: 'SCI202',
        roomPassword: 'science',
        className: 'Physics Fundamentals',
        title: 'Classical Mechanics',
        subject: 'Physics',
        description: 'Introduction to Physics principles',
        teacherId: teacher._id,
        isPublic: true,
        maxParticipants: 25,
        roomStatus: 'waiting'
      },
      {
        roomId: 'ENG303',
        roomPassword: 'english',
        className: 'English Literature',
        title: 'Modern Poetry',
        subject: 'English',
        description: 'Explore contemporary poetry',
        teacherId: teacher._id,
        isPublic: true,
        maxParticipants: 20,
        roomStatus: 'active'
      }
    ]

    // Create or update rooms
    for (const roomData of testRooms) {
      let room = await ClassSession.findOne({ roomId: roomData.roomId })
      if (!room) {
        room = new ClassSession(roomData)
        await room.save()
        console.log('Created room:', roomData.roomId)
      } else {
        console.log('Room already exists:', roomData.roomId)
      }

      // Create test classes for each room
      const testClasses = [
        {
          roomId: roomData.roomId,
          sessionId: room._id,
          teacherId: teacher._id,
          lectureNumber: 1,
          subject: roomData.subject,
          topic: `Introduction to ${roomData.subject}`,
          description: `Basic concepts and fundamentals of ${roomData.subject}`,
          status: 'scheduled',
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          duration: 60,
          attendees: []
        },
        {
          roomId: roomData.roomId,
          sessionId: room._id,
          teacherId: teacher._id,
          lectureNumber: 2,
          subject: roomData.subject,
          topic: `Advanced ${roomData.subject} Concepts`,
          description: `Deep dive into ${roomData.subject} principles`,
          status: 'live',
          scheduledDate: new Date(),
          startTime: new Date(),
          duration: 90,
          attendees: []
        },
        {
          roomId: roomData.roomId,
          sessionId: room._id,
          teacherId: teacher._id,
          lectureNumber: 3,
          subject: roomData.subject,
          topic: `${roomData.subject} Applications`,
          description: `Real-world applications of ${roomData.subject}`,
          status: 'completed',
          scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 23 * 60 * 60 * 1000),
          duration: 60,
          attendees: []
        }
      ]

      for (const classData of testClasses) {
        const existingClass = await RoomClass.findOne({
          roomId: classData.roomId,
          lectureNumber: classData.lectureNumber
        })

        if (!existingClass) {
          const newClass = new RoomClass(classData)
          await newClass.save()
          console.log(`Created class: ${classData.subject} - Lecture ${classData.lectureNumber}`)
        } else {
          console.log(`Class already exists: ${classData.subject} - Lecture ${classData.lectureNumber}`)
        }
      }
    }

    // Create a test student
    let student = await User.findOne({ role: 'student' })
    if (!student) {
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash('student123', 10)
      
      student = new User({
        name: 'Alice Johnson',
        email: 'student@test.com',
        username: 'student123',
        passwordHash: hashedPassword,
        role: 'student',
        isActive: true,
        profile: {
          institution: 'Gyaandhara Academy'
        }
      })
      await student.save()
      console.log('Created test student:', student.name)
    } else {
      console.log('Using existing student:', student.name)
    }

    console.log('\n✅ Test data created successfully!')
    console.log('🎓 Teacher login: teacher@test.com / teacher123')
    console.log('👨‍🎓 Student login: student@test.com / student123')
    console.log('🏠 Rooms created: MATH101, SCI202, ENG303')
    console.log('📚 Classes created for each room with different statuses')

  } catch (error) {
    console.error('Error creating test data:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

createTestData()
