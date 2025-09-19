import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';

class AudioClient {
  constructor() {
    this.socket = null;
    this.device = null;
    this.producerTransport = null;
    this.consumerTransport = null;
    this.producer = null;
    this.consumer = null;
    this.localStream = null;
    this.remoteAudio = null;
    
    this.roomId = null;
    this.role = 'student';
    this.isConnected = false;
    this.isProducing = false;
    this.isMuted = false;
    
    this.initializeUI();
  }

  initializeUI() {
    // DOM elements
    this.elements = {
      roomIdInput: document.getElementById('roomId'),
      roleButtons: document.querySelectorAll('.role-btn'),
      joinBtn: document.getElementById('joinBtn'),
      leaveBtn: document.getElementById('leaveBtn'),
      connectionStatus: document.getElementById('connectionStatus'),
      roomInfo: document.getElementById('roomInfo'),
      roomDetails: document.getElementById('roomDetails'),
      teacherControls: document.getElementById('teacherControls'),
      studentControls: document.getElementById('studentControls'),
      startAudioBtn: document.getElementById('startAudioBtn'),
      stopAudioBtn: document.getElementById('stopAudioBtn'),
      muteBtn: document.getElementById('muteBtn'),
      studentMuteBtn: document.getElementById('studentMuteBtn'),
      teacherVolumeLevel: document.getElementById('teacherVolumeLevel'),
      studentVolumeLevel: document.getElementById('studentVolumeLevel'),
      remoteAudio: document.getElementById('remoteAudio'),
      logs: document.getElementById('logs')
    };

    this.setupEventListeners();
    this.log('Audio client initialized');
  }

  setupEventListeners() {
    // Role selection
    this.elements.roleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.roleButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.role = btn.dataset.role;
        this.log(`Role selected: ${this.role}`);
      });
    });

    // Connection controls
    this.elements.joinBtn.addEventListener('click', () => this.joinRoom());
    this.elements.leaveBtn.addEventListener('click', () => this.leaveRoom());

    // Teacher controls
    this.elements.startAudioBtn.addEventListener('click', () => this.startAudio());
    this.elements.stopAudioBtn.addEventListener('click', () => this.stopAudio());
    this.elements.muteBtn.addEventListener('click', () => this.toggleMute());

    // Student controls
    this.elements.studentMuteBtn.addEventListener('click', () => this.toggleRemoteMute());
  }

  async joinRoom() {
    try {
      this.roomId = this.elements.roomIdInput.value.trim();
      if (!this.roomId) {
        this.log('Please enter a room ID', 'error');
        return;
      }

      this.updateConnectionStatus('connecting');
      this.log(`Joining room ${this.roomId} as ${this.role}...`);

      // Connect to server
      this.socket = io('http://localhost:3001');
      
      this.setupSocketListeners();
      
      // Wait for connection
      await this.waitForConnection();
      
      // Join room with role
      this.socket.emit('join-room', { roomId: this.roomId, role: this.role });
      
    } catch (error) {
      this.log(`Error joining room: ${error.message}`, 'error');
      this.updateConnectionStatus('disconnected');
    }
  }

  async leaveRoom() {
    try {
      this.log('Leaving room...');
      
      // Clean up media
      if (this.producer) {
        this.producer.close();
        this.producer = null;
      }
      
      if (this.consumer) {
        this.consumer.close();
        this.consumer = null;
      }
      
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      // Close transports
      if (this.producerTransport) {
        this.producerTransport.close();
        this.producerTransport = null;
      }
      
      if (this.consumerTransport) {
        this.consumerTransport.close();
        this.consumerTransport = null;
      }
      
      // Disconnect socket
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      
      this.isConnected = false;
      this.isProducing = false;
      this.updateConnectionStatus('disconnected');
      this.updateUI();
      
      this.log('Left room successfully');
      
    } catch (error) {
      this.log(`Error leaving room: ${error.message}`, 'error');
    }
  }

  setupSocketListeners() {
    this.socket.on('connect', () => {
      this.log('Connected to server');
    });

    this.socket.on('joined-room', async (data) => {
      this.log(`Joined room: ${JSON.stringify(data)}`);
      this.isConnected = true;
      this.updateConnectionStatus('connected');
      this.updateRoomInfo(data.roomInfo);
      this.updateUI();
      
      try {
        await this.initializeDevice();
        
        if (this.role === 'student') {
          await this.createConsumerTransport();
        } else if (this.role === 'teacher') {
          // Teachers automatically create producer transport
          await this.createProducerTransport();
        }
      } catch (error) {
        this.log(`Error after joining: ${error.message}`, 'error');
      }
    });

    this.socket.on('teacher-audio-available', async (data) => {
      this.log(`Teacher audio available: ${data.producerId}`);
      if (this.role === 'student') {
        await this.consumeAudio(data.producerId);
      }
    });

    this.socket.on('participant-joined', (data) => {
      this.log(`Participant joined: ${data.role} (${data.participantId})`);
      this.updateRoomInfo(data.roomInfo);
    });

    this.socket.on('participant-left', (data) => {
      this.log(`Participant left: ${data.role} (${data.participantId})`);
      this.updateRoomInfo(data.roomInfo);
    });

    this.socket.on('teacher-left', () => {
      this.log('Teacher left the room');
      if (this.consumer) {
        this.consumer.close();
        this.consumer = null;
      }
    });

    this.socket.on('teacher-muted', () => {
      this.log('Teacher muted audio');
    });

    this.socket.on('teacher-unmuted', () => {
      this.log('Teacher unmuted audio');
    });

    this.socket.on('error', (data) => {
      this.log(`Server error: ${data.message}`, 'error');
    });

    this.socket.on('disconnect', () => {
      this.log('Disconnected from server');
      this.isConnected = false;
      this.updateConnectionStatus('disconnected');
      this.updateUI();
    });
  }

  async initializeDevice() {
    try {
      this.log('Initializing mediasoup device...');
      
      // Get router capabilities
      this.socket.emit('get-router-capabilities', { roomId: this.roomId });
      
      const capabilities = await new Promise((resolve, reject) => {
        this.socket.once('router-capabilities', resolve);
        this.socket.once('error', reject);
        setTimeout(() => reject(new Error('Timeout getting capabilities')), 5000);
      });
      
      // Create device
      this.device = new Device();
      await this.device.load({ routerRtpCapabilities: capabilities });
      
      this.log('Device initialized successfully');
      
    } catch (error) {
      throw new Error(`Failed to initialize device: ${error.message}`);
    }
  }

  async createProducerTransport() {
    try {
      this.log('Creating producer transport...');
      
      this.socket.emit('create-producer-transport', { roomId: this.roomId });
      
      const transportParams = await new Promise((resolve, reject) => {
        this.socket.once('producer-transport-created', resolve);
        this.socket.once('error', reject);
        setTimeout(() => reject(new Error('Timeout creating producer transport')), 5000);
      });
      
      this.producerTransport = this.device.createSendTransport(transportParams);
      
      // Handle transport events
      this.producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          this.socket.emit('connect-transport', {
            transportId: transportParams.id,
            dtlsParameters
          });
          
          await new Promise((resolve, reject) => {
            this.socket.once('transport-connected', resolve);
            this.socket.once('error', reject);
          });
          
          callback();
        } catch (error) {
          errback(error);
        }
      });
      
      this.producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          this.socket.emit('create-producer', {
            transportId: transportParams.id,
            kind,
            rtpParameters
          });
          
          const { id } = await new Promise((resolve, reject) => {
            this.socket.once('producer-created', resolve);
            this.socket.once('error', reject);
          });
          
          callback({ id });
        } catch (error) {
          errback(error);
        }
      });
      
      this.log('Producer transport created');
      
    } catch (error) {
      throw new Error(`Failed to create producer transport: ${error.message}`);
    }
  }

  async createConsumerTransport() {
    try {
      this.log('Creating consumer transport...');
      
      this.socket.emit('create-consumer-transport', { roomId: this.roomId });
      
      const transportParams = await new Promise((resolve, reject) => {
        this.socket.once('consumer-transport-created', resolve);
        this.socket.once('error', reject);
        setTimeout(() => reject(new Error('Timeout creating consumer transport')), 5000);
      });
      
      this.consumerTransport = this.device.createRecvTransport(transportParams);
      
      // Handle transport events
      this.consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          this.socket.emit('connect-transport', {
            transportId: transportParams.id,
            dtlsParameters
          });
          
          await new Promise((resolve, reject) => {
            this.socket.once('transport-connected', resolve);
            this.socket.once('error', reject);
          });
          
          callback();
        } catch (error) {
          errback(error);
        }
      });
      
      this.log('Consumer transport created');
      
    } catch (error) {
      throw new Error(`Failed to create consumer transport: ${error.message}`);
    }
  }

  async startAudio() {
    try {
      if (this.role !== 'teacher') {
        this.log('Only teachers can start audio', 'error');
        return;
      }

      this.log('Starting audio production...');
      
      // Get user media with audio constraints
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // Force mono
          sampleRate: 48000,
          bitrate: 160000 // 160kbps
        }
      });
      
      // Ensure we have producer transport
      if (!this.producerTransport) {
        this.log('Producer transport not ready, creating...', 'error');
        await this.createProducerTransport();
      }
      
      // Get audio track
      const audioTrack = this.localStream.getAudioTracks()[0];
      
      // Create producer
      this.producer = await this.producerTransport.produce({
        track: audioTrack,
        codecOptions: {
          opusStereo: false, // Force mono
          opusDtx: true, // Discontinuous transmission
          opusFec: true, // Forward error correction
          opusPtime: 20, // 20ms frame size for low latency
          opusMaxPlaybackRate: 48000,
          opusMaxAverageBitrate: 160000 // 160kbps target
        }
      });
      
      // Monitor audio levels
      this.startAudioMonitoring(audioTrack);
      
      this.isProducing = true;
      this.updateUI();
      
      this.log('Audio production started successfully');
      
    } catch (error) {
      this.log(`Error starting audio: ${error.message}`, 'error');
    }
  }

  async stopAudio() {
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
      this.updateUI();
      
      this.log('Audio production stopped');
      
    } catch (error) {
      this.log(`Error stopping audio: ${error.message}`, 'error');
    }
  }

  async consumeAudio(producerId) {
    try {
      this.log(`Consuming audio from producer: ${producerId}`);
      
      if (!this.consumerTransport) {
        this.log('Consumer transport not ready', 'error');
        return;
      }
      
      // Create consumer
      this.socket.emit('create-consumer', {
        producerId,
        rtpCapabilities: this.device.rtpCapabilities
      });
      
      const consumerData = await new Promise((resolve, reject) => {
        this.socket.once('consumer-created', resolve);
        this.socket.once('error', reject);
        setTimeout(() => reject(new Error('Timeout creating consumer')), 5000);
      });
      
      this.consumer = await this.consumerTransport.consume({
        id: consumerData.id,
        producerId: consumerData.producerId,
        kind: consumerData.kind,
        rtpParameters: consumerData.rtpParameters
      });
      
      // Get remote stream
      const remoteStream = new MediaStream([this.consumer.track]);
      this.elements.remoteAudio.srcObject = remoteStream;
      
      // Resume consumer
      this.socket.emit('resume-consumer', { consumerId: this.consumer.id });
      
      // Monitor remote audio levels
      this.startRemoteAudioMonitoring(this.consumer.track);
      
      this.log('Audio consumption started successfully');
      
    } catch (error) {
      this.log(`Error consuming audio: ${error.message}`, 'error');
    }
  }

  toggleMute() {
    if (!this.producer) return;
    
    this.isMuted = !this.isMuted;
    
    if (this.isMuted) {
      this.producer.pause();
      this.socket.emit('teacher-mute');
      this.elements.muteBtn.textContent = 'Unmute';
      this.log('Audio muted');
    } else {
      this.producer.resume();
      this.socket.emit('teacher-unmute');
      this.elements.muteBtn.textContent = 'Mute';
      this.log('Audio unmuted');
    }
  }

  toggleRemoteMute() {
    if (!this.elements.remoteAudio) return;
    
    this.elements.remoteAudio.muted = !this.elements.remoteAudio.muted;
    this.elements.studentMuteBtn.textContent = 
      this.elements.remoteAudio.muted ? 'Unmute Teacher' : 'Mute Teacher';
    
    this.log(`Teacher audio ${this.elements.remoteAudio.muted ? 'muted' : 'unmuted'} locally`);
  }

  startAudioMonitoring(track) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(new MediaStream([track]));
    const analyser = audioContext.createAnalyser();
    
    source.connect(analyser);
    analyser.fftSize = 256;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const percentage = (average / 255) * 100;
      
      this.elements.teacherVolumeLevel.style.width = `${percentage}%`;
      
      if (this.isProducing) {
        requestAnimationFrame(updateLevel);
      }
    };
    
    updateLevel();
  }

  startRemoteAudioMonitoring(track) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(new MediaStream([track]));
    const analyser = audioContext.createAnalyser();
    
    source.connect(analyser);
    analyser.fftSize = 256;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const percentage = (average / 255) * 100;
      
      this.elements.studentVolumeLevel.style.width = `${percentage}%`;
      
      if (this.consumer && !this.consumer.closed) {
        requestAnimationFrame(updateLevel);
      }
    };
    
    updateLevel();
  }

  waitForConnection() {
    return new Promise((resolve, reject) => {
      if (this.socket.connected) {
        resolve();
        return;
      }
      
      this.socket.once('connect', resolve);
      this.socket.once('connect_error', reject);
      
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  updateConnectionStatus(status) {
    this.elements.connectionStatus.className = `status ${status}`;
    
    switch (status) {
      case 'connected':
        this.elements.connectionStatus.textContent = '🟢 Connected';
        break;
      case 'connecting':
        this.elements.connectionStatus.textContent = '🟡 Connecting...';
        break;
      case 'disconnected':
        this.elements.connectionStatus.textContent = '🔴 Disconnected';
        break;
    }
  }

  updateRoomInfo(roomInfo) {
    if (!roomInfo) {
      this.elements.roomInfo.style.display = 'none';
      return;
    }
    
    this.elements.roomDetails.innerHTML = `
      <p><strong>Room ID:</strong> ${roomInfo.id}</p>
      <p><strong>Participants:</strong> ${roomInfo.participantCount}</p>
      <p><strong>Teacher Present:</strong> ${roomInfo.hasTeacher ? '✅' : '❌'}</p>
      <p><strong>Students:</strong> ${roomInfo.studentCount}</p>
    `;
    
    this.elements.roomInfo.style.display = 'block';
  }

  updateUI() {
    // Connection controls
    this.elements.joinBtn.disabled = this.isConnected;
    this.elements.leaveBtn.disabled = !this.isConnected;
    
    // Role-specific controls
    if (this.role === 'teacher') {
      this.elements.teacherControls.style.display = this.isConnected ? 'block' : 'none';
      this.elements.studentControls.style.display = 'none';
      
      if (this.isConnected) {
        this.elements.startAudioBtn.disabled = this.isProducing;
        this.elements.stopAudioBtn.disabled = !this.isProducing;
        this.elements.muteBtn.disabled = !this.isProducing;
      }
    } else {
      this.elements.teacherControls.style.display = 'none';
      this.elements.studentControls.style.display = this.isConnected ? 'block' : 'none';
      
      if (this.isConnected) {
        this.elements.studentMuteBtn.disabled = !this.consumer;
      }
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    this.elements.logs.textContent += logEntry;
    this.elements.logs.scrollTop = this.elements.logs.scrollHeight;
    
    // Also log to console
    console.log(`[AudioClient] ${message}`);
    
    if (type === 'error') {
      console.error(`[AudioClient] ${message}`);
    }
  }
}

// Initialize client when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.audioClient = new AudioClient();
});