const mongoose = require('mongoose')

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
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
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  preferences: {
    bandwidthMode: {
      type: String,
      enum: ['ultra-low', 'low', 'normal'],
      default: 'normal'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light'],
      default: 'light'
    }
  },
  profile: {
    phone: String,
    avatar: String,
    bio: String,
    institution: String,
    subject: String // For teachers
  }
}, {
  timestamps: true
})

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now())
})

// Class Session Schema (Room System)
const classSessionSchema = new mongoose.Schema({
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
  className: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  isLive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 50,
    min: 1,
    max: 500
  },
  bandwidthMode: {
    type: String,
    enum: ['ultra-low', 'low', 'normal'],
    default: 'normal'
  },
  settings: {
    allowChat: {
      type: Boolean,
      default: true
    },
    allowHandRaise: {
      type: Boolean,
      default: true
    },
    allowWhiteboard: {
      type: Boolean,
      default: true
    },
    allowAudio: {
      type: Boolean,
      default: true
    },
    recordSession: {
      type: Boolean,
      default: true
    },
    allowStudentScreenShare: {
      type: Boolean,
      default: false
    },
    muteParticipantsOnJoin: {
      type: Boolean,
      default: false
    },
    requireApprovalToJoin: {
      type: Boolean,
      default: false
    }
  },
  stats: {
    totalParticipants: {
      type: Number,
      default: 0
    },
    currentParticipants: {
      type: Number,
      default: 0
    },
    maxConcurrentUsers: {
      type: Number,
      default: 0
    },
    totalStrokes: {
      type: Number,
      default: 0
    },
    totalAudioDuration: {
      type: Number,
      default: 0
    },
    totalChatMessages: {
      type: Number,
      default: 0
    }
  },
  roomStatus: {
    type: String,
    enum: ['waiting', 'active', 'paused', 'ended'],
    default: 'waiting'
  }
}, {
  timestamps: true
})

// Stroke Schema for whiteboard data (Enhanced for RoughJS elements)
const strokeSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSession',
    required: true
  },
  x1: {
    type: Number,
    required: true
  },
  y1: {
    type: Number,
    required: true
  },
  x2: {
    type: Number,
    required: true
  },
  y2: {
    type: Number,
    required: true
  },
  time: {
    type: Number,
    required: true
  },
  color: {
    type: String,
    default: '#000000'
  },
  thickness: {
    type: Number,
    default: 2,
    min: 1,
    max: 20
  },
  tool: {
    type: String,
    enum: ['pen', 'eraser', 'highlighter', 'highlight', 'freehand', 'rectangle', 'circle', 'triangle', 'line', 'arrow', 'text'],
    default: 'pen'
  },
  // Store complete RoughJS element data as JSON for advanced features
  elementData: {
    type: String, // JSON stringified DrawingElement
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
})

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
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
  userName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'voice', 'question', 'answer'],
    default: 'text'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  }
}, {
  timestamps: true
})

// Session Participant Schema
const sessionParticipantSchema = new mongoose.Schema({
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
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: {
    type: Date
  },
  handRaised: {
    type: Boolean,
    default: false
  },
  handRaisedAt: {
    type: Date
  },
  bandwidthMode: {
    type: String,
    enum: ['ultra-low', 'low', 'normal'],
    default: 'normal'
  },
  connectionQuality: {
    type: String,
    enum: ['poor', 'fair', 'good', 'excellent'],
    default: 'good'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Ensure unique participant per session
sessionParticipantSchema.index({ sessionId: 1, userId: 1 }, { unique: true })

// AI Generated Content Schema
const aiContentSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSession',
    required: true
  },
  contentType: {
    type: String,
    enum: ['transcript', 'translation', 'summary', 'notes', 'quiz'],
    required: true
  },
  originalLanguage: {
    type: String,
    default: 'en'
  },
  targetLanguage: {
    type: String
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // Flexible content structure
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  processingTime: {
    type: Number // Time taken to generate in milliseconds
  }
}, {
  timestamps: true
})

// Create Models
const User = mongoose.model('User', userSchema)
const ClassSession = mongoose.model('ClassSession', classSessionSchema)
const Stroke = mongoose.model('Stroke', strokeSchema)
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)
const SessionParticipant = mongoose.model('SessionParticipant', sessionParticipantSchema)
const AIContent = mongoose.model('AIContent', aiContentSchema)

// Indexes for performance
strokeSchema.index({ sessionId: 1, time: 1 })
chatMessageSchema.index({ sessionId: 1, createdAt: -1 })
sessionParticipantSchema.index({ sessionId: 1, isActive: 1 })
aiContentSchema.index({ sessionId: 1, contentType: 1 })

// Room system indexes
classSessionSchema.index({ roomId: 1 })
classSessionSchema.index({ teacherId: 1, isLive: 1 })
classSessionSchema.index({ roomStatus: 1, isLive: 1 })
classSessionSchema.index({ createdAt: -1 })

// OTP Schema for password reset
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otpCode: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['password-reset', 'account-verification', 'login-verification'],
    default: 'password-reset'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  }
}, {
  timestamps: true
})

// Admin Session Schema for tracking admin logins
const adminSessionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionToken: {
    type: String,
    required: true,
    unique: true
  },
  ipAddress: String,
  userAgent: String,
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// User indexes
userSchema.index({ email: 1 })
userSchema.index({ username: 1 })
userSchema.index({ role: 1, isActive: 1 })
userSchema.index({ lockUntil: 1 })

// OTP indexes
otpSchema.index({ email: 1, type: 1 })
otpSchema.index({ createdAt: 1 })

// Room Class/Lecture Schema
const roomClassSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSession',
    required: false // Made optional since we create classes before sessions
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lectureNumber: {
    type: Number,
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // Duration in minutes
    default: 60
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  materials: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['pdf', 'image', 'video', 'link', 'document']
    }
  }],
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: Date,
    leftAt: Date,
    attendancePercentage: {
      type: Number,
      default: 0
    }
  }],
  whiteboard: {
    hasContent: {
      type: Boolean,
      default: false
    },
    lastUpdated: Date
  },
  recording: {
    isRecorded: {
      type: Boolean,
      default: false
    },
    recordingUrl: String,
    duration: Number
  },
  stats: {
    totalAttendees: {
      type: Number,
      default: 0
    },
    averageAttendance: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    engagementScore: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
})

// Index for efficient queries
roomClassSchema.index({ roomId: 1, lectureNumber: 1 }, { unique: true })
roomClassSchema.index({ sessionId: 1, scheduledDate: 1 })
roomClassSchema.index({ teacherId: 1, status: 1 })

// Classroom Schema - Persistent classrooms that teachers create
const classroomSchema = new mongoose.Schema({
  classroomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 10,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  // Students enrolled in this classroom
  enrolledStudents: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    studentName: String,
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'removed'],
      default: 'active'
    }
  }],
  // Classroom settings
  settings: {
    allowSelfEnrollment: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    maxStudents: {
      type: Number,
      default: 50,
      min: 1,
      max: 200
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  // Statistics
  stats: {
    totalLectures: {
      type: Number,
      default: 0
    },
    totalStudents: {
      type: Number,
      default: 0
    },
    totalHours: {
      type: Number,
      default: 0
    },
    averageAttendance: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
})

// Student Enrollment Schema - Track which students are in which classrooms
const studentEnrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  classroomCode: {
    type: String,
    required: true,
    uppercase: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'removed'],
    default: 'active'
  },
  // Attendance statistics for this student in this classroom
  attendanceStats: {
    totalLecturesAttended: {
      type: Number,
      default: 0
    },
    totalLecturesScheduled: {
      type: Number,
      default: 0
    },
    attendancePercentage: {
      type: Number,
      default: 0
    },
    lastAttended: Date
  }
}, {
  timestamps: true
})

// Ensure unique enrollment
studentEnrollmentSchema.index({ studentId: 1, classroomId: 1 }, { unique: true })

// Classroom indexes
classroomSchema.index({ teacherId: 1, 'settings.isArchived': 1 })
classroomSchema.index({ classroomCode: 1 }, { unique: true })

// Update RoomClass to reference Classroom
roomClassSchema.add({
  classroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: false // Made optional for backward compatibility
  },
  classroomCode: {
    type: String,
    uppercase: true
  }
})

// Slide Schema for multi-slide support
const slideSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSession',
    required: true
  },
  slideId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    default: 'Untitled Slide'
  },
  slideNumber: {
    type: Number,
    required: true
  },
  elements: [{
    id: String,
    type: {
      type: String,
      enum: ['freehand', 'rectangle', 'circle', 'line', 'arrow', 'text', 'highlight', 'triangle']
    },
    points: [Number],
    options: {
      stroke: String,
      strokeWidth: Number,
      fill: String,
      roughness: Number,
      fillStyle: String
    },
    text: String,
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Slide indexes
slideSchema.index({ sessionId: 1, slideNumber: 1 })
slideSchema.index({ sessionId: 1, isActive: 1 })

module.exports = {
  User: mongoose.model('User', userSchema),
  ClassSession: mongoose.model('ClassSession', classSessionSchema),
  Stroke: mongoose.model('Stroke', strokeSchema),
  ChatMessage: mongoose.model('ChatMessage', chatMessageSchema),
  SessionParticipant: mongoose.model('SessionParticipant', sessionParticipantSchema),
  RoomClass: mongoose.model('RoomClass', roomClassSchema),
  Classroom: mongoose.model('Classroom', classroomSchema),
  StudentEnrollment: mongoose.model('StudentEnrollment', studentEnrollmentSchema),
  AIContent: mongoose.model('AIContent', aiContentSchema),
  OTP: mongoose.model('OTP', otpSchema),
  AdminSession: mongoose.model('AdminSession', adminSessionSchema),
  Slide: mongoose.model('Slide', slideSchema)
}
