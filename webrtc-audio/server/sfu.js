const mediasoup = require('mediasoup');

class SFUManager {
  constructor(logger) {
    this.logger = logger;
    this.workers = [];
    this.routers = new Map(); // roomId -> router
    this.transports = new Map(); // transportId -> transport
    this.producers = new Map(); // producerId -> producer
    this.consumers = new Map(); // consumerId -> consumer
    this.rooms = new Map(); // roomId -> { participants, router }
    
    this.workerIndex = 0;
    this.numWorkers = require('os').cpus().length;
  }

  async initialize() {
    this.logger.info(`Initializing ${this.numWorkers} mediasoup workers...`);
    
    for (let i = 0; i < this.numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: 'warn',
        rtcMinPort: 10000 + (i * 1000),
        rtcMaxPort: 10000 + (i * 1000) + 999,
      });

      worker.on('died', () => {
        this.logger.error(`Mediasoup worker ${i} died, exiting...`);
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(worker);
      this.logger.info(`Worker ${i} created with PID ${worker.pid}`);
    }
  }

  getNextWorker() {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    return worker;
  }

  async createRoom(roomId) {
    if (this.rooms.has(roomId)) {
      this.logger.info(`Room ${roomId} already exists, returning existing room`);
      return this.rooms.get(roomId);
    }

    this.logger.info(`Creating room: ${roomId}`);
    
    const worker = this.getNextWorker();
    const router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2, // Set to 2 for compatibility, will enforce mono in client
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
    });

    const room = {
      id: roomId,
      router,
      participants: new Map(), // socketId -> participant info
      teacher: null,
      students: new Set()
    };

    this.rooms.set(roomId, room);
    this.routers.set(roomId, router);
    
    this.logger.info(`Room ${roomId} created with router ${router.id}`);
    return room;
  }

  async getRouterCapabilities(roomId) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = await this.createRoom(roomId);
    }
    return room.router.rtpCapabilities;
  }

  async createTransport(roomId, socketId, direction) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const transport = await room.router.createWebRtcTransport({
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
      // Audio-specific optimizations
      maxIncomingBitrate: 200000, // Slightly higher than 160kbps for overhead
    });

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    transport.on('routerclose', () => {
      transport.close();
    });

    this.transports.set(transport.id, transport);
    
    this.logger.info(`${direction} transport created for room ${roomId}, socket ${socketId}`);
    
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };
  }

  async connectTransport(transportId, dtlsParameters) {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport ${transportId} not found`);
    }

    await transport.connect({ dtlsParameters });
    this.logger.info(`Transport ${transportId} connected`);
  }

  async createProducer(transportId, rtpParameters, kind, socketId, roomId) {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport ${transportId} not found`);
    }

    // Ensure we're only handling audio
    if (kind !== 'audio') {
      throw new Error('Only audio is supported');
    }

    const producer = await transport.produce({
      kind,
      rtpParameters,
      keyFrameRequestDelay: 5000,
    });

    producer.on('transportclose', () => {
      this.logger.info(`Producer ${producer.id} transport closed`);
      producer.close();
    });

    producer.on('close', () => {
      this.logger.info(`Producer ${producer.id} closed`);
      this.producers.delete(producer.id);
    });

    this.producers.set(producer.id, {
      producer,
      socketId,
      roomId,
      kind
    });

    // Update room with teacher info
    const room = this.rooms.get(roomId);
    if (room) {
      room.teacher = {
        socketId,
        producerId: producer.id
      };
    }

    this.logger.info(`Audio producer created: ${producer.id} for socket ${socketId} in room ${roomId}`);
    
    return {
      id: producer.id,
      kind: producer.kind
    };
  }

  async createConsumer(socketId, roomId, producerId, rtpCapabilities) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const producerInfo = this.producers.get(producerId);
    if (!producerInfo) {
      throw new Error(`Producer ${producerId} not found`);
    }

    // Don't let producer consume their own stream
    if (producerInfo.socketId === socketId) {
      throw new Error('Cannot consume own production');
    }

    const participant = room.participants.get(socketId);
    if (!participant || !participant.consumerTransport) {
      throw new Error(`Consumer transport not found for socket ${socketId}`);
    }

    const consumer = await participant.consumerTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true // Start paused for smoother experience
    });

    consumer.on('transportclose', () => {
      this.logger.info(`Consumer ${consumer.id} transport closed`);
      consumer.close();
    });

    consumer.on('producerclose', () => {
      this.logger.info(`Consumer ${consumer.id} producer closed`);
      consumer.close();
    });

    consumer.on('close', () => {
      this.logger.info(`Consumer ${consumer.id} closed`);
      this.consumers.delete(consumer.id);
    });

    this.consumers.set(consumer.id, {
      consumer,
      socketId,
      roomId,
      producerId
    });

    this.logger.info(`Audio consumer created: ${consumer.id} for socket ${socketId}`);

    return {
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      producerId
    };
  }

  async pauseConsumer(consumerId) {
    const consumerInfo = this.consumers.get(consumerId);
    if (consumerInfo) {
      await consumerInfo.consumer.pause();
      this.logger.info(`Consumer ${consumerId} paused`);
    }
  }

  async resumeConsumer(consumerId) {
    const consumerInfo = this.consumers.get(consumerId);
    if (consumerInfo) {
      await consumerInfo.consumer.resume();
      this.logger.info(`Consumer ${consumerId} resumed`);
    }
  }

  addParticipant(roomId, socketId, role = 'student') {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const participant = {
      socketId,
      role,
      producerTransport: null,
      consumerTransport: null,
      producers: new Set(),
      consumers: new Set()
    };

    room.participants.set(socketId, participant);
    
    if (role === 'student') {
      room.students.add(socketId);
    }

    this.logger.info(`Participant ${socketId} added to room ${roomId} as ${role}`);
    return participant;
  }

  getParticipant(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }
    return room.participants.get(socketId);
  }

  removeParticipant(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socketId);
    if (!participant) return;

    // Close all transports and streams
    if (participant.producerTransport) {
      participant.producerTransport.close();
    }
    if (participant.consumerTransport) {
      participant.consumerTransport.close();
    }

    // Remove from room
    room.participants.delete(socketId);
    room.students.delete(socketId);
    
    if (room.teacher && room.teacher.socketId === socketId) {
      room.teacher = null;
    }

    // Clean up empty room
    if (room.participants.size === 0) {
      this.deleteRoom(roomId);
    }

    this.logger.info(`Participant ${socketId} removed from room ${roomId}`);
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Close router
    room.router.close();
    
    // Clean up maps
    this.rooms.delete(roomId);
    this.routers.delete(roomId);
    
    this.logger.info(`Room ${roomId} deleted`);
  }

  getWorkerCount() {
    return this.workers.length;
  }

  getRoomCount() {
    return this.rooms.size;
  }

  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      id: roomId,
      participantCount: room.participants.size,
      hasTeacher: !!room.teacher,
      studentCount: room.students.size
    };
  }

  // Additional methods for monitoring and stats
  getTransportCount() {
    return this.transports.size;
  }

  getProducerCount() {
    return this.producers.size;
  }

  getConsumerCount() {
    return this.consumers.size;
  }

  async cleanup() {
    this.logger.info('Cleaning up SFU resources...');
    
    // Close all rooms
    for (const [roomId] of this.rooms) {
      this.deleteRoom(roomId);
    }

    // Close all workers
    for (const worker of this.workers) {
      worker.close();
    }

    this.workers = [];
    this.rooms.clear();
    this.routers.clear();
    this.transports.clear();
    this.producers.clear();
    this.consumers.clear();
  }
}

module.exports = SFUManager;