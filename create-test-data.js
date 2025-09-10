#!/usr/bin/env node

/**
 * Script to create test data for whiteboard testing
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to the database
mongoose.connect('mongodb://localhost:27017/voiceboard_db');

// Import models
const { User, Classroom, RoomClass, ClassSession, SessionParticipant } = require('./server/models');

async function createTestData() {
  try {
    console.log('🏗️  Creating test data...\n');

    // Create admin user
    const adminHash = await bcrypt.hash('admin123', 10);
    const admin = await User.findOneAndUpdate(
      { username: 'admin' },
      {
        name: 'Admin User',
        email: 'admin@voiceboard.com',
        username: 'admin',
        passwordHash: adminHash,
        role: 'admin',
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('👤 Admin created:', admin.name);

    // Create teacher user
    const teacherHash = await bcrypt.hash('teacher123', 10);
    const teacher = await User.findOneAndUpdate(
      { username: 'teacher' },
      {
        name: 'Test Teacher',
        email: 'teacher@test.com',
        username: 'teacher',
        passwordHash: teacherHash,
        role: 'teacher',
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('🎓 Teacher created:', teacher.name);

    // Create student user
    const studentHash = await bcrypt.hash('student123', 10);
    const student = await User.findOneAndUpdate(
      { username: 'student' },
      {
        name: 'Test Student',
        email: 'student@test.com',
        username: 'student',
        passwordHash: studentHash,
        role: 'student',
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('🎒 Student created:', student.name);

    // Create classroom
    const classroom = await Classroom.findOneAndUpdate(
      { name: 'Test Classroom' },
      {
        name: 'Test Classroom',
        description: 'Test classroom for whiteboard',
        classroomCode: 'TEST123',
        teacherId: teacher._id,
        students: [student._id]
      },
      { upsert: true, new: true }
    );
    console.log('🏫 Classroom created:', classroom.name);

    // Create a room class (lecture)
    const roomClass = await RoomClass.findOneAndUpdate(
      { topic: 'Test Whiteboard Lecture' },
      {
        teacherId: teacher._id,
        classroomId: classroom._id,
        topic: 'Test Whiteboard Lecture',
        subject: 'Computer Science',
        description: 'Test lecture for whiteboard functionality',
        roomId: 'TEST001',
        status: 'live',
        startTime: new Date(),
        scheduledDate: new Date(),
        lectureNumber: 1,
        attendees: [
          {
            userId: student._id,
            joinedAt: new Date(),
            attendancePercentage: 100
          }
        ],
        stats: {
          totalAttendees: 1
        }
      },
      { upsert: true, new: true }
    );
    console.log('📚 Room class created:', roomClass.topic);

    // Create class session
    const session = await ClassSession.findOneAndUpdate(
      { roomId: 'TEST001' },
      {
        teacherId: teacher._id,
        roomId: 'TEST001',
        roomPassword: 'TEST123',
        className: 'Computer Science - Test Whiteboard Lecture',
        title: 'Test Whiteboard Lecture',
        subject: 'Computer Science',
        description: 'Test session for whiteboard functionality',
        isLive: true,
        startTime: new Date(),
        bandwidthMode: 'normal'
      },
      { upsert: true, new: true }
    );
    console.log('🎓 Session created:', session.roomId);

    // Link session to room class
    roomClass.sessionId = session._id;
    await roomClass.save();
    console.log('🔗 Linked session to room class');

    // Create session participant for student
    const participant = await SessionParticipant.findOneAndUpdate(
      { sessionId: session._id, userId: student._id },
      {
        sessionId: session._id,
        userId: student._id,
        isActive: true,
        joinedAt: new Date(),
        bandwidthMode: 'normal'
      },
      { upsert: true, new: true }
    );
    console.log('👥 Session participant created:', participant._id);

    console.log('\n✅ Test data created successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('Admin: admin / admin123');
    console.log('Teacher: teacher / teacher123');
    console.log('Student: student / student123');
    console.log('\n🏫 Test Data:');
    console.log('Room ID: TEST001');
    console.log('Classroom Code: TEST123');
    console.log('Session ID:', session._id);
    console.log('Student ID:', student._id);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
createTestData();
