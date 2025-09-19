class SignalingHandler {
  constructor(io, sfuManager, logger) {
    this.io = io;
    this.sfu = sfuManager;
    this.logger = logger;
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      this.logger.info(`Client connected: ${socket.id}`);

      // Join room
      socket.on('join-room', async (data, callback) => {
        try {
          const { roomId, role = 'student' } = data;
          
          if (!roomId) {
            const error = { success: false, error: 'Room ID is required' };
            if (callback) callback(error);
            else socket.emit('error', error);
            return;
          }

          // Create room if it doesn't exist
          const room = await this.sfu.createRoom(roomId);
          
          // Add participant
          const participant = this.sfu.addParticipant(roomId, socket.id, role);
          
          // Join socket room for broadcasting
          socket.join(roomId);
          socket.roomId = roomId;
          socket.role = role;

          this.logger.info(`Socket ${socket.id} joined room ${roomId} as ${role}`);

          // Send success response
          const response = {
            success: true,
            roomId,
            role,
            participantId: socket.id,
            roomInfo: this.sfu.getRoomInfo(roomId)
          };

          if (callback) callback(response);
          else socket.emit('joined-room', response);

          // Notify others in room
          socket.to(roomId).emit('participant-joined', {
            participantId: socket.id,
            role,
            roomInfo: this.sfu.getRoomInfo(roomId)
          });

          // If there's a teacher already producing, notify this student
          if (role === 'student' && room.teacher) {
            socket.emit('teacher-audio-available', {
              teacherId: room.teacher.socketId,
              producerId: room.teacher.producerId
            });
          }

        } catch (error) {
          this.logger.error('Error joining room:', error);
          const errorResponse = { success: false, error: error.message };
          if (callback) callback(errorResponse);
          else socket.emit('error', errorResponse);
        }
      });

      // Get router capabilities
      socket.on('get-router-capabilities', async (data, callback) => {
        try {
          const { roomId } = data || {};
          const capabilities = await this.sfu.getRouterCapabilities(roomId || socket.roomId);
          
          if (callback) callback(capabilities);
          else socket.emit('router-capabilities', capabilities);
        } catch (error) {
          this.logger.error('Error getting router capabilities:', error);
          const errorResponse = { error: error.message };
          if (callback) callback(errorResponse);
          else socket.emit('error', errorResponse);
        }
      });

      // Get router RTP capabilities (alternative name for compatibility)
      socket.on('get-router-rtp-capabilities', async (data, callback) => {
        try {
          const { roomId } = data || {};
          const capabilities = await this.sfu.getRouterCapabilities(roomId || socket.roomId);
          
          if (callback) callback(capabilities);
          else socket.emit('router-rtp-capabilities', capabilities);
        } catch (error) {
          this.logger.error('Error getting router RTP capabilities:', error);
          const errorResponse = { error: error.message };
          if (callback) callback(errorResponse);
          else socket.emit('error', errorResponse);
        }
      });

      // Create transport (unified handler)
      socket.on('create-transport', async (data, callback) => {
        try {
          const { type, forceTcp = false, rtpCapabilities } = data;
          const roomId = socket.roomId;
          
          if (!roomId) {
            const error = { error: 'Not in a room' };
            if (callback) callback(error);
            else socket.emit('error', error);
            return;
          }

          // Check permissions based on transport type
          if (type === 'send' && socket.role !== 'teacher') {
            const error = { error: 'Only teachers can create send transports' };
            if (callback) callback(error);
            else socket.emit('error', error);
            return;
          }

          const participant = this.sfu.getParticipant(roomId, socket.id);
          if (!participant) {
            const error = { error: 'Participant not found' };
            if (callback) callback(error);
            else socket.emit('error', error);
            return;
          }

          const transportParams = await this.sfu.createTransport(
            roomId,
            socket.id,
            type === 'send' ? 'send' : 'recv',
            {
              forceTcp,
              producing: type === 'send',
              consuming: type === 'recv',
              sctpCapabilities: undefined,
              rtpCapabilities
            }
          );

          // Store transport reference
          if (type === 'send') {
            participant.producerTransport = this.sfu.transports.get(transportParams.id);
          } else {
            participant.consumerTransport = this.sfu.transports.get(transportParams.id);
          }

          if (callback) callback(transportParams);
          else socket.emit('transport-created', { type, ...transportParams });

        } catch (error) {
          this.logger.error(`Error creating ${data.type || 'unknown'} transport:`, error);
          const errorResponse = { error: error.message };
          if (callback) callback(errorResponse);
          else socket.emit('error', errorResponse);
        }
      });

      // Create producer transport
      socket.on('create-producer-transport', async (data) => {
        try {
          const { roomId } = data;
          
          // Only teachers can produce audio
          if (socket.role !== 'teacher') {
            socket.emit('error', { message: 'Only teachers can produce audio' });
            return;
          }

          const transportParams = await this.sfu.createTransport(
            roomId, 
            socket.id, 
            'producer'
          );

          // Get room and participant - ensure they exist
          const room = this.sfu.rooms.get(roomId);
          if (!room) {
            socket.emit('error', { message: `Room ${roomId} not found` });
            return;
          }

          const participant = room.participants.get(socket.id);
          if (!participant) {
            socket.emit('error', { message: `Participant ${socket.id} not found in room ${roomId}` });
            return;
          }

          // Store transport reference
          participant.producerTransport = this.sfu.transports.get(transportParams.id);

          socket.emit('producer-transport-created', transportParams);
          
        } catch (error) {
          this.logger.error('Error creating producer transport:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // Create consumer transport
      socket.on('create-consumer-transport', async (data) => {
        try {
          const { roomId } = data;
          
          const transportParams = await this.sfu.createTransport(
            roomId, 
            socket.id, 
            'consumer'
          );

          // Get room and participant - ensure they exist
          const room = this.sfu.rooms.get(roomId);
          if (!room) {
            socket.emit('error', { message: `Room ${roomId} not found` });
            return;
          }

          const participant = room.participants.get(socket.id);
          if (!participant) {
            socket.emit('error', { message: `Participant ${socket.id} not found in room ${roomId}` });
            return;
          }

          // Store transport reference
          participant.consumerTransport = this.sfu.transports.get(transportParams.id);

          socket.emit('consumer-transport-created', transportParams);
          
        } catch (error) {
          this.logger.error('Error creating consumer transport:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // Connect transport
      socket.on('connect-transport', async (data, callback) => {
        try {
          const { transportId, dtlsParameters } = data;
          await this.sfu.connectTransport(transportId, dtlsParameters);
          
          const result = { transportId };
          if (callback) callback(result);
          else socket.emit('transport-connected', result);
        } catch (error) {
          this.logger.error('Error connecting transport:', error);
          const errorResponse = { error: error.message };
          if (callback) callback(errorResponse);
          else socket.emit('error', errorResponse);
        }
      });

      // Produce (for mediasoup-client compatibility)
      socket.on('produce', async (data, callback) => {
        try {
          const { transportId, kind, rtpParameters } = data;
          
          if (kind !== 'audio') {
            const error = { error: 'Only audio is supported' };
            if (callback) callback(error);
            else socket.emit('error', error);
            return;
          }

          if (socket.role !== 'teacher') {
            const error = { error: 'Only teachers can produce audio' };
            if (callback) callback(error);
            else socket.emit('error', error);
            return;
          }

          const producer = await this.sfu.createProducer(
            transportId,
            rtpParameters,
            kind,
            socket.id,
            socket.roomId
          );

          // Store producer reference
          const participant = this.sfu.getParticipant(socket.roomId, socket.id);
          if (participant) {
            participant.audioProducer = producer;
          }

          // Notify all students in the room about new audio
          socket.to(socket.roomId).emit('new-producer', {
            teacherId: socket.id,
            producerId: producer.id
          });

          const result = { producerId: producer.id };
          if (callback) callback(result);
          else socket.emit('producer-created', result);

          this.logger.info(`Teacher ${socket.id} started audio production`);

        } catch (error) {
          this.logger.error('Error producing:', error);
          const errorResponse = { error: error.message };
          if (callback) callback(errorResponse);
          else socket.emit('error', errorResponse);
        }
      });

      // Consume (for mediasoup-client compatibility)
      socket.on('consume', async (data, callback) => {
        try {
          const { transportId, producerId, rtpCapabilities } = data;
          
          if (!socket.roomId) {
            const error = { error: 'Not in a room' };
            if (callback) callback(error);
            else socket.emit('error', error);
            return;
          }

          const consumer = await this.sfu.createConsumer(
            socket.roomId,
            socket.id,
            transportId,
            producerId,
            rtpCapabilities
          );

          // Store consumer reference
          const participant = this.sfu.getParticipant(socket.roomId, socket.id);
          if (participant) {
            if (!participant.consumers) participant.consumers = new Map();
            participant.consumers.set(producerId, consumer);
          }

          const result = {
            id: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            type: consumer.type,
            producerPaused: consumer.producerPaused
          };

          if (callback) callback(result);
          else socket.emit('consumer-created', result);

          this.logger.info(`Consumer created for ${socket.id}: ${consumer.id}`);

        } catch (error) {
          this.logger.error('Error consuming:', error);
          const errorResponse = { error: error.message };
          if (callback) callback(errorResponse);
          else socket.emit('error', errorResponse);
        }
      });

      // Resume consumer
      socket.on('resume-consumer', async (data, callback) => {
        try {
          const { consumerId } = data;
          
          await this.sfu.resumeConsumer(consumerId);
          
          const result = { consumerId };
          if (callback) callback(result);
          else socket.emit('consumer-resumed', result);

          this.logger.info(`Consumer resumed: ${consumerId}`);

        } catch (error) {
          this.logger.error('Error resuming consumer:', error);
          const errorResponse = { error: error.message };
          if (callback) callback(errorResponse);
          else socket.emit('error', errorResponse);
        }
      });

      // Create producer
      socket.on('create-producer', async (data) => {
        try {
          const { transportId, rtpParameters, kind } = data;
          
          if (kind !== 'audio') {
            socket.emit('error', { message: 'Only audio is supported' });
            return;
          }

          const producer = await this.sfu.createProducer(
            transportId,
            rtpParameters,
            kind,
            socket.id,
            socket.roomId
          );

          socket.emit('producer-created', producer);

          // Notify all students that teacher audio is available
          socket.to(socket.roomId).emit('teacher-audio-available', {
            teacherId: socket.id,
            producerId: producer.id
          });

          this.logger.info(`Teacher ${socket.id} started audio production`);
          
        } catch (error) {
          this.logger.error('Error creating producer:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // Create consumer
      socket.on('create-consumer', async (data) => {
        try {
          const { producerId, rtpCapabilities } = data;
          
          const consumer = await this.sfu.createConsumer(
            socket.id,
            socket.roomId,
            producerId,
            rtpCapabilities
          );

          socket.emit('consumer-created', consumer);
          
        } catch (error) {
          this.logger.error('Error creating consumer:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // Resume consumer
      socket.on('resume-consumer', async (data) => {
        try {
          const { consumerId } = data;
          await this.sfu.resumeConsumer(consumerId);
          socket.emit('consumer-resumed', { consumerId });
        } catch (error) {
          this.logger.error('Error resuming consumer:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // Pause consumer
      socket.on('pause-consumer', async (data) => {
        try {
          const { consumerId } = data;
          await this.sfu.pauseConsumer(consumerId);
          socket.emit('consumer-paused', { consumerId });
        } catch (error) {
          this.logger.error('Error pausing consumer:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // Audio control events
      socket.on('teacher-mute', () => {
        socket.to(socket.roomId).emit('teacher-muted');
        this.logger.info(`Teacher ${socket.id} muted audio`);
      });

      socket.on('teacher-unmute', () => {
        socket.to(socket.roomId).emit('teacher-unmuted');
        this.logger.info(`Teacher ${socket.id} unmuted audio`);
      });

      // Get room info
      socket.on('get-room-info', () => {
        if (socket.roomId) {
          const roomInfo = this.sfu.getRoomInfo(socket.roomId);
          socket.emit('room-info', roomInfo);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.logger.info(`Client disconnected: ${socket.id}`);
        
        if (socket.roomId) {
          // Remove participant from SFU
          this.sfu.removeParticipant(socket.roomId, socket.id);
          
          // Notify others in room
          socket.to(socket.roomId).emit('participant-left', {
            participantId: socket.id,
            role: socket.role,
            roomInfo: this.sfu.getRoomInfo(socket.roomId)
          });

          // If teacher left, notify students
          if (socket.role === 'teacher') {
            socket.to(socket.roomId).emit('teacher-left');
            this.logger.info(`Teacher ${socket.id} left room ${socket.roomId}`);
          }
        }
      });

      // Error handling
      socket.on('error', (error) => {
        this.logger.error(`Socket error from ${socket.id}:`, error);
      });
    });
  }
}

module.exports = SignalingHandler;