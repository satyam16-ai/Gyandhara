module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0'
  },

  // Mediasoup configuration
  mediasoup: {
    // Number of workers (defaults to CPU cores)
    numWorkers: process.env.MEDIASOUP_WORKERS || require('os').cpus().length,
    
    // Worker settings
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 19999,
      logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
        // 'rtx',
        // 'bwe',
        // 'score',
        // 'simulcast',
        // 'svc'
      ]
    },

    // Router settings
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2, // Set to 2 for compatibility
          parameters: {
            'useinbandfec': 1,
            'maxplaybackrate': 48000
          }
        },
        {
          kind: 'audio',
          mimeType: 'audio/PCMU',
          clockRate: 8000
        },
        {
          kind: 'audio',
          mimeType: 'audio/PCMA',
          clockRate: 8000
        }
      ]
    },

    // WebRTC transport settings
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1'
        }
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      // Audio-optimized settings
      maxIncomingBitrate: 200000, // Slightly higher than 160kbps for overhead
      enableSctp: false, // We don't need SCTP for audio-only
    }
  },

  // Audio-specific settings
  audio: {
    // Target bitrate for Opus codec
    targetBitrate: 160000, // 160kbps
    
    // Channel configuration
    channels: 1, // Mono audio
    
    // Sample rate
    sampleRate: 48000, // 48kHz (WebRTC standard)
    
    // Frame size (affects latency vs efficiency)
    frameSize: 20, // 20ms for low latency
    
    // Audio processing
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    
    // Forward Error Correction
    fec: true,
    
    // Discontinuous Transmission (silence detection)
    dtx: true
  },

  // Socket.IO configuration
  socketIO: {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:3002'],
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  },

  // Logging configuration
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    file: process.env.LOG_FILE || 'audio-sfu.log',
    console: true
  },

  // Security settings
  security: {
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    
    // CORS settings for production
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  },

  // Room management
  rooms: {
    // Maximum participants per room
    maxParticipants: 50,
    
    // Room timeout (auto-cleanup empty rooms)
    timeoutMs: 5 * 60 * 1000, // 5 minutes
    
    // Maximum concurrent rooms
    maxRooms: 100
  }
};