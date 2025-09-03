require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { User } = require('../models')
const { connectDB } = require('../database')

async function initializeAdmin() {
  try {
    console.log('🔧 Initializing VoiceBoard Admin Account...')
    
    // Connect to database
    await connectDB()
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' })
    if (existingAdmin) {
      console.log('✅ Admin account already exists:', existingAdmin.username)
      process.exit(0)
    }
    
    // Create default admin
    const adminData = {
      username: 'admin',
      name: 'System Administrator',
      email: 'admin@voiceboard.com',
      passwordHash: await bcrypt.hash('admin123!', 12),
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      lastLogin: null
    }
    
    const admin = new User(adminData)
    await admin.save()
    
    console.log('🎉 Default admin account created successfully!')
    console.log('📋 Admin Credentials:')
    console.log('   Username: admin')
    console.log('   Password: admin123!')
    console.log('   Email: admin@voiceboard.com')
    console.log('')
    console.log('🔒 SECURITY NOTICE:')
    console.log('   - Change the default password immediately after first login')
    console.log('   - Access admin panel at: http://localhost:3000/admin-login')
    console.log('   - This account has full administrative privileges')
    console.log('')
    
  } catch (error) {
    console.error('❌ Error initializing admin account:', error.message)
    process.exit(1)
  } finally {
    mongoose.connection.close()
  }
}

// Run if called directly
if (require.main === module) {
  initializeAdmin()
}

module.exports = { initializeAdmin }
