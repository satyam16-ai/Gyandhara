/**
 * AudioManager - Simplified WebRTC Audio Integration
 * Connects to existing webrtc-audio server with better error handling
 */

import { Device } from 'mediasoup-client';
import io from 'socket.io-client';

class AudioManager {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:3001';
    this.onStateChange = options.onStateChange || (() => {});
    this.onError = options.onError || (() => {});
    this.onLog = options.onLog || (() => {});
    
    // State
    this.socket = null;
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producer = null;
    this.consumers = new Map();
    this.roomId = null;
    this.role = null;
    
    // Audio state
    this.isConnected = false;
    this.isProducing = false;
    this.isMuted = false;
    this.isRemoteMuted = false;
    this.localStream = null;
    this.remoteStreams = new Map();
    this.isDestroyed = false; // Add flag to track destruction
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.startAudio = this.startAudio.bind(this);
    this.stopAudio = this.stopAudio.bind(this);
    this.toggleMute = this.toggleMute.bind(this);
    this.toggleRemoteMute = this.toggleRemoteMute.bind(this);
    
    this.log('AudioManager initialized');
  }

  log(message) {
    console.log(`[AudioManager] ${message}`);
    this.onLog(message);
  }

  error(message, err = null) {
    const errorMsg = err ? `${message}: ${err.message}` : message;
    console.error(`[AudioManager] ${errorMsg}`, err);
    this.onError(errorMsg);
  }

  updateState(updates = {}) {
    try {
      // Skip state updates if AudioManager is destroyed
      if (this.isDestroyed) {
        console.log('[AudioManager] Skipping state update - manager is destroyed');
        return;
      }
      
      if (typeof this.onStateChange === 'function') {
        this.onStateChange({
          isConnected: this.isConnected,
          isProducing: this.isProducing,
          isMuted: this.isMuted,
          isRemoteMuted: this.isRemoteMuted,
          audioLevel: 0,
          remoteAudioLevel: 0,
          state: this.getState(),
          ...updates
        });
      }
    } catch (err) {
      // Only log error if not destroyed to avoid spam during cleanup
      if (!this.isDestroyed) {
        console.error('Error updating state:', err);
      }
    }
  }

  getState() {
    if (!this.isConnected) return 'disconnected';
    if (this.isProducing) return 'producing';
    if (this.consumers.size > 0) return 'receiving';
    return 'connected';
  }

  async checkMicrophonePermissions() {
    try {
      // Always try getUserMedia first as it's more reliable for actual permission state
      // The Permissions API can be outdated or inaccurate
      try {
        this.log('Testing microphone access with getUserMedia...');
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false 
          } 
        });
        
        // If we get here, permissions are granted
        testStream.getTracks().forEach(track => track.stop()); // Clean up immediately
        this.log('Microphone access test successful - permissions granted');
        return { state: 'granted', method: 'getUserMedia-test' };
        
      } catch (mediaErr) {
        this.log('getUserMedia test failed:', mediaErr.name, mediaErr.message);
        
        if (mediaErr.name === 'NotAllowedError') {
          return { state: 'denied', method: 'getUserMedia-test', error: mediaErr.message };
        } else if (mediaErr.name === 'NotFoundError') {
          return { state: 'no-device', method: 'getUserMedia-test', error: 'No microphone found' };
        } else {
          // For other errors, we'll still try to proceed
          return { state: 'unknown', method: 'getUserMedia-test', error: mediaErr.message };
        }
      }
      
    } catch (err) {
      this.log('Could not check microphone permissions:', err.message);
      return { state: 'unknown', method: 'fallback', error: err.message };
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasSocket: !!this.socket,
      socketConnected: this.socket?.connected || false,
      hasSendTransport: !!this.sendTransport,
      sendTransportState: this.sendTransport?.connectionState || 'none',
      hasRecvTransport: !!this.recvTransport,
      recvTransportState: this.recvTransport?.connectionState || 'none',
      isProducing: this.isProducing,
      hasDevice: !!this.device,
      deviceLoaded: this.device?.loaded || false
    };
  }

  async connect(roomId, role = 'student') {
    if (this.isConnected) {
      this.log('Already connected');
      return true;
    }

    try {
      this.log(`Connecting to ${this.serverUrl} for room ${roomId} as ${role}`);
      this.roomId = roomId;
      this.role = role;
      
      // Create socket connection with timeout
      this.socket = io(this.serverUrl, {
        timeout: 15000, // Increased timeout
        forceNew: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });

      this.log(`Socket created for ${this.serverUrl}`);

      // Wait for connection with timeout
      const connected = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.error('Connection timeout - server may not be running on port 3001');
          reject(new Error('Connection timeout'));
        }, 15000); // Increased timeout

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.log('Socket connected successfully');
          resolve(true);
        });

        this.socket.on('connect_error', (err) => {
          clearTimeout(timeout);
          this.error(`Socket connection error: ${err.message}`, err);
          reject(err);
        });

        this.socket.on('error', (err) => {
          clearTimeout(timeout);
          this.error(`Socket error: ${err.message}`, err);
          reject(err);
        });

        this.socket.on('disconnect', (reason) => {
          this.log(`Socket disconnected: ${reason}`);
        });
      });

      if (!connected) {
        throw new Error('Failed to establish socket connection');
      }

      // Set up socket event handlers
      this.setupSocketHandlers();

      // Initialize mediasoup device
      await this.initializeDevice();

      // Join room
      await this.joinRoom();

      this.isConnected = true;
      this.updateState();
      this.log('Successfully connected to audio server');
      
      return true;

    } catch (err) {
      this.error('Connection failed', err);
      await this.cleanup();
      return false;
    }
  }

  setupSocketHandlers() {
    this.socket.on('disconnect', (reason) => {
      this.log(`Socket disconnected: ${reason}`);
      this.isConnected = false;
      this.updateState();
    });

    this.socket.on('error', (err) => {
      this.error('Socket error', err);
    });

    this.socket.on('connect_error', (err) => {
      this.error('Socket connection error', err);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.log(`Socket reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_error', (err) => {
      this.error('Socket reconnection failed', err);
    });

    this.socket.on('new-producer', async (data) => {
      try {
        this.log(`New producer received: ${data.producerId} from teacher ${data.teacherId}`);
        if (this.role === 'student') {
          this.log('Student consuming teacher audio...');
          await this.consumeAudio(data.producerId);
        } else {
          this.log('Teacher ignoring own producer event');
        }
      } catch (err) {
        this.error('Failed to consume new producer', err);
      }
    });

    this.socket.on('teacher-audio-available', async (data) => {
      try {
        this.log(`Teacher audio available: ${data.producerId} from teacher ${data.teacherId}`);
        if (this.role === 'student') {
          this.log('Student consuming existing teacher audio...');
          await this.consumeAudio(data.producerId);
        }
      } catch (err) {
        this.error('Failed to consume existing teacher audio', err);
      }
    });

    this.socket.on('producer-closed', (data) => {
      this.log(`Producer closed: ${data.producerId}`);
      const consumer = this.consumers.get(data.producerId);
      if (consumer) {
        consumer.close();
        this.consumers.delete(data.producerId);
        this.updateState();
      }
    });

    this.socket.on('transport-close', () => {
      this.log('Transport closed by server');
      this.cleanup();
    });
  }

  async initializeDevice() {
    try {
      this.log('Initializing mediasoup device...');
      
      // Get router RTP capabilities
      const routerRtpCapabilities = await this.sendRequest('get-router-rtp-capabilities');
      
      // Create device
      this.device = new Device();
      await this.device.load({ routerRtpCapabilities });
      
      this.log('Device initialized successfully');
      
    } catch (err) {
      throw new Error(`Device initialization failed: ${err.message}`);
    }
  }

  async joinRoom() {
    try {
      this.log(`Joining room: ${this.roomId}`);
      
      const response = await this.sendRequest('join-room', {
        roomId: this.roomId,
        role: this.role
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to join room');
      }

      this.log('Successfully joined room');

      // Create transports
      await this.createTransports();

    } catch (err) {
      throw new Error(`Join room failed: ${err.message}`);
    }
  }

  async createTransports() {
    try {
      // Create send transport for producers
      if (this.role === 'teacher') {
        const sendTransportInfo = await this.sendRequest('create-transport', {
          type: 'send',
          forceTcp: false,
          rtpCapabilities: this.device.rtpCapabilities
        });

        this.sendTransport = this.device.createSendTransport(sendTransportInfo);
        
        this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          try {
            this.log('Send transport connecting...');
            await this.sendRequest('connect-transport', {
              transportId: this.sendTransport.id,
              dtlsParameters
            });
            this.log('Send transport connected successfully');
            callback();
          } catch (err) {
            this.error('Send transport connection failed:', err);
            errback(err);
          }
        });

        this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
          try {
            this.log('Send transport producing...');
            const response = await this.sendRequest('produce', {
              transportId: this.sendTransport.id,
              kind,
              rtpParameters
            });
            this.log('Producer created on server, ID:', response.producerId);
            callback({ id: response.producerId });
          } catch (err) {
            this.error('Producer creation failed:', err);
            errback(err);
          }
        });

        this.sendTransport.on('connectionstatechange', (state) => {
          this.log(`Send transport connection state changed to: ${state}`);
        });

        this.log('Send transport created');
      }

      // Create receive transport for consumers
      const recvTransportInfo = await this.sendRequest('create-transport', {
        type: 'recv',
        forceTcp: false,
        rtpCapabilities: this.device.rtpCapabilities
      });

      this.recvTransport = this.device.createRecvTransport(recvTransportInfo);
      
      this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await this.sendRequest('connect-transport', {
            transportId: this.recvTransport.id,
            dtlsParameters
          });
          callback();
        } catch (err) {
          errback(err);
        }
      });

      this.log('Receive transport created');

    } catch (err) {
      throw new Error(`Transport creation failed: ${err.message}`);
    }
  }

  async startAudio() {
    // Detailed validation with logging - Updated version
    this.log(`Starting audio validation - Connected: ${this.isConnected}, SendTransport: ${!!this.sendTransport}, Producing: ${this.isProducing}`);
    
    if (!this.isConnected) {
      this.error('Cannot start audio: not connected to server');
      return false;
    }
    
    if (!this.sendTransport) {
      this.error('Cannot start audio: no send transport available');
      return false;
    }

    // Note: Transport connection state will be 'new' until we actually try to produce
    // The transport will connect automatically when we call produce()
    this.log(`Send transport state: ${this.sendTransport.connectionState} (this is normal before producing)`);

    if (this.isProducing) {
      this.log('Already producing audio');
      return true;
    }

    try {
      this.log('Starting audio production...');

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, or Safari.');
      }

      // Get user media with detailed error handling
      this.log('Requesting microphone access...');
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000
          }
        });
        this.log('Microphone access granted successfully');
      } catch (mediaError) {
        let errorMessage = 'Failed to access microphone. ';
        
        if (mediaError.name === 'NotAllowedError') {
          errorMessage += 'Microphone access was denied. Please allow microphone access and try again.';
        } else if (mediaError.name === 'NotFoundError') {
          errorMessage += 'No microphone found. Please connect a microphone and try again.';
        } else if (mediaError.name === 'NotReadableError') {
          errorMessage += 'Microphone is already in use by another application.';
        } else if (mediaError.name === 'OverconstrainedError') {
          errorMessage += 'Microphone does not support the required settings.';
        } else {
          errorMessage += `Error: ${mediaError.message}`;
        }
        
        this.error(errorMessage);
        throw new Error(errorMessage);
      }

      const audioTrack = this.localStream.getAudioTracks()[0];
      
      if (!audioTrack) {
        throw new Error('No audio track available from microphone');
      }

      this.log('Microphone stream obtained, creating audio producer...');
      this.log(`Transport state before produce: ${this.sendTransport.connectionState}`);
      
      // Create producer - this will automatically connect the transport if needed
      try {
        this.producer = await this.sendTransport.produce({
          track: audioTrack,
          codecOptions: {
            opusStereo: false,
            opusFec: true,
            opusDtx: true,
            opusMaxPlaybackRate: 48000
          }
        });
        
        this.log(`Audio producer created successfully, transport state now: ${this.sendTransport.connectionState}`);
      } catch (producerError) {
        this.log(`Producer creation failed, transport state: ${this.sendTransport.connectionState}`);
        throw new Error(`Failed to create audio producer: ${producerError.message}`);
      }

      this.producer.on('transportclose', () => {
        this.log('Producer transport closed');
        this.stopAudio();
      });

      this.producer.on('trackended', () => {
        this.log('Producer track ended');
        this.stopAudio();
      });

      this.isProducing = true;
      this.updateState();
      this.log('Audio production started');
      
      return true;

    } catch (err) {
      this.error('Failed to start audio', err);
      return false;
    }
  }

  async stopAudio() {
    if (!this.isProducing) {
      return;
    }

    try {
      this.log('Stopping audio production...');

      if (this.producer) {
        this.producer.close();
        this.producer = null;
      }

      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      this.isProducing = false;
      this.isMuted = false;
      this.updateState();
      this.log('Audio production stopped');

    } catch (err) {
      this.error('Error stopping audio', err);
    }
  }

  toggleMute() {
    if (!this.producer) {
      this.log('No producer to mute');
      return;
    }

    try {
      if (this.isMuted) {
        this.producer.resume();
        this.log('Audio unmuted');
      } else {
        this.producer.pause();
        this.log('Audio muted');
      }

      this.isMuted = !this.isMuted;
      this.updateState();

    } catch (err) {
      this.error('Error toggling mute', err);
    }
  }

  toggleRemoteMute() {
    try {
      this.consumers.forEach(consumer => {
        if (this.isRemoteMuted) {
          consumer.resume();
        } else {
          consumer.pause();
        }
      });

      this.isRemoteMuted = !this.isRemoteMuted;
      this.updateState();
      this.log(`Remote audio ${this.isRemoteMuted ? 'muted' : 'unmuted'}`);

    } catch (err) {
      this.error('Error toggling remote mute', err);
    }
  }

  async consumeAudio(producerId) {
    if (!this.recvTransport) {
      this.error('No receive transport available for consuming');
      return;
    }

    try {
      this.log(`Consuming audio from producer: ${producerId}`);

      const consumerInfo = await this.sendRequest('consume', {
        transportId: this.recvTransport.id,
        producerId,
        rtpCapabilities: this.device.rtpCapabilities
      });

      const consumer = await this.recvTransport.consume(consumerInfo);

      consumer.on('transportclose', () => {
        this.log(`Consumer transport closed: ${producerId}`);
        this.consumers.delete(producerId);
        this.updateState();
      });

      consumer.on('producerclose', () => {
        this.log(`Consumer producer closed: ${producerId}`);
        consumer.close();
        this.consumers.delete(producerId);
        this.updateState();
      });

      // Resume consumer
      await this.sendRequest('resume-consumer', {
        consumerId: consumer.id
      });

      this.consumers.set(producerId, consumer);
      
      // Handle audio playback
      this.handleAudioPlayback(consumer);
      
      this.updateState();
      this.log(`Successfully consuming audio: ${producerId}`);

    } catch (err) {
      this.error('Failed to consume audio', err);
    }
  }

  handleAudioPlayback(consumer) {
    try {
      // Create audio element for playback
      const audioElement = document.createElement('audio');
      audioElement.srcObject = new MediaStream([consumer.track]);
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      audioElement.volume = 1.0;
      
      // Attempt to play (handle browser autoplay policies)
      const playPromise = audioElement.play();
      if (playPromise) {
        playPromise.catch(err => {
          console.warn('Audio autoplay failed:', err);
          // Could show a user interaction button here
        });
      }

      this.log('Audio playback setup complete');

    } catch (err) {
      this.error('Failed to setup audio playback', err);
    }
  }

  async disconnect() {
    this.log('Disconnecting...');
    await this.cleanup();
  }

  async cleanup() {
    try {
      // Stop audio production
      await this.stopAudio();

      // Close consumers
      this.consumers.forEach(consumer => {
        try {
          consumer.close();
        } catch (err) {
          console.warn('Error closing consumer:', err);
        }
      });
      this.consumers.clear();

      // Close transports
      if (this.sendTransport) {
        this.sendTransport.close();
        this.sendTransport = null;
      }

      if (this.recvTransport) {
        this.recvTransport.close();
        this.recvTransport = null;
      }

      // Close socket
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // Reset device
      this.device = null;

      // Reset state
      this.isConnected = false;
      this.isProducing = false;
      this.isMuted = false;
      this.isRemoteMuted = false;
      this.roomId = null;
      this.role = null;

      // Only update state if not destroyed to prevent React errors
      if (!this.isDestroyed) {
        this.updateState();
      }
      this.log('Cleanup completed');

    } catch (err) {
      this.error('Error during cleanup', err);
    }
  }

  destroy() {
    this.isDestroyed = true; // Set flag to prevent state updates during cleanup
    this.cleanup();
  }

  // Helper method to send requests with timeout
  sendRequest(event, data = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout: ${event}`));
      }, 10000);

      this.socket.emit(event, data, (response) => {
        clearTimeout(timeout);
        
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
}

export default AudioManager;