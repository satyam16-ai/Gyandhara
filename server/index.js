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
// const studentRoutes = require('./routes/student')
const classroomRoutes = require('./routes/classrooms')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://voiceboard-educational-platform.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Middleware setup
app.use(helmet())
app.use(cors({
  origin: ["http://localhost:3000", "https://voiceboard-educational-platform.vercel.app"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

  // Log API requests (production-ready logging)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`🌐 ${req.method} ${req.path}`)
    }
    next()
  })

// API Routes
app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/room-classes', roomClassRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// MongoDB already connected above; skipping duplicate connectDB() call

// Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id)
    
    socket.on('compressed-drawing-data', async (compressedBuffer) => {
    if (socket.role !== 'teacher') return // Only teachers can draw
    
    try {
      // Forward compressed data directly to students (ultra-fast relay)
      socket.to(socket.sessionId).emit('compressed-drawing-data', compressedBuffer)
      
      // TODO: Optionally decompress and store in database for persistence
      // For now, prioritizing real-time performance over storage
      
    } catch (error) {
      console.error('❌ Error handling compressed drawing data:', error)
    }
  })

  // Handle real-time audio streaming with Opus compression
  socket.on('audio-chunk', async (audioPacket) => {
    if (socket.role !== 'teacher') return // Only teachers can send audio
    
    try {
      console.log(`🔊 Received audio chunk: ${audioPacket.compressedSize} bytes (${audioPacket.compressionRatio}:1 ratio)`)
      
      // Forward compressed audio directly to students (ultra-fast relay)
      socket.to(socket.sessionId).emit('audio-chunk', audioPacket)
      
      // Update session stats for audio
      await ClassSession.findByIdAndUpdate(socket.sessionId, {
        $inc: { 'stats.totalAudioDuration': 0.1 } // 100ms chunks
      })
      
    } catch (error) {
      console.error('❌ Error handling audio chunk:', error)
    }
  })

  // Handle audio stopped notification
  socket.on('audio-stopped', (data) => {
    console.log(`🔇 Teacher ${data.userName} stopped audio`)
    socket.to(socket.sessionId).emit('audio-stopped', data)
  })

  // Handle typing status indicators
  socket.on('typing-status', (data) => {
    // Broadcast typing status to other users in the session
    socket.to(socket.sessionId).emit('typing-status', data)
  })
})

/* Reuse the previously created app instance; do not redeclare 'app' to avoid block-scoped redeclaration */
// Reusing the previously created app, server and io instances to avoid redeclaration
// (const app, server and io were created earlier in this file)
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

// Make socket.io available to routes
app.set('io', io)

// Mount admin routes on secure path
app.use('/api/admin-secure', adminRoutes)

// Mount auth routes
app.use('/api/auth', authRoutes)

// Mount room routes
app.use('/api/rooms', roomRoutes)

// Mount room-classes routes
app.use('/api/room-classes', roomClassRoutes)

// Mount student routes
// app.use('/api/student', studentRoutes)

// Mount classroom routes
app.use('/api/classrooms', classroomRoutes)

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
      
      console.log('🔐 Join room attempt:', { 
        roomId, 
        roomIdLength: roomId?.length,
        roomIdUpperCase: roomId?.toUpperCase(),
        userId: userId ? 'provided' : 'missing', 
        token: userToken ? 'provided' : 'missing' 
      })
      
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
        console.log('🔍 Available active ClassSessions:')
        const availableRooms = await ClassSession.find({ isLive: true }).select('roomId title')
        availableRooms.forEach(r => console.log(`  - roomId: "${r.roomId}" (${r.roomId.length} chars), title: "${r.title}"`))
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
        console.log('🔍 Checking student authorization for roomId:', roomId)
        const participant = await SessionParticipant.findOne({
          sessionId: room._id,
          userId: new mongoose.Types.ObjectId(userId),
          isActive: true
        })
        
        console.log('👥 Participant check result:', {
          found: !!participant,
          participantId: participant?._id,
          sessionId: room._id,
          userId: userId,
          isActive: participant?.isActive
        })
        
        if (!participant) {
          console.log('❌ Authorization failed: Student not registered for this room')
          console.log('📊 Available participants in session:', await SessionParticipant.find({ sessionId: room._id }))
          socket.emit('error', { message: 'You are not authorized to join this room. Please join through the proper interface.' })
          return
        }
        
        console.log('✅ Student authorization successful')
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

      // Join both the sessionId room (for drawing) and roomId room (for WebRTC)
      socket.join(socket.sessionId)
      socket.join(socket.roomId) // Also join roomId for WebRTC events
      
      console.log(`🏠 User joined rooms: sessionId=${socket.sessionId}, roomId=${socket.roomId}`)
      
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
    try {
      const { sessionId, userId, userName, role } = data
      
      console.log('🔄 Legacy join-session request:', { sessionId, userId, userName, role })
      
      let actualUserId = userId
      let actualUserName = userName || 'Guest User'
      
      // Validate and resolve userId
      if (!userId || userId === userName || !mongoose.Types.ObjectId.isValid(userId)) {
        console.log('⚠️ Invalid userId provided, attempting to resolve:', userId)
        
        // Try to find user by username/name
        const User = mongoose.models.User || require('./models').User
        let user = await User.findOne({ 
          $or: [
            { username: userName },
            { name: userName },
            { email: userName }
          ]
        })
        
        if (!user && userName) {
          // Create a temporary user for this session
          console.log('🆕 Creating temporary user for:', userName)
          user = await User.create({
            name: userName,
            username: `guest_${userName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
            email: `${userName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}@temp.com`,
            role: role || 'student',
            passwordHash: 'temp_password',
            isActive: true
          })
        }
        
        if (user) {
          actualUserId = user._id.toString()
          actualUserName = user.name
          console.log('✅ Resolved user:', { actualUserId, actualUserName })
        } else {
          console.log('❌ Could not resolve user, using fallback')
          // Create minimal fallback user
          const fallbackUser = await User.create({
            name: `Guest_${Date.now()}`,
            username: `guest_${Date.now()}`,
            email: `guest_${Date.now()}@temp.com`,
            role: 'student',
            passwordHash: 'temp_password',
            isActive: true
          })
          actualUserId = fallbackUser._id.toString()
          actualUserName = fallbackUser.name
        }
      }
      
      socket.join(sessionId)
      socket.sessionId = sessionId
      socket.userId = actualUserId
      socket.userName = actualUserName
      socket.role = role || 'student'
      
      console.log(`🎓 ${actualUserName} (${role}) joined session ${sessionId} with userId: ${actualUserId}`)
      
      // Notify others in the session
      socket.to(sessionId).emit('user-joined', {
        userId: actualUserId,
        userName: actualUserName,
        role: role || 'student',
        timestamp: Date.now()
      })
      
      // Send confirmation to the user
      socket.emit('session-joined', {
        sessionId,
        userId: actualUserId,
        userName: actualUserName,
        role: role || 'student'
      })
      
    } catch (error) {
      console.error('❌ Error in legacy join-session:', error)
      socket.emit('error', { message: 'Failed to join session. Please try again.' })
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

  // Handle real-time audio streaming with Opus compression
  socket.on('audio-chunk', async (audioPacket) => {
    if (socket.role !== 'teacher') return // Only teachers can send audio
    
    try {
      console.log(`🔊 Received audio chunk: ${audioPacket.compressedSize} bytes (${audioPacket.compressionRatio}:1 ratio)`)
      
      // Forward compressed audio directly to students (ultra-fast relay)
      socket.to(socket.sessionId).emit('audio-chunk', audioPacket)
      
      // Update session stats for audio
      await ClassSession.findByIdAndUpdate(socket.sessionId, {
        $inc: { 'stats.totalAudioDuration': 0.1 } // 100ms chunks
      })
      
    } catch (error) {
      console.error('❌ Error handling audio chunk:', error)
    }
  })

  // Handle audio stopped notification
  socket.on('audio-stopped', (data) => {
    console.log(`🔇 Teacher ${data.userName} stopped audio`)
    socket.to(socket.sessionId).emit('audio-stopped', data)
  })

    // Store in database for persistence

  // Handle typing status indicators
  socket.on('typing-status', (data) => {
    // Broadcast typing status to other users in the session
    socket.to(socket.sessionId).emit('typing-status', data)
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
  
  // Handle ultra-low latency binary audio packets (new format)
  socket.on('audio-packet-binary', async (data) => {
    console.log('🎵 SERVER RECEIVED AUDIO PACKET:', {
      from: data?.userName || 'unknown',
      userId: data?.userId || 'unknown',
      role: socket.role,
      roomId: data?.roomId || 'unknown',
      packetSize: data?.packet?.byteLength || 0,
      hasPacket: !!data?.packet,
      canBroadcast: socket.role === 'teacher'
    })
    
    if (socket.role !== 'teacher') {
      console.log('🚫 Non-teacher tried to send audio:', socket.role)
      return // Only teachers can broadcast audio
    }
    
    try {
      const { roomId, userId, userName, packet } = data
      
      if (!packet || !packet.byteLength) {
        console.warn('⚠️ Received empty audio packet from', userName)
        return
      }
      
      // Parse packet header for validation and monitoring
      const view = new DataView(packet)
      const sequenceNumber = view.getUint32(0, true)
      const timestamp = view.getFloat64(4, true)
      const sampleRate = view.getUint32(12, true)
      const audioDataSize = packet.byteLength - 16
      const serverLatency = Date.now() - timestamp
      
      console.log('📡 BROADCASTING AUDIO PACKET:', {
        sequenceNumber,
        timestamp: timestamp.toFixed(2),
        sampleRate,
        audioDataSize,
        serverLatency: serverLatency.toFixed(1) + 'ms',
        roomId: roomId || socket.sessionId
      })
      
      // Performance logging (reduced frequency for ultra-low latency)
      if (sequenceNumber % 200 === 0) {
        console.log('⚡ ULTRA-LOW LATENCY PACKET:', {
          from: userName,
          seq: sequenceNumber,
          sampleRate,
          packetSize: packet.byteLength,
          serverLatencyMs: serverLatency.toFixed(1)
        })
      }
      
      // Broadcast to all other clients in the room with minimal delay
      const broadcastData = {
        userId,
        userName,
        packet,
        serverTimestamp: Date.now()
      }
      
      socket.to(roomId || socket.sessionId).emit('audio-packet-binary', broadcastData)
      
      // Update session stats (very lightweight)
      if (sequenceNumber % 1000 === 0) {
        try {
          await ClassSession.findByIdAndUpdate(socket.sessionId, {
            $inc: { 
              'stats.totalAudioPackets': 1000,
              'stats.totalAudioDuration': (audioDataSize / 2 / sampleRate * 1000) // Approximate duration for 1000 packets
            }
          })
        } catch (dbError) {
          // Don't block real-time processing for database errors
        }
      }
      
    } catch (error) {
      console.error('❌ Ultra-low latency packet error:', error.message)
    }
  })
  
  // Handle legacy binary audio chunks (backward compatibility)
  socket.on('audio-chunk-binary', async (audioData) => {
    if (socket.role !== 'teacher') return // Only teachers can broadcast audio
    
    console.log('🎤 Server received binary audio-chunk:', {
      chunkId: audioData.chunkId,
      hasBinaryData: !!audioData.binaryData,
      duration: audioData.duration + 'ms',
      compressedSize: audioData.compressedSize,
      userName: socket.userName,
      format: audioData.format
    })
    
    try {
      // For real-time performance, skip database storage and focus on broadcasting
      // Only store metadata for analytics (optional - can be enabled later)
      const storeInDatabase = false // Set to true if you want to store binary data
      
      if (storeInDatabase) {
        // Convert ArrayBuffer to Buffer for MongoDB storage
        let binaryBuffer = null
        if (audioData.binaryData && audioData.binaryData instanceof ArrayBuffer) {
          binaryBuffer = Buffer.from(audioData.binaryData)
        }
        
        // Calculate compression ratio
        const compressionRatio = audioData.originalSize && audioData.compressedSize 
          ? (audioData.compressedSize / audioData.originalSize)
          : null
        
        // Only create database entry if we have binary data
        if (binaryBuffer) {
          const audioChunk = new AudioChunk({
            sessionId: socket.sessionId,
            binaryData: binaryBuffer,
            isBinaryFormat: true,
            time: audioData.time || Date.now(),
            duration: audioData.duration,
            userId: socket.userId,
            sampleRate: audioData.sampleRate || 48000,
            format: audioData.format || 'binary-int16',
            bitrate: audioData.bitrate || 64000,
            originalSize: audioData.originalSize,
            compressedSize: audioData.compressedSize,
            compressionRatio: compressionRatio
          })
          
          await audioChunk.save()
          console.log('💾 Binary audio metadata saved to database')
        }
      }
      
      // Create complete binary audio packet for real-time broadcasting
      const completeBinaryPacket = {
        ...audioData,
        sessionId: socket.sessionId,
        userName: socket.userName,
        timestamp: Date.now()
      }
      
      // Broadcast binary audio to all students in the session using the new binary event
      socket.to(socket.sessionId).emit('audio-chunk-binary', completeBinaryPacket)
      
      console.log('✅ Binary audio broadcasted to session:', socket.sessionId, 
        `(${completeBinaryPacket.compressedSize}B, ${completeBinaryPacket.format})`)
      
    } catch (error) {
      console.error('❌ Error processing binary audio chunk:', error)
    }
  })
  
  // Handle legacy audio chunks (for backward compatibility)
  socket.on('audio-chunk', async (audioData) => {
    if (socket.role !== 'teacher') return // Only teachers can broadcast audio
    
    console.log('🎤 Server received legacy audio-chunk:', {
      chunkId: audioData.chunkId,
      hasChunkData: !!audioData.chunkData,
      duration: audioData.duration + 'ms',
      base64Size: audioData.base64Size,
      userName: socket.userName
    })
    
    try {
      // Create audio chunk document for legacy Base64 format
      const audioChunk = new AudioChunk({
        sessionId: socket.sessionId,
        chunkData: audioData.chunkData, // Base64 encoded data
        isBinaryFormat: false, // This is legacy format
        time: audioData.time || Date.now(),
        duration: audioData.duration,
        userId: socket.userId,
        sampleRate: audioData.sampleRate || 48000,
        format: audioData.format || 'base64-legacy',
        bitrate: audioData.bitrate || 32000
      })
      
      await audioChunk.save()
      
      // Create complete audio packet for broadcasting with all metadata
      const completeAudioPacket = {
        ...audioData,
        sessionId: socket.sessionId,
        userId: socket.userId,
        // Ensure all required fields are present for client playback
        chunkData: audioData.chunkData,
        time: audioData.time || Date.now(),
        duration: audioData.duration,
        userName: socket.userName || 'Unknown',
        sampleRate: audioData.sampleRate || 48000
      }
      
      // Broadcast complete packet to all users in session
      socket.to(socket.sessionId).emit('audio-received', completeAudioPacket)
      
      console.log('📡 Server broadcasting audio-received:', {
        chunkId: completeAudioPacket.chunkId,
        hasChunkData: !!completeAudioPacket.chunkData,
        duration: completeAudioPacket.duration + 'ms',
        base64Size: completeAudioPacket.base64Size,
        toSession: socket.sessionId
      })
      
      // Update session stats
      await ClassSession.findByIdAndUpdate(socket.sessionId, {
        $inc: { 'stats.totalAudioDuration': audioData.duration || 0 }
      })
      
    } catch (error) {
      console.error('Error saving audio chunk:', error)
    }
  })
  
  // Handle chat message
  socket.on('chat-message', async (messageData) => {
    try {
      // Ensure we have proper userId (ObjectId) and userName
      let actualUserId = socket.userId
      let actualUserName = socket.userName || 'Anonymous'
      
      // If userId is not a valid ObjectId, try to find user by name or create temp id
      if (!actualUserId || !mongoose.Types.ObjectId.isValid(actualUserId)) {
        // Try to find user by username/name
        const User = mongoose.models.User || require('./models').User
        let user = null
        
        if (socket.userName) {
          user = await User.findOne({ 
            $or: [
              { username: socket.userName },
              { name: socket.userName }
            ]
          })
        }
        
        if (user) {
          actualUserId = user._id
          actualUserName = user.name || user.username
          // Update socket with correct user info
          socket.userId = actualUserId
          socket.userName = actualUserName
        } else {
          // Create a temporary user record for this session
          const tempUser = await User.create({
            name: socket.userName || 'Guest User',
            username: `guest_${Date.now()}`,
            email: `guest_${Date.now()}@temp.com`,
            role: socket.role || 'student',
            passwordHash: 'temp', // This will be a temporary account
            isActive: true
          })
          actualUserId = tempUser._id
          actualUserName = tempUser.name
          socket.userId = actualUserId
          socket.userName = actualUserName
        }
      }
      
      const message = new ChatMessage({
        sessionId: socket.sessionId,
        userId: actualUserId,
        userName: actualUserName,
        message: messageData.message || messageData.text || '',
        messageType: messageData.messageType || 'text',
        isPrivate: messageData.isPrivate || false,
        replyTo: messageData.replyTo || null
      })
      
      await message.save()
      
      // Broadcast to all users in session
      io.to(socket.sessionId).emit('message-received', {
        _id: message._id,
        message: message.message,
        messageType: message.messageType,
        userId: actualUserId,
        userName: actualUserName,
        timestamp: message.createdAt || Date.now(),
        isPrivate: message.isPrivate,
        replyTo: message.replyTo
      })
      
    } catch (error) {
      console.error('Error saving chat message:', error)
      
      // Send error back to sender
      socket.emit('chat-error', {
        message: 'Failed to send message. Please try again.',
        error: error.message
      })
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

  // ==================== WebRTC Audio Broadcast Signaling ====================
  
  // WebRTC room joining (simpler than main room joining)
  socket.on('webrtc-join-room', (data) => {
    const { roomId, userId, userName, isTeacher } = data
    console.log(`🎙️ WebRTC join room: ${userName} (${isTeacher ? 'teacher' : 'student'}) joining ${roomId}`)
    
    // Join the socket to the room for signaling
    socket.join(roomId)
    
    // Store WebRTC-specific data
    socket.webrtcRoomId = roomId
    socket.webrtcUserId = userId
    socket.webrtcUserName = userName
    socket.webrtcIsTeacher = isTeacher
    
    console.log(`✅ WebRTC room joined: ${userName} in ${roomId}`)
  })
  
  // Teacher ready to broadcast
  socket.on('webrtc-teacher-ready', async (data) => {
    const { roomId, teacherId, teacherName } = data
    console.log(`🎙️ Teacher ready to broadcast: ${teacherName} in room ${roomId}`)
    
    // Store teacher's broadcast info
    socket.teacherBroadcasting = true
    socket.broadcastRoomId = roomId
    
    // Notify all students in the room about teacher broadcast
    console.log(`📢 Broadcasting teacher ready to room ${roomId}`)
    socket.to(roomId).emit('webrtc-teacher-broadcasting', {
      teacherId,
      teacherName,
      roomId
    })
    
    console.log(`✅ Teacher ${teacherName} broadcast notification sent`)
  })
  
  // Student wants to join broadcast
  socket.on('webrtc-student-join', async (data) => {
    const { roomId, studentId, studentName } = data
    console.log(`👥 Student joining broadcast: ${studentName} in room ${roomId}`)
    
    // Join the room for signaling
    socket.join(roomId)
    
    // Notify teacher about student join
    socket.to(roomId).emit('webrtc-student-join', {
      studentId,
      studentName
    })
  })
  
  // Forward WebRTC offer from teacher to student
  socket.on('webrtc-offer', (data) => {
    const { roomId, to, from, offer } = data
    console.log(`📤 Forwarding WebRTC offer from ${from} to ${to} in room ${roomId}`)
    
    // Forward to specific student by finding their socket
    const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === to)
    if (targetSocket) {
      targetSocket.emit('webrtc-offer', {
        from,
        offer
      })
      console.log(`✅ Offer forwarded to student socket ${targetSocket.id}`)
    } else {
      console.log(`❌ Student socket not found for user ${to}`)
    }
  })
  
  // Forward WebRTC answer from student to teacher
  socket.on('webrtc-answer', (data) => {
    const { roomId, to, from, answer } = data
    console.log(`📤 Forwarding WebRTC answer from ${from} to ${to} in room ${roomId}`)
    
    // Forward to specific teacher by finding their socket
    const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === to)
    if (targetSocket) {
      targetSocket.emit('webrtc-answer', {
        from,
        answer
      })
      console.log(`✅ Answer forwarded to teacher socket ${targetSocket.id}`)
    } else {
      console.log(`❌ Teacher socket not found for user ${to}`)
    }
  })
  
  // Forward ICE candidates
  socket.on('webrtc-ice-candidate', (data) => {
    const { roomId, to, from, candidate } = data
    console.log(`🧊 Forwarding ICE candidate from ${from} to ${to}`)
    
    // Forward to specific user by finding their socket
    const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === to)
    if (targetSocket) {
      targetSocket.emit('webrtc-ice-candidate', {
        from,
        candidate
      })
      console.log(`✅ ICE candidate forwarded to socket ${targetSocket.id}`)
    } else {
      console.log(`❌ Target socket not found for user ${to}`)
    }
  })
  
  // Student leaving broadcast
  socket.on('webrtc-student-leave', (data) => {
    const { roomId, studentId } = data
    console.log(`📤 Student leaving broadcast: ${studentId}`)
    
    socket.to(roomId).emit('webrtc-student-left', {
      studentId
    })
  })
  
  // Teacher stopping broadcast
  socket.on('webrtc-teacher-stop', (data) => {
    const { roomId, teacherId } = data
    console.log(`🛑 Teacher stopped broadcasting: ${teacherId}`)
    
    // Clear teacher broadcast state
    socket.teacherBroadcasting = false
    socket.broadcastRoomId = null
    
    // Notify all students
    socket.to(roomId).emit('webrtc-teacher-stop', {
      teacherId
    })
  })
  
  // ==================== Simple WebRTC Audio Broadcast ====================
  
  // Teacher starts broadcasting
  socket.on('teacher-broadcast-start', (data) => {
    const { roomId, teacherId, teacherName } = data
    console.log(`🎙️ Simple broadcast: Teacher ${teacherName} started broadcasting in room ${roomId}`)
    console.log(`🔍 Teacher socket details:`, { 
      socketRoomId: socket.roomId, 
      socketSessionId: socket.sessionId,
      parameterRoomId: roomId 
    })
    console.log(`🔍 TeacherId being sent to students:`, { teacherId, type: typeof teacherId, length: teacherId?.length })
    
    // Store broadcast state
    socket.broadcastingRoom = roomId
    socket.broadcastingTeacher = true
    
    // Use both roomId and sessionId to ensure we reach all students
    // Some students might be in sessionId room, others in roomId room
    console.log(`📢 Broadcasting to rooms: ${roomId} and ${socket.sessionId}`)
    socket.to(roomId).emit('teacher-broadcast-start', {
      teacherId,
      teacherName
    })
    
    // Also broadcast to sessionId room to catch students who joined that way
    if (socket.sessionId && socket.sessionId !== roomId) {
      socket.to(socket.sessionId).emit('teacher-broadcast-start', {
        teacherId,
        teacherName
      })
    }
    
    // Count students in both possible rooms
    const studentsInRoomId = Array.from(io.sockets.sockets.values()).filter(s => 
      s.rooms.has(roomId) && s.role === 'student'
    )
    const studentsInSessionId = Array.from(io.sockets.sockets.values()).filter(s => 
      s.rooms.has(socket.sessionId) && s.role === 'student'
    )
    
    // Combine and deduplicate students
    const allStudents = new Set([...studentsInRoomId.map(s => s.userId), ...studentsInSessionId.map(s => s.userId)])
    
    socket.emit('student-joined-room', { count: allStudents.size })
    console.log(`📊 Total unique students notified: ${allStudents.size}`)
    console.log(`📊 Students in roomId (${roomId}): ${studentsInRoomId.length}`)
    console.log(`📊 Students in sessionId (${socket.sessionId}): ${studentsInSessionId.length}`)
  })
  
  // Teacher stops broadcasting  
  socket.on('teacher-broadcast-stop', (data) => {
    const { roomId } = data
    console.log(`🛑 Simple broadcast: Teacher stopped broadcasting in room ${roomId}`)
    
    // Clear broadcast state
    socket.broadcastingRoom = null
    socket.broadcastingTeacher = false
    
    // Notify all students
    socket.to(roomId).emit('teacher-broadcast-stop')
  })
  
  // Student requests audio from teacher
  socket.on('student-request-audio', (data) => {
    const { roomId, studentId, teacherId } = data
    console.log(`🎧 Student ${studentId} requesting audio from teacher ${teacherId} in room ${roomId}`)
    
    // Debug: Show all teacher sockets in the room
    const allTeacherSockets = Array.from(io.sockets.sockets.values()).filter(s => 
      s.roomId === roomId && s.role === 'teacher'
    )
    console.log(`🔍 Found ${allTeacherSockets.length} teacher(s) in room ${roomId}:`)
    allTeacherSockets.forEach(s => {
      console.log(`  - Teacher userId: ${s.userId} (type: ${typeof s.userId}), name: ${s.userName}`)
    })
    console.log(`🔍 Looking for teacherId: ${teacherId} (type: ${typeof teacherId})`)
    
    // Find teacher socket - try both string and ObjectId comparison
    const teacherSockets = Array.from(io.sockets.sockets.values()).filter(s => {
      const userIdMatch = s.userId === teacherId || s.userId.toString() === teacherId || teacherId === s.userId.toString()
      const roomMatch = s.roomId === roomId
      const roleMatch = s.role === 'teacher'
      
      if (roomMatch && roleMatch) {
        console.log(`🔍 Checking teacher: userId=${s.userId}, userIdMatch=${userIdMatch}, roomMatch=${roomMatch}, roleMatch=${roleMatch}`)
      }
      
      return userIdMatch && roomMatch && roleMatch
    })
    
    if (teacherSockets.length > 0) {
      const teacherSocket = teacherSockets[0]
      teacherSocket.emit('student-request-audio', { studentId })
      console.log(`📤 Forwarded audio request to teacher ${teacherSocket.userName}`)
    } else {
      console.log(`❌ Teacher not found for audio request`)
      console.log(`❌ Search criteria: teacherId=${teacherId}, roomId=${roomId}, role=teacher`)
    }
  })
  
  // WebRTC signaling for simple broadcast
  socket.on('webrtc-offer', (data) => {
    const { roomId, from, to, offer } = data
    console.log(`📡 Simple WebRTC offer from ${from} to ${to} in room ${roomId}`)
    
    // Find target socket
    const targetSockets = Array.from(io.sockets.sockets.values()).filter(s => 
      s.userId === to && s.roomId === roomId
    )
    
    if (targetSockets.length > 0) {
      const targetSocket = targetSockets[0]
      targetSocket.emit('webrtc-offer', { from, offer })
      console.log(`✅ Forwarded offer to ${to}`)
    } else {
      console.log(`❌ Target user ${to} not found for offer`)
    }
  })
  
  socket.on('webrtc-answer', (data) => {
    const { roomId, from, to, answer } = data
    console.log(`📡 Simple WebRTC answer from ${from} to ${to} in room ${roomId}`)
    
    // Find target socket
    const targetSockets = Array.from(io.sockets.sockets.values()).filter(s => 
      s.userId === to && s.roomId === roomId
    )
    
    if (targetSockets.length > 0) {
      const targetSocket = targetSockets[0]
      targetSocket.emit('webrtc-answer', { from, answer })
      console.log(`✅ Forwarded answer to ${to}`)
    } else {
      console.log(`❌ Target user ${to} not found for answer`)
    }
  })
  
  socket.on('webrtc-ice-candidate', (data) => {
    const { roomId, from, to, candidate } = data
    console.log(`🧊 Simple WebRTC ICE candidate from ${from} to ${to}`)
    
    // Find target socket
    const targetSockets = Array.from(io.sockets.sockets.values()).filter(s => 
      s.userId === to && s.roomId === roomId
    )
    
    if (targetSockets.length > 0) {
      const targetSocket = targetSockets[0]
      targetSocket.emit('webrtc-ice-candidate', { from, candidate })
      console.log(`✅ Forwarded ICE candidate to ${to}`)
    } else {
      console.log(`❌ Target user ${to} not found for ICE candidate`)
    }
  })
  
  // ==================== End Simple WebRTC Audio Broadcast ====================

  // ==================== End WebRTC Signaling ====================

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
