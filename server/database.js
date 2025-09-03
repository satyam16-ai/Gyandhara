const mongoose = require('mongoose')
const config = require('./config')

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`)
    console.log(`📊 Database: ${conn.connection.name}`)
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err)
    })
    
    mongoose.connection.on('disconnected', () => {
      console.log('📴 MongoDB disconnected')
    })
    
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      console.log('🔌 MongoDB connection closed through app termination')
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message)
    process.exit(1)
  }
}

module.exports = { connectDB }
