const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const SFUManager = require('./sfu');
const SignalingHandler = require('./signaling');

// Environment configuration
const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3001;
const LOG_LEVEL = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');
const SERVER_NAME = process.env.SERVER_NAME || 'gyandhara-audio-sfu';

// Render native deployment detection
const isRender = !!process.env.RENDER || process.env.DEPLOYMENT_PLATFORM === 'render';

// mediasoup configuration from environment
const MEDIASOUP_CONFIG = {
  minPort: parseInt(process.env.MEDIASOUP_MIN_PORT) || 20000,
  maxPort: parseInt(process.env.MEDIASOUP_MAX_PORT) || 20100,
  announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || 'auto'
};

// CORS configuration from environment
const corsEnabled = process.env.ENABLE_CORS !== 'false';
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [];

// Production CORS origins
const allowedOrigins = [
  // Environment-specific origins
  ...allowedOriginsEnv,
  
  // Default production domains
  'https://gyandhara-tau.vercel.app',
  'https://gyandhara-backend.onrender.com',
  'https://webrtc-server-sih.onrender.com',
  /\.vercel\.app$/,
  /\.render\.com$/,
  /\.onrender\.com$/,
  
  // Development domains (only in dev mode)
  ...(isDev ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002'
  ] : [])
];

// Configure logger for production and Render
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isRender 
      ? winston.format.json() 
      : (isDev ? winston.format.simple() : winston.format.json())
  ),
  defaultMeta: { service: SERVER_NAME },
  transports: [
    new winston.transports.Console({
      format: isRender 
        ? winston.format.json() 
        : (isDev ? winston.format.simple() : winston.format.json())
    }),
    ...(isDev && !isRender ? [new winston.transports.File({ filename: 'audio-sfu.log' })] : [])
  ]
});

class AudioSFUServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, Postman, etc.)
          if (!origin) return callback(null, true);
          
          // Check if origin is allowed
          const isAllowed = allowedOrigins.some(allowed => {
            if (typeof allowed === 'string') {
              return allowed === origin;
            } else if (allowed instanceof RegExp) {
              return allowed.test(origin);
            }
            return false;
          });
          
          if (isAllowed) {
            callback(null, true);
          } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.sfuManager = new SFUManager(logger);
    this.signaling = new SignalingHandler(this.io, this.sfuManager, logger);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for WebRTC
      crossOriginEmbedderPolicy: false // Disable for iframe embedding
    }));
    
    // CORS middleware
    this.app.use(cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        const isAllowed = allowedOrigins.some(allowed => {
          if (typeof allowed === 'string') {
            return allowed === origin;
          } else if (allowed instanceof RegExp) {
            return allowed.test(origin);
          }
          return false;
        });
        
        callback(null, isAllowed);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Trust proxy for Render deployment
    if (!isDev) {
      this.app.set('trust proxy', 1);
    }
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
    
    // Static files (if any)
    this.app.use(express.static('public'));
  }

  setupRoutes() {
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'WebRTC Audio SFU Server',
        version: '1.0.0',
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });

    // Health check endpoint for Render
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        workers: this.sfuManager.getWorkerCount(),
        rooms: this.sfuManager.getRoomCount(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Readiness probe for Render
    this.app.get('/ready', async (req, res) => {
      try {
        const workersReady = this.sfuManager.getWorkerCount() > 0;
        if (workersReady) {
          res.status(200).json({ ready: true });
        } else {
          res.status(503).json({ ready: false, reason: 'Workers not initialized' });
        }
      } catch (error) {
        res.status(503).json({ ready: false, reason: error.message });
      }
    });

    // Get router RTP capabilities
    this.app.get('/routerCapabilities/:roomId', async (req, res) => {
      try {
        const { roomId } = req.params;
        const capabilities = await this.sfuManager.getRouterCapabilities(roomId);
        res.json(capabilities);
      } catch (error) {
        logger.error('Error getting router capabilities:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Server stats endpoint
    this.app.get('/stats', (req, res) => {
      res.json({
        workers: this.sfuManager.getWorkerCount(),
        rooms: this.sfuManager.getRoomCount(),
        transports: this.sfuManager.getTransportCount(),
        producers: this.sfuManager.getProducerCount(),
        consumers: this.sfuManager.getConsumerCount(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      });
    });

    // API info
    this.app.get('/api/info', (req, res) => {
      res.json({
        name: 'WebRTC Audio SFU Server',
        version: '1.0.0',
        description: 'SFU server for classroom audio streaming',
        environment: process.env.NODE_ENV || 'development',
        features: {
          codec: 'Opus',
          bitrate: '320kbps',
          channels: 1,
          sampleRate: '48kHz',
          echoCancellation: true,
          noiseSuppression: true
        },
        endpoints: {
          health: '/health',
          ready: '/ready',
          stats: '/stats',
          routerCapabilities: '/routerCapabilities/:roomId'
        }
      });
    });
  }

  setupErrorHandling() {
    this.app.use((err, req, res, next) => {
      logger.error('Express error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception:', err);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    });
  }

  async start(port = PORT) {
    try {
      // Initialize SFU (mediasoup workers)
      await this.sfuManager.initialize();
      
      // Start server
      this.server.listen(port, '0.0.0.0', () => {
        logger.info(`🎵 Audio SFU Server running on port ${port}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`� Deployment: ${isRender ? 'Render Native Node.js' : (isDev ? 'Local Development' : 'Production')}`);
        logger.info(`📊 Health check: ${isDev ? 'http://localhost:' + port : 'https://webrtc-server-sih.onrender.com'}/health`);
        logger.info(`🔧 Workers initialized: ${this.sfuManager.getWorkerCount()}`);
        logger.info(`🔒 CORS origins: ${allowedOrigins.length} configured`);
        logger.info(`📦 Node.js version: ${process.version}`);
        
        if (isDev) {
          logger.info(`🛠️  API info: http://localhost:${port}/api/info`);
          logger.info(`📈 Stats: http://localhost:${port}/stats`);
        }
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async stop() {
    logger.info('Shutting down Audio SFU Server...');
    await this.sfuManager.cleanup();
    this.server.close();
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new AudioSFUServer();
  
  // Start server
  server.start(PORT);

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await server.stop();
      logger.info('Server shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions in production
  if (!isDev) {
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception:', err);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }
}

module.exports = AudioSFUServer;

module.exports = AudioSFUServer;