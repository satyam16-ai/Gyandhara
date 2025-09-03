const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const mongoose = require('mongoose')
const helmet = require('helmet')
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
const adminRoutes = require('./routes/admin-simple')
const authRoutes = require('./routes/auth')
const roomRoutes = require('./routes/rooms')
const roomClassRoutes = require('./routes/room-classes')
const studentRoutes = require('./routes/student')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST"]
  }
})

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "data:", "blob:"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004", "http://localhost:3005", "http://localhost:3006", "http://localhost:3007", "http://localhost:3008"],
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Connect to MongoDB
connectDB()

// Mount admin routes on secure path
app.use('/api/admin-secure', adminRoutes)

// Mount auth routes
app.use('/api/auth', authRoutes)

// Mount room routes
app.use('/api/rooms', roomRoutes)

// Mount room-classes routes
app.use('/api/room-classes', roomClassRoutes)

// Mount student routes
app.use('/api/student', studentRoutes)

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
    
    // Generate unique room ID and password
    const generateRoomId = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase()
    }
    
    const generateRoomPassword = () => {
      return Math.random().toString(36).substring(2, 8)
    }
    
    let roomId = generateRoomId()
    // Ensure room ID is unique
    while (await ClassSession.findOne({ roomId })) {
      roomId = generateRoomId()
    }
    
    const session = new ClassSession({
      teacherId: teacher._id,
      roomId,
      roomPassword: generateRoomPassword(),
      className: title, // Use title as className
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
    
    res.json({ 
      sessionId: session._id.toString(), 
      roomId: session.roomId,
      roomPassword: session.roomPassword,
      session 
    })
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
  
  // Join room with authentication
  socket.on('join-room', async (data) => {
    try {
      const { roomId, userId, userToken } = data
      
      console.log('🔐 Join room attempt:', { roomId, userId: userId ? 'provided' : 'missing', token: userToken ? 'provided' : 'missing' })
      
      if (!roomId || !userId) {
        socket.emit('error', { message: 'Room ID and User ID are required' })
        return
      }

      // Find the room
      const room = await ClassSession.findOne({ 
        roomId: roomId.toUpperCase(),
        isLive: true 
      }).populate('teacherId', 'name email')

      if (!room) {
        console.log('❌ Room not found:', roomId)
        socket.emit('error', { message: 'Room not found or no longer active' })
        return
      }

      console.log('🏠 Found room:', { roomId: room.roomId, teacherId: room.teacherId._id })

      // Find user
      const user = await User.findById(userId)
      if (!user || !user.isActive) {
        console.log('❌ User not found or inactive:', userId)
        socket.emit('error', { message: 'Invalid user or account not active' })
        return
      }

      console.log('👤 Found user:', { userId: user._id, name: user.name, role: user.role })

      const isTeacher = user._id.toString() === room.teacherId._id.toString()
      console.log('🎓 Is teacher?', isTeacher)

      // Check if user is authorized to be in this room
      if (!isTeacher) {
        const participant = await SessionParticipant.findOne({
          sessionId: room._id,
          userId: userId,
          isActive: true
        })
        
        console.log('👥 Participant check:', participant ? 'found' : 'not found')
        
        if (!participant) {
          console.log('❌ Authorization failed: Student not registered for this room')
          socket.emit('error', { message: 'You are not authorized to join this room. Please join through the proper interface.' })
          return
        }
      } else {
        // For teachers, create or update SessionParticipant record automatically
        console.log('🎓 Creating teacher participant record')
        await SessionParticipant.findOneAndUpdate(
          { sessionId: room._id, userId: userId },
          {
            sessionId: room._id,
            userId: userId,
            isActive: true,
            joinedAt: new Date()
          },
          { upsert: true }
        )
      }

      // Store room and user info in socket
      socket.roomId = roomId.toUpperCase()
      socket.sessionId = room._id.toString()
      socket.userId = userId
      socket.userName = user.name
      socket.role = user.role
      socket.isTeacher = isTeacher

      // Join the room
      socket.join(socket.sessionId)
      
      console.log(`🎓 ${socket.userName} (${socket.role}) joined room ${socket.roomId}`)

      // Get current room state
      const [strokes, chatMessages, participants] = await Promise.all([
        Stroke.find({ sessionId: socket.sessionId }).sort({ time: 1 }),
        ChatMessage.find({ sessionId: socket.sessionId }).sort({ createdAt: -1 }).limit(50),
        SessionParticipant.find({ sessionId: socket.sessionId, isActive: true }).populate('userId', 'name role')
      ])

      // Send current state to the joining user
      socket.emit('room-joined', {
        roomId: socket.roomId,
        sessionId: socket.sessionId,
        room: {
          id: room._id,
          roomId: room.roomId,
          className: room.className,
          title: room.title,
          subject: room.subject,
          description: room.description,
          teacher: room.teacherId,
          settings: room.settings,
          roomStatus: room.roomStatus
        },
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          isTeacher
        },
        currentState: {
          drawingElements: strokes.map(stroke => {
            // Try to parse elementData if it exists, otherwise convert legacy stroke
            if (stroke.elementData) {
              try {
                return JSON.parse(stroke.elementData)
              } catch (e) {
                // Fallback to legacy format
                return {
                  id: stroke._id.toString(),
                  type: stroke.tool === 'pen' ? 'freehand' : stroke.tool,
                  points: [stroke.x1, stroke.y1, stroke.x2, stroke.y2],
                  options: {
                    stroke: stroke.color,
                    strokeWidth: stroke.thickness,
                    roughness: 1
                  },
                  timestamp: stroke.time
                }
              }
            } else {
              // Convert legacy stroke to new format
              return {
                id: stroke._id.toString(),
                type: stroke.tool === 'pen' ? 'freehand' : stroke.tool,
                points: [stroke.x1, stroke.y1, stroke.x2, stroke.y2],
                options: {
                  stroke: stroke.color,
                  strokeWidth: stroke.thickness,
                  roughness: 1
                },
                timestamp: stroke.time
              }
            }
          }),
          recentMessages: chatMessages.reverse(),
          participants: participants.map(p => ({
            id: p._id,
            user: {
              _id: p.userId._id,
              id: p.userId._id,
              name: p.userId.name,
              role: p.userId.role
            },
            joinedAt: p.joinedAt,
            handRaised: p.handRaised,
            handRaisedAt: p.handRaisedAt,
            bandwidthMode: p.bandwidthMode,
            connectionQuality: p.connectionQuality
          }))
        }
      })

      // Notify others in the room
      socket.to(socket.sessionId).emit('user-joined', {
        userId: socket.userId,
        userName: socket.userName,
        role: socket.role,
        isTeacher: socket.isTeacher,
        timestamp: Date.now()
      })

      // Update room stats
      room.stats.currentParticipants = await SessionParticipant.countDocuments({
        sessionId: room._id,
        isActive: true
      })
      room.stats.maxConcurrentUsers = Math.max(
        room.stats.maxConcurrentUsers,
        room.stats.currentParticipants
      )
      await room.save()
      
    } catch (error) {
      console.error('Error joining room:', error)
      socket.emit('error', { message: 'Failed to join room. Please try again.' })
    }
  })

  // Legacy join-session support (backwards compatibility)
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
  
  // Handle drawing element (new RoughJS system)
  // Handle compressed drawing data
  socket.on('compressed-drawing-data', async (compressedBuffer) => {
    if (socket.role !== 'teacher') return // Only teachers can draw
    
    try {
      console.log('📦 Received compressed drawing data:', compressedBuffer.byteLength, 'bytes')
      
      // Forward compressed data directly to students (ultra-fast relay)
      socket.to(socket.sessionId).emit('compressed-drawing-data', compressedBuffer)
      
      // TODO: Optionally decompress and store in database for persistence
      // For now, prioritizing real-time performance over storage
      
    } catch (error) {
      console.error('❌ Error handling compressed drawing data:', error)
    }
  })

  // Legacy drawing element handler (maintained for compatibility)
  socket.on('drawing-element', async (elementData) => {
    if (socket.role !== 'teacher') return // Only teachers can draw
    
    try {
      // Store in database for persistence
      const stroke = new Stroke({
        sessionId: socket.sessionId,
        userId: socket.userId,
        x1: elementData.x || 0,
        y1: elementData.y || 0,
        x2: (elementData.x || 0) + (elementData.width || 0),
        y2: (elementData.y || 0) + (elementData.height || 0),
        time: elementData.timestamp,
        color: elementData.options.stroke,
        thickness: elementData.options.strokeWidth,
        tool: elementData.type,
        // Store complete element data as JSON
        elementData: JSON.stringify(elementData)
      })
      
      await stroke.save()
      
      // Broadcast to all students in real-time
      socket.to(socket.sessionId).emit('drawing-element-update', {
        action: 'add',
        element: elementData,
        teacherId: socket.userId,
        timestamp: Date.now()
      })
      
      // Update session stats
      await ClassSession.findByIdAndUpdate(socket.sessionId, {
        $inc: { 'stats.totalStrokes': 1 }
      })
      
    } catch (error) {
      console.error('Error saving drawing element:', error)
    }
  })

  // Handle drawing element updates (like bulk operations)
  socket.on('drawing-elements-update', async (updateData) => {
    if (socket.role !== 'teacher') return // Only teachers can update
    
    try {
      const { action, elements, elementId } = updateData
      
      if (action === 'clear') {
        // Clear all strokes for this session
        await Stroke.deleteMany({ sessionId: socket.sessionId })
        
        // Broadcast clear to all students
        socket.to(socket.sessionId).emit('drawing-elements-update', {
          action: 'clear',
          teacherId: socket.userId,
          timestamp: Date.now()
        })
      } else if (action === 'bulk-update') {
        // Handle bulk updates (undo/redo operations)
        socket.to(socket.sessionId).emit('drawing-elements-update', {
          action: 'bulk-update',
          elements: elements,
          teacherId: socket.userId,
          timestamp: Date.now()
        })
      } else if (action === 'erase' && elementId) {
        // Handle individual element deletion
        try {
          // Parse elementId to extract the original stroke ID if it exists
          const strokeId = elementId.includes('-') ? elementId.split('-').pop() : elementId
          
          // Try to remove from database (may not exist for real-time elements)
          await Stroke.deleteOne({ 
            $or: [
              { _id: strokeId },
              { 'elementData': { $regex: elementId } }
            ],
            sessionId: socket.sessionId 
          })
          
          console.log('🗑️ Erased element:', elementId)
        } catch (dbError) {
          console.log('⚠️ Element not found in DB (may be real-time only):', elementId)
        }
        
        // Broadcast erase to all students
        socket.to(socket.sessionId).emit('drawing-element-update', {
          action: 'erase',
          elementId: elementId,
          teacherId: socket.userId,
          timestamp: Date.now()
        })
      }
      
    } catch (error) {
      console.error('Error updating drawing elements:', error)
    }
  })

  // Handle teacher cursor position
  socket.on('teacher-cursor', (cursorData) => {
    if (socket.role !== 'teacher') return
    
    // Broadcast teacher cursor position to all students in real-time
    socket.to(socket.sessionId).emit('teacher-cursor-update', {
      x: cursorData.x,
      y: cursorData.y,
      tool: cursorData.tool,
      isDrawing: cursorData.isDrawing,
      timestamp: Date.now()
    })
  })

  // Handle live drawing preview (for smooth real-time drawing)
  socket.on('drawing-preview', (previewData) => {
    if (socket.role !== 'teacher') return
    
    // Broadcast live drawing preview to students
    socket.to(socket.sessionId).emit('drawing-preview-update', {
      element: previewData.element,
      isComplete: previewData.isComplete,
      teacherId: socket.userId,
      timestamp: Date.now()
    })
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
  
  // Handle teacher ending class
  socket.on('teacher-ended-class', async (data) => {
    console.log('🛑 Teacher ended class:', data.classId)
    
    try {
      // Broadcast to all students in the session
      socket.to(socket.sessionId).emit('class-ended', {
        message: data.message || 'The class has been ended by the teacher.',
        endedAt: new Date().toISOString(),
        redirectTo: '/student-dashboard'
      })
      
      // Update all participants to inactive
      await SessionParticipant.updateMany(
        { sessionId: socket.sessionId },
        { 
          isActive: false,
          leftAt: new Date()
        }
      )
      
      console.log('✅ Class end notification sent to all students')
      
    } catch (error) {
      console.error('Error handling class end:', error)
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
            leftAt: new Date(),
            handRaised: false,
            handRaisedAt: null
          }
        )

        // Update user online status
        await User.findByIdAndUpdate(socket.userId, { 
          isOnline: false,
          lastActive: new Date()
        })

        // Update room current participants count
        if (socket.roomId) {
          const room = await ClassSession.findOne({ roomId: socket.roomId })
          if (room) {
            room.stats.currentParticipants = await SessionParticipant.countDocuments({
              sessionId: room._id,
              isActive: true
            })
            await room.save()
          }
        }
        
        // Remove from in-memory tracking
        if (sessionParticipants.has(socket.sessionId)) {
          sessionParticipants.get(socket.sessionId).delete(socket.userId)
        }
        activeUsers.delete(socket.userId)
        
        // Notify others in the room
        socket.to(socket.sessionId).emit('user-left', {
          userId: socket.userId,
          userName: socket.userName,
          role: socket.role,
          isTeacher: socket.isTeacher,
          timestamp: Date.now()
        })

        console.log(`👋 ${socket.userName} left room ${socket.roomId || socket.sessionId}`)
        
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
