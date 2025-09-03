const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const mongoose = require('mongoose')
const { connectDB } = require('./database')
const { 
  User, 
  ClassSession, 
  Stroke, 
  AudioChunk, 
  ChatMessage, 
  SessionParticipant,
  AIContent 
} = require('./models')
const config = require('./config')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST"]
  }
})

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Connect to MongoDB
connectDB()

// In-memory storage for active sessions and users
const activeSessions = new Map()
const activeUsers = new Map()
const sessionParticipants = new Map()

// Utility functions
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  })
})

// Get all active sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await ClassSession.find({ isLive: true })
      .populate('teacherId', 'name')
      .sort({ startTime: -1 })
    
    const sessionsWithStats = sessions.map(session => ({
      ...session.toObject(),
      participantCount: sessionParticipants.get(session._id.toString())?.size || 0
    }))
    
    res.json(sessionsWithStats)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

// Create new session
app.post('/api/sessions', async (req, res) => {
  try {
    const { teacherId, title, subject, bandwidthMode = 'normal' } = req.body
    
    // Create or find teacher user
    let teacher = await User.findById(teacherId)
    if (!teacher) {
      teacher = new User({
        _id: teacherId,
        name: req.body.teacherName || 'Teacher',
        role: 'teacher'
      })
      await teacher.save()
    }
    
    const session = new ClassSession({
      teacherId: teacher._id,
      title,
      subject,
      bandwidthMode,
      startTime: new Date()
    })
    
    await session.save()
    
    // Add to active sessions
    activeSessions.set(session._id.toString(), {
      id: session._id.toString(),
      teacherId: teacher._id.toString(),
      title,
      subject,
      bandwidthMode,
      startTime: session.startTime,
      isLive: true
    })
    
    sessionParticipants.set(session._id.toString(), new Set())
    
    res.json({ sessionId: session._id.toString(), session })
  } catch (error) {
    console.error('Error creating session:', error)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

// Join session
app.post('/api/sessions/:sessionId/join', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { userId, userName, role = 'student', bandwidthMode = 'normal' } = req.body
    
    // Create or find user
    let user = await User.findById(userId)
    if (!user) {
      user = new User({
        _id: userId,
        name: userName,
        role
      })
      await user.save()
    }
    
    // Find session
    const session = await ClassSession.findById(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    
    // Create or update participant record
    const participant = await SessionParticipant.findOneAndUpdate(
      { sessionId, userId },
      {
        sessionId,
        userId,
        bandwidthMode,
        isActive: true,
        joinedAt: new Date()
      },
      { upsert: true, new: true }
    )
    
    // Add to in-memory tracking
    if (!sessionParticipants.has(sessionId)) {
      sessionParticipants.set(sessionId, new Set())
    }
    sessionParticipants.get(sessionId).add(userId)
    
    activeUsers.set(userId, {
      id: userId,
      name: userName,
      role,
      sessionId,
      bandwidthMode,
      handRaised: false
    })
    
    res.json({ success: true, participant })
  } catch (error) {
    console.error('Error joining session:', error)
    res.status(500).json({ error: 'Failed to join session' })
  }
})

// Get session data
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    
    const session = await ClassSession.findById(sessionId)
      .populate('teacherId', 'name')
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    
    // Get recent strokes
    const strokes = await Stroke.find({ sessionId })
      .sort({ time: 1 })
      .limit(1000) // Limit for performance
    
    // Get participants
    const participants = await SessionParticipant.find({ 
      sessionId, 
      isActive: true 
    }).populate('userId', 'name role')
    
    res.json({
      session: session.toObject(),
      strokes,
      participants: participants.map(p => ({
        ...p.toObject(),
        user: p.userId
      }))
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    res.status(500).json({ error: 'Failed to fetch session' })
  }
})

// WebSocket handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id)
  
  // Join session room
  socket.on('join-session', async (data) => {
    const { sessionId, userId, userName, role } = data
    
    socket.join(sessionId)
    socket.sessionId = sessionId
    socket.userId = userId
    socket.userName = userName
    socket.role = role
    
    console.log(`🎓 ${userName} (${role}) joined session ${sessionId}`)
    
    // Notify others in the session
    socket.to(sessionId).emit('user-joined', {
      userId,
      userName,
      role,
      timestamp: Date.now()
    })
    
    // Send current session state to new user
    try {
      const strokes = await Stroke.find({ sessionId }).sort({ time: 1 })
      socket.emit('session-state', { strokes })
    } catch (error) {
      console.error('Error sending session state:', error)
    }
  })
  
  // Handle new stroke
  socket.on('new-stroke', async (strokeData) => {
    if (socket.role !== 'teacher') return // Only teachers can draw
    
    try {
      const stroke = new Stroke({
        sessionId: socket.sessionId,
        ...strokeData,
        userId: socket.userId
      })
      
      await stroke.save()
      
      // Broadcast to all users in session
      socket.to(socket.sessionId).emit('stroke-added', strokeData)
      
      // Update session stats
      await ClassSession.findByIdAndUpdate(socket.sessionId, {
        $inc: { 'stats.totalStrokes': 1 }
      })
      
    } catch (error) {
      console.error('Error saving stroke:', error)
    }
  })
  
  // Handle audio chunk
  socket.on('audio-chunk', async (audioData) => {
    if (socket.role !== 'teacher') return // Only teachers can broadcast audio
    
    try {
      const audioChunk = new AudioChunk({
        sessionId: socket.sessionId,
        ...audioData,
        userId: socket.userId
      })
      
      await audioChunk.save()
      
      // Broadcast to all users in session
      socket.to(socket.sessionId).emit('audio-received', audioData)
      
      // Update session stats
      await ClassSession.findByIdAndUpdate(socket.sessionId, {
        $inc: { 'stats.totalAudioDuration': audioData.duration }
      })
      
    } catch (error) {
      console.error('Error saving audio chunk:', error)
    }
  })
  
  // Handle chat message
  socket.on('chat-message', async (messageData) => {
    try {
      const message = new ChatMessage({
        sessionId: socket.sessionId,
        userId: socket.userId,
        userName: socket.userName,
        ...messageData
      })
      
      await message.save()
      
      // Broadcast to all users in session
      io.to(socket.sessionId).emit('message-received', {
        ...messageData,
        userId: socket.userId,
        userName: socket.userName,
        timestamp: Date.now()
      })
      
    } catch (error) {
      console.error('Error saving chat message:', error)
    }
  })
  
  // Handle hand raise
  socket.on('hand-raise', async (data) => {
    try {
      await SessionParticipant.findOneAndUpdate(
        { sessionId: socket.sessionId, userId: socket.userId },
        { 
          handRaised: data.raised,
          handRaisedAt: data.raised ? new Date() : null
        }
      )
      
      // Notify teacher
      socket.to(socket.sessionId).emit('hand-raised', {
        userId: socket.userId,
        userName: socket.userName,
        raised: data.raised,
        timestamp: Date.now()
      })
      
    } catch (error) {
      console.error('Error updating hand raise:', error)
    }
  })
  
  // Handle bandwidth change
  socket.on('bandwidth-change', async (data) => {
    try {
      await SessionParticipant.findOneAndUpdate(
        { sessionId: socket.sessionId, userId: socket.userId },
        { bandwidthMode: data.mode }
      )
      
      socket.to(socket.sessionId).emit('user-bandwidth-changed', {
        userId: socket.userId,
        mode: data.mode
      })
      
    } catch (error) {
      console.error('Error updating bandwidth mode:', error)
    }
  })
  
  // Handle clear canvas
  socket.on('clear-canvas', async () => {
    if (socket.role !== 'teacher') return
    
    try {
      // Remove all strokes for this session
      await Stroke.deleteMany({ sessionId: socket.sessionId })
      
      // Broadcast clear command
      io.to(socket.sessionId).emit('canvas-cleared')
      
    } catch (error) {
      console.error('Error clearing canvas:', error)
    }
  })
  
  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('👋 User disconnected:', socket.id)
    
    if (socket.sessionId && socket.userId) {
      try {
        // Update participant status
        await SessionParticipant.findOneAndUpdate(
          { sessionId: socket.sessionId, userId: socket.userId },
          { 
            isActive: false,
            leftAt: new Date()
          }
        )
        
        // Remove from in-memory tracking
        if (sessionParticipants.has(socket.sessionId)) {
          sessionParticipants.get(socket.sessionId).delete(socket.userId)
        }
        activeUsers.delete(socket.userId)
        
        // Notify others
        socket.to(socket.sessionId).emit('user-left', {
          userId: socket.userId,
          userName: socket.userName,
          timestamp: Date.now()
        })
        
      } catch (error) {
        console.error('Error handling disconnect:', error)
      }
    }
  })
})

// Cleanup inactive sessions periodically
setInterval(async () => {
  try {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    
    // Mark old sessions as inactive
    await ClassSession.updateMany(
      { 
        startTime: { $lt: cutoffTime },
        isLive: true,
        endTime: { $exists: false }
      },
      { 
        isLive: false,
        endTime: new Date()
      }
    )
    
    console.log('🧹 Cleaned up inactive sessions')
  } catch (error) {
    console.error('Error cleaning up sessions:', error)
  }
}, 60 * 60 * 1000) // Run every hour

// Start server
server.listen(config.PORT, () => {
  console.log(`🚀 VoiceBoard server running on port ${config.PORT}`)
  console.log(`🍃 MongoDB URI: ${config.MONGODB_URI}`)
  console.log(`🌐 WebSocket: ws://localhost:${config.PORT}`)
})
