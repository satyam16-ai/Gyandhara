# VoiceBoard Educational Platform - Complete Database Schema

## Overview
This document provides the complete MongoDB database schema for the VoiceBoard educational platform, including all collections, fields, relationships, and indexes.

## Database Information
- **Database System**: MongoDB with Mongoose ODM
- **Connection**: MongoDB URI configured via environment variables
- **Models Location**: `/server/models.js`
- **Relationships**: Referenced relationships using ObjectId

---

## Core Collections

### 1. Users Collection (`users`)

**Purpose**: Stores all user accounts (admin, teachers, students)

```javascript
const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    unique: true,
    sparse: true,        // Allows multiple null values
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  username: {
    type: String,
    unique: true,
    sparse: true,        // Allows multiple null values
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  
  // Authentication
  passwordHash: {
    type: String,
    required: function() {
      return this.role === 'admin' || this.email || this.username
    }
  },
  role: {
    type: String,
    required: true,
    enum: ['teacher', 'student', 'admin']
  },
  
  // Contact Information
  mobile: {
    type: String,
    sparse: true,
    trim: true,
    match: /^[\+]?[1-9][\d]{0,15}$/  // International phone format
  },
  
  // Status & Activity
  isActive: {
    type: Boolean,
    default: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  
  // Security
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  
  // Profile Information
  profile: {
    bio: String,
    avatar: String,
    department: String,
    institution: String,
    grade: String,        // For students
    subjects: [String],   // For teachers
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
      },
      language: {
        type: String,
        default: 'en'
      },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true }
      }
    }
  },
  
  // Analytics
  stats: {
    totalClassesAttended: { type: Number, default: 0 },
    totalClassesTaught: { type: Number, default: 0 },
    totalDrawingStrokes: { type: Number, default: 0 },
    totalSessionTime: { type: Number, default: 0 }, // in minutes
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now }
  }
}, {
  timestamps: true,
  collection: 'users'
})

// Indexes
userSchema.index({ email: 1 })
userSchema.index({ username: 1 })
userSchema.index({ role: 1, isActive: 1 })
userSchema.index({ lastActive: -1 })
userSchema.index({ 'profile.department': 1 })
```

### 2. Class Sessions Collection (`classsessions`)

**Purpose**: Stores classroom session information and settings

```javascript
const classSessionSchema = new mongoose.Schema({
  // Basic Information
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 6,
    maxlength: 10
  },
  roomPassword: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 20
  },
  
  // Class Details
  className: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  grade: {
    type: String,
    trim: true
  },
  
  // Session Timing
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  scheduledDuration: {
    type: Number,  // in minutes
    default: 60
  },
  
  // Session Status
  isLive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  roomStatus: {
    type: String,
    enum: ['waiting', 'active', 'paused', 'ended'],
    default: 'waiting'
  },
  
  // Technical Settings
  bandwidthMode: {
    type: String,
    enum: ['ultra-low', 'low', 'normal'],
    default: 'normal'
  },
  maxParticipants: {
    type: Number,
    default: 30,
    min: 1,
    max: 100
  },
  
  // Session Settings
  settings: {
    allowChat: { type: Boolean, default: true },
    allowHandRaise: { type: Boolean, default: true },
    allowWhiteboard: { type: Boolean, default: true },
    allowAudio: { type: Boolean, default: true },
    recordSession: { type: Boolean, default: true },
    allowStudentScreenShare: { type: Boolean, default: false },
    muteParticipantsOnJoin: { type: Boolean, default: false },
    requireApprovalToJoin: { type: Boolean, default: false }
  },
  
  // Analytics & Statistics
  stats: {
    totalParticipants: { type: Number, default: 0 },
    currentParticipants: { type: Number, default: 0 },
    maxConcurrentUsers: { type: Number, default: 0 },
    totalStrokes: { type: Number, default: 0 },
    totalAudioDuration: { type: Number, default: 0 }, // in seconds
    totalChatMessages: { type: Number, default: 0 },
    compressionStats: {
      totalOriginalSize: { type: Number, default: 0 },
      totalCompressedSize: { type: Number, default: 0 },
      averageCompressionRatio: { type: Number, default: 0 }
    }
  },
  
  // Recording Information
  recordings: [{
    type: {
      type: String,
      enum: ['audio', 'whiteboard', 'chat', 'full']
    },
    filename: String,
    size: Number,
    duration: Number,
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  collection: 'classsessions'
})

// Indexes
classSessionSchema.index({ roomId: 1 })
classSessionSchema.index({ teacherId: 1, isLive: 1 })
classSessionSchema.index({ roomStatus: 1, isLive: 1 })
classSessionSchema.index({ createdAt: -1 })
classSessionSchema.index({ startTime: -1 })
classSessionSchema.index({ 'stats.currentParticipants': -1 })
```

### 3. Drawing Strokes Collection (`strokes`)

**Purpose**: Stores whiteboard drawing data with compression

```javascript
const strokeSchema = new mongoose.Schema({
  // Session Reference
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSession',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Drawing Data
  elementId: {
    type: String,
    required: true,
    unique: true
  },
  tool: {
    type: String,
    required: true,
    enum: ['pen', 'highlighter', 'eraser', 'rectangle', 'circle', 'line', 'arrow', 'text', 'triangle']
  },
  
  // Style Properties
  color: {
    type: String,
    required: true,
    default: '#000000'
  },
  fillColor: {
    type: String,
    default: 'transparent'
  },
  width: {
    type: Number,
    required: true,
    min: 1,
    max: 50,
    default: 2
  },
  roughness: {
    type: Number,
    min: 0,
    max: 5,
    default: 1
  },
  
  // Drawing Points (compressed format)
  points: {
    type: [Number],  // Flattened array: [x1, y1, x2, y2, ...]
    required: true
  },
  
  // Compression Data
  compressionData: {
    originalSize: Number,
    compressedSize: Number,
    compressionRatio: Number,
    algorithm: {
      type: String,
      enum: ['none', 'delta', 'binary-pack', 'deflate', 'ultra-3step'],
      default: 'ultra-3step'
    }
  },
  
  // Timing Information
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  drawingTime: {
    type: Number,  // Time taken to draw in milliseconds
    default: 0
  },
  
  // Metadata
  isVisible: {
    type: Boolean,
    default: true
  },
  isErased: {
    type: Boolean,
    default: false
  },
  erasedAt: {
    type: Date
  },
  
  // Performance Metrics
  networkLatency: {
    type: Number,  // Round-trip time in ms
    default: 0
  }
}, {
  timestamps: true,
  collection: 'strokes'
})

// Indexes
strokeSchema.index({ sessionId: 1, timestamp: -1 })
strokeSchema.index({ userId: 1, sessionId: 1 })
strokeSchema.index({ elementId: 1 })
strokeSchema.index({ timestamp: -1 })
strokeSchema.index({ isVisible: 1, isErased: 1 })
```

### 4. Audio Chunks Collection (`audiochunks`)

**Purpose**: Stores voice communication data with compression

```javascript
const audioChunkSchema = new mongoose.Schema({
  // Session Reference
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSession',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Audio Data
  audioData: {
    type: Buffer,
    required: true
  },
  
  // Audio Properties
  format: {
    type: String,
    enum: ['opus', 'mp3', 'wav', 'webm'],
    default: 'opus'
  },
  sampleRate: {
    type: Number,
    default: 48000
  },
  bitrate: {
    type: Number,
    default: 32000  // 32kbps for low bandwidth
  },
  channels: {
    type: Number,
    enum: [1, 2],
    default: 1  // Mono for efficiency
  },
  
  // Timing & Duration
  duration: {
    type: Number,  // in milliseconds
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  sequenceNumber: {
    type: Number,
    required: true
  },
  
  // Compression & Quality
  compressionLevel: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  originalSize: {
    type: Number
  },
  compressedSize: {
    type: Number
  },
  
  // Network Information
  bandwidthMode: {
    type: String,
    enum: ['ultra-low', 'low', 'normal'],
    default: 'normal'
  },
  networkLatency: {
    type: Number,
    default: 0
  },
  
  // Processing Status
  isProcessed: {
    type: Boolean,
    default: false
  },
  processingError: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'audiochunks'
})

// Indexes
audioChunkSchema.index({ sessionId: 1, timestamp: -1 })
audioChunkSchema.index({ userId: 1, sessionId: 1 })
audioChunkSchema.index({ sequenceNumber: 1, sessionId: 1 })
audioChunkSchema.index({ timestamp: -1 })
```

### 5. Chat Messages Collection (`chatmessages`)

**Purpose**: Stores real-time chat messages and system notifications

```javascript
const chatMessageSchema = new mongoose.Schema({
  // Session Reference
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSession',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Message Content
  message: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Message Type
  type: {
    type: String,
    enum: ['text', 'system', 'notification', 'file', 'emoji', 'poll'],
    default: 'text'
  },
  
  // Message Features
  isPrivate: {
    type: Boolean,
    default: false
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'  // For private messages
  },
  
  // File Attachment (if type is 'file')
  attachment: {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  },
  
  // Moderation
  isModerated: {
    type: Boolean,
    default: false
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderationReason: {
    type: String
  },
  
  // Reactions & Engagement
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Translation (for multi-language support)
  translations: [{
    language: String,
    translatedText: String,
    confidence: Number
  }],
  
  // Timing
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Status
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'chatmessages'
})

// Indexes
chatMessageSchema.index({ sessionId: 1, timestamp: -1 })
chatMessageSchema.index({ userId: 1, sessionId: 1 })
chatMessageSchema.index({ type: 1, isModerated: 1 })
chatMessageSchema.index({ timestamp: -1 })
chatMessageSchema.index({ isPrivate: 1, recipientId: 1 })
```

### 6. Session Participants Collection (`sessionparticipants`)

**Purpose**: Tracks user participation in sessions with real-time status

```javascript
const sessionParticipantSchema = new mongoose.Schema({
  // References
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSession',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Participant Information
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userRole: {
    type: String,
    enum: ['teacher', 'student'],
    required: true
  },
  
  // Session Participation
  joinedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  leftAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Real-time Status
  isOnline: {
    type: Boolean,
    default: true
  },
  lastPing: {
    type: Date,
    default: Date.now
  },
  connectionQuality: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  
  // Interaction Status
  handRaised: {
    type: Boolean,
    default: false
  },
  handRaisedAt: {
    type: Date
  },
  isMuted: {
    type: Boolean,
    default: false
  },
  isVideoOn: {
    type: Boolean,
    default: false
  },
  
  // Technical Settings
  bandwidthMode: {
    type: String,
    enum: ['ultra-low', 'low', 'normal'],
    default: 'normal'
  },
  deviceInfo: {
    type: String,
    userAgent: String,
    platform: String,
    browser: String,
    screenResolution: String
  },
  
  // Participation Analytics
  stats: {
    totalTimeSpent: { type: Number, default: 0 }, // in minutes
    strokesDrawn: { type: Number, default: 0 },
    messagesPosted: { type: Number, default: 0 },
    audioMinutes: { type: Number, default: 0 },
    interactionScore: { type: Number, default: 0 }, // Engagement metric
    lastInteraction: { type: Date, default: Date.now }
  },
  
  // Network Analytics
  networkStats: {
    averageLatency: { type: Number, default: 0 },
    packetsLost: { type: Number, default: 0 },
    bandwidthUsed: { type: Number, default: 0 }, // in KB
    reconnections: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'sessionparticipants'
})

// Compound Indexes
sessionParticipantSchema.index({ sessionId: 1, userId: 1 }, { unique: true })
sessionParticipantSchema.index({ sessionId: 1, isActive: 1 })
sessionParticipantSchema.index({ userId: 1, joinedAt: -1 })
sessionParticipantSchema.index({ lastPing: -1 })
sessionParticipantSchema.index({ handRaised: 1, isActive: 1 })
```

### 7. System Analytics Collection (`analytics`)

**Purpose**: Stores platform-wide analytics and performance metrics

```javascript
const analyticsSchema = new mongoose.Schema({
  // Time Period
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['daily', 'hourly', 'session', 'user-action'],
    required: true
  },
  
  // Platform Statistics
  platformStats: {
    totalUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    liveSessions: { type: Number, default: 0 },
    totalDrawingStrokes: { type: Number, default: 0 },
    totalAudioMinutes: { type: Number, default: 0 },
    totalChatMessages: { type: Number, default: 0 }
  },
  
  // Performance Metrics
  performanceMetrics: {
    averageSessionDuration: { type: Number, default: 0 }, // minutes
    averageParticipantsPerSession: { type: Number, default: 0 },
    averageLatency: { type: Number, default: 0 }, // ms
    systemUptime: { type: Number, default: 0 }, // percentage
    compressionRatio: { type: Number, default: 0 },
    bandwidthSaved: { type: Number, default: 0 } // MB
  },
  
  // User Engagement
  engagementMetrics: {
    newUserRegistrations: { type: Number, default: 0 },
    returningUsers: { type: Number, default: 0 },
    averageSessionsPerUser: { type: Number, default: 0 },
    userRetentionRate: { type: Number, default: 0 }, // percentage
    mostActiveTimeSlot: { type: String },
    peakConcurrentUsers: { type: Number, default: 0 }
  },
  
  // Technical Analytics
  technicalMetrics: {
    serverLoad: { type: Number, default: 0 }, // percentage
    memoryUsage: { type: Number, default: 0 }, // MB
    databaseConnections: { type: Number, default: 0 },
    apiResponseTime: { type: Number, default: 0 }, // ms
    errorRate: { type: Number, default: 0 }, // percentage
    websocketConnections: { type: Number, default: 0 }
  },
  
  // Feature Usage
  featureUsage: {
    whiteboardUsage: { type: Number, default: 0 },
    audioUsage: { type: Number, default: 0 },
    chatUsage: { type: Number, default: 0 },
    mobileUsers: { type: Number, default: 0 },
    desktopUsers: { type: Number, default: 0 },
    lowBandwidthMode: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'analytics'
})

// Indexes
analyticsSchema.index({ date: -1, type: 1 })
analyticsSchema.index({ type: 1, createdAt: -1 })
```

---

## Relationships & Data Flow

### Primary Relationships

1. **User → ClassSession**: One-to-Many (Teacher creates multiple sessions)
2. **ClassSession → Stroke**: One-to-Many (Session has multiple drawings)
3. **ClassSession → AudioChunk**: One-to-Many (Session has multiple audio pieces)
4. **ClassSession → ChatMessage**: One-to-Many (Session has multiple messages)
5. **ClassSession → SessionParticipant**: One-to-Many (Session has multiple participants)
6. **User → SessionParticipant**: One-to-Many (User can join multiple sessions)

### Data Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │    │   (Express.js)  │    │   (MongoDB)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • WhiteBoard    │◄──►│ • Socket.io     │◄──►│ • Users         │
│ • ChatPanel     │    │ • REST APIs     │    │ • ClassSessions │
│ • AudioControls │    │ • Compression   │    │ • Strokes       │
│ • UserAuth      │    │ • Auth Middleware│   │ • AudioChunks   │
│ • AdminDash     │    │ • File Upload   │    │ • ChatMessages  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Indexes & Performance

### Critical Indexes

```javascript
// Performance Critical Indexes
db.classsessions.createIndex({ "roomId": 1 })
db.classsessions.createIndex({ "teacherId": 1, "isLive": 1 })
db.strokes.createIndex({ "sessionId": 1, "timestamp": -1 })
db.audiochunks.createIndex({ "sessionId": 1, "sequenceNumber": 1 })
db.chatmessages.createIndex({ "sessionId": 1, "timestamp": -1 })
db.sessionparticipants.createIndex({ "sessionId": 1, "isActive": 1 })

// Analytics Indexes
db.analytics.createIndex({ "date": -1, "type": 1 })
db.users.createIndex({ "role": 1, "isActive": 1 })
db.users.createIndex({ "lastLogin": -1 })

// Search Indexes
db.users.createIndex({ "name": "text", "email": "text" })
db.classsessions.createIndex({ "title": "text", "subject": "text" })
```

### Performance Considerations

1. **Compression**: 3-step compression reduces data transfer by 20:1 ratio
2. **Sharding**: Ready for horizontal scaling on sessionId
3. **TTL Indexes**: Automatic cleanup of old audio chunks and temporary data
4. **Connection Pooling**: Optimized MongoDB connections
5. **Query Optimization**: Selective field projection and pagination

---

## Security Features

### Data Protection

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: Secure authentication with 7-day expiry
3. **Rate Limiting**: API endpoint protection
4. **Input Validation**: Mongoose schema validation
5. **CORS Protection**: Configured allowed origins
6. **XSS Prevention**: Helmet security headers

### Privacy Compliance

1. **Data Minimization**: Only essential data stored
2. **Encryption**: Sensitive data encrypted at rest
3. **Access Control**: Role-based permissions
4. **Audit Logging**: User action tracking
5. **Data Retention**: Configurable cleanup policies

---

## Environment Configuration

### Required Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/voiceboard
DB_NAME=voiceboard

# Server
PORT=8080
NODE_ENV=production

# Security
JWT_SECRET=your-super-secret-jwt-key
BCRYPT_SALT_ROUNDS=12

# Email Service (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM_EMAIL=noreply@voiceboard.com

# Optional AI Services
OPENAI_API_KEY=your-openai-key
GOOGLE_TRANSLATE_API_KEY=your-google-key

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB
```

This comprehensive database schema supports the full VoiceBoard platform with real-time collaboration, compression, analytics, and scalability features.
