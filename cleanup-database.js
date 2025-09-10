#!/usr/bin/env node

// Database Cleanup Script - Keep only admin data
// This script will remove all data except admin users

const mongoose = require('mongoose');
const { connectDB } = require('./server/database');
const { 
  User, 
  ClassSession, 
  Stroke, 
  AudioChunk, 
  ChatMessage, 
  SessionParticipant,
  Classroom,
  StudentEnrollment,
  RoomClass
} = require('./server/models');

async function cleanDatabase() {
  try {
    console.log('🧹 Starting database cleanup...');
    console.log('=================================');

    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Get current admin users before cleanup
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`📊 Found ${adminUsers.length} admin user(s) to preserve`);
    
    adminUsers.forEach(admin => {
      console.log(`   - ${admin.username} (${admin.name})`);
    });

    console.log('\n🗑️ Cleaning collections...');

    // 1. Remove all non-admin users
    const deletedUsers = await User.deleteMany({ 
      role: { $ne: 'admin' } 
    });
    console.log(`✅ Removed ${deletedUsers.deletedCount} non-admin users`);

    // 2. Clear all sessions
    const deletedSessions = await ClassSession.deleteMany({});
    console.log(`✅ Removed ${deletedSessions.deletedCount} class sessions`);

    // 3. Clear all strokes (whiteboard data)
    const deletedStrokes = await Stroke.deleteMany({});
    console.log(`✅ Removed ${deletedStrokes.deletedCount} strokes`);

    // 4. Clear all audio chunks
    const deletedAudio = await AudioChunk.deleteMany({});
    console.log(`✅ Removed ${deletedAudio.deletedCount} audio chunks`);

    // 5. Clear all chat messages
    const deletedMessages = await ChatMessage.deleteMany({});
    console.log(`✅ Removed ${deletedMessages.deletedCount} chat messages`);

    // 6. Clear all session participants
    const deletedParticipants = await SessionParticipant.deleteMany({});
    console.log(`✅ Removed ${deletedParticipants.deletedCount} session participants`);

    // 7. Clear all classrooms
    const deletedClassrooms = await Classroom.deleteMany({});
    console.log(`✅ Removed ${deletedClassrooms.deletedCount} classrooms`);

    // 8. Clear all student enrollments
    const deletedEnrollments = await StudentEnrollment.deleteMany({});
    console.log(`✅ Removed ${deletedEnrollments.deletedCount} student enrollments`);

    // 9. Clear all room classes (lectures)
    const deletedRoomClasses = await RoomClass.deleteMany({});
    console.log(`✅ Removed ${deletedRoomClasses.deletedCount} room classes`);

    console.log('\n📊 Final database state:');
    
    // Show final counts
    const finalUserCount = await User.countDocuments();
    const finalAdminCount = await User.countDocuments({ role: 'admin' });
    const finalSessionCount = await ClassSession.countDocuments();
    const finalClassroomCount = await Classroom.countDocuments();
    
    console.log(`   - Total Users: ${finalUserCount} (${finalAdminCount} admins)`);
    console.log(`   - Class Sessions: ${finalSessionCount}`);
    console.log(`   - Classrooms: ${finalClassroomCount}`);
    console.log(`   - Strokes: ${await Stroke.countDocuments()}`);
    console.log(`   - Audio Chunks: ${await AudioChunk.countDocuments()}`);
    console.log(`   - Chat Messages: ${await ChatMessage.countDocuments()}`);
    console.log(`   - Participants: ${await SessionParticipant.countDocuments()}`);
    console.log(`   - Enrollments: ${await StudentEnrollment.countDocuments()}`);
    console.log(`   - Room Classes: ${await RoomClass.countDocuments()}`);

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('✅ Admin data preserved');
    console.log('✅ All other data removed');
    console.log('✅ Database is now clean and ready for fresh data');

    // Close connection
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run cleanup
console.log('🚨 VoiceBoard Database Cleanup');
console.log('==============================');
console.log('⚠️  This will remove ALL data except admin users!');
console.log('⚠️  Make sure this is what you want to do.');
console.log('');

// Add a 3-second delay for safety
console.log('Starting cleanup in 3 seconds...');
setTimeout(() => {
  cleanDatabase();
}, 3000);
