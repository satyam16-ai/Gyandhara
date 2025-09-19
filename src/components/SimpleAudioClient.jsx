import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

const SimpleAudioClient = ({ roomId, isTeacher }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProducing, setIsProducing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [audioReceiving, setAudioReceiving] = useState(false);
  
  // Refs for WebRTC objects
  const socketRef = useRef(null);
  const deviceRef = useRef(null);
  const producerTransportRef = useRef(null);
  const consumerTransportRef = useRef(null);
  const producerRef = useRef(null);
  const consumerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  
  const role = isTeacher ? 'teacher' : 'student';
  
  const log = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[SimpleAudioClient] [${timestamp}] ${message}`);
    if (type === 'error') {
      console.error(`[SimpleAudioClient] ${message}`);
    }
  }, []);

  // Join room function - exact replica of working client
  const joinRoom = useCallback(async () => {
    try {
      if (!roomId) {
        setError('Room ID is required');
        return;
      }

      setIsConnecting(true);
      setError(null);
      log(`Joining room ${roomId} as ${role}...`);

      // Connect to server
      const serverUrl = process.env.NEXT_PUBLIC_WEBRTC_SERVER_URL || 'http://localhost:3001';
      socketRef.current = io(serverUrl);
      
      setupSocketListeners();
      
      // Wait for connection
      await waitForConnection();
      
      // Join room with role
      socketRef.current.emit('join-room', { roomId, role });
      
    } catch (error) {
      log(`Error joining room: ${error.message}`, 'error');
      setError(`Connection failed: ${error.message}`);
      setIsConnecting(false);
    }
  }, [roomId, role]);

  // Leave room function
  const leaveRoom = useCallback(async () => {
    try {
      log('Leaving room...');
      
      // Clean up media
      if (producerRef.current) {
        producerRef.current.close();
        producerRef.current = null;
      }
      
      if (consumerRef.current) {
        consumerRef.current.close();
        consumerRef.current = null;
      }
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      
      // Close transports
      if (producerTransportRef.current) {
        producerTransportRef.current.close();
        producerTransportRef.current = null;
      }
      
      if (consumerTransportRef.current) {
        consumerTransportRef.current.close();
        consumerTransportRef.current = null;
      }
      
      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      setIsConnected(false);
      setIsProducing(false);
      setIsConnecting(false);
      setError(null);
      
      log('Left room successfully');
      
    } catch (error) {
      log(`Error leaving room: ${error.message}`, 'error');
    }
  }, []);

  // Setup socket listeners - exact replica
  const setupSocketListeners = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.on('connect', () => {
      log('Connected to server');
    });

    socketRef.current.on('joined-room', async (data) => {
      log(`Joined room: ${JSON.stringify(data)}`);
      setIsConnected(true);
      setIsConnecting(false);
      
      try {
        await initializeDevice();
        
        if (role === 'student') {
          await createConsumerTransport();
        } else if (role === 'teacher') {
          await createProducerTransport();
        }
      } catch (error) {
        log(`Error after joining: ${error.message}`, 'error');
        setError(`Setup failed: ${error.message}`);
      }
    });

    socketRef.current.on('teacher-audio-available', async (data) => {
      log(`Teacher audio available: ${data.producerId}`);
      if (role === 'student') {
        // Wait for consumer transport to be ready before consuming
        const waitForTransport = async () => {
          let attempts = 0;
          while (!consumerTransportRef.current && attempts < 10) {
            log(`Waiting for consumer transport... attempt ${attempts + 1}`);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
          }
          if (consumerTransportRef.current) {
            await consumeAudio(data.producerId);
          } else {
            log('Consumer transport failed to initialize after 5 seconds', 'error');
          }
        };
        waitForTransport();
      }
    });

    socketRef.current.on('error', (data) => {
      log(`Server error: ${data.message}`, 'error');
      setError(`Server error: ${data.message}`);
    });

    socketRef.current.on('disconnect', () => {
      log('Disconnected from server');
      setIsConnected(false);
      setIsConnecting(false);
    });
  }, [role]);

  // Initialize device - exact replica
  const initializeDevice = useCallback(async () => {
    try {
      log('Initializing mediasoup device...');
      
      // Get router capabilities
      socketRef.current.emit('get-router-capabilities', { roomId });
      
      const capabilities = await new Promise((resolve, reject) => {
        socketRef.current.once('router-capabilities', resolve);
        socketRef.current.once('error', reject);
        setTimeout(() => reject(new Error('Timeout getting capabilities')), 5000);
      });
      
      // Create device
      deviceRef.current = new Device();
      await deviceRef.current.load({ routerRtpCapabilities: capabilities });
      
      log('Device initialized successfully');
      
    } catch (error) {
      throw new Error(`Failed to initialize device: ${error.message}`);
    }
  }, [roomId]);

  // Create producer transport - exact replica
  const createProducerTransport = useCallback(async () => {
    try {
      log('Creating producer transport...');
      
      socketRef.current.emit('create-producer-transport', { roomId });
      
      const transportParams = await new Promise((resolve, reject) => {
        socketRef.current.once('producer-transport-created', resolve);
        socketRef.current.once('error', reject);
        setTimeout(() => reject(new Error('Timeout creating producer transport')), 5000);
      });
      
      producerTransportRef.current = deviceRef.current.createSendTransport(transportParams);
      
      // Handle transport events
      producerTransportRef.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          socketRef.current.emit('connect-transport', {
            transportId: transportParams.id,
            dtlsParameters
          });
          
          await new Promise((resolve, reject) => {
            socketRef.current.once('transport-connected', resolve);
            socketRef.current.once('error', reject);
          });
          
          callback();
        } catch (error) {
          errback(error);
        }
      });
      
      producerTransportRef.current.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          socketRef.current.emit('create-producer', {
            transportId: transportParams.id,
            kind,
            rtpParameters
          });
          
          const { id } = await new Promise((resolve, reject) => {
            socketRef.current.once('producer-created', resolve);
            socketRef.current.once('error', reject);
          });
          
          callback({ id });
        } catch (error) {
          errback(error);
        }
      });
      
      log('Producer transport created');
      
    } catch (error) {
      throw new Error(`Failed to create producer transport: ${error.message}`);
    }
  }, [roomId]);

  // Create consumer transport - exact replica
  const createConsumerTransport = useCallback(async () => {
    try {
      log('Creating consumer transport...');
      
      socketRef.current.emit('create-consumer-transport', { roomId });
      
      const transportParams = await new Promise((resolve, reject) => {
        socketRef.current.once('consumer-transport-created', resolve);
        socketRef.current.once('error', reject);
        setTimeout(() => reject(new Error('Timeout creating consumer transport')), 5000);
      });
      
      consumerTransportRef.current = deviceRef.current.createRecvTransport(transportParams);
      
      // Handle transport events
      consumerTransportRef.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          socketRef.current.emit('connect-transport', {
            transportId: transportParams.id,
            dtlsParameters
          });
          
          await new Promise((resolve, reject) => {
            socketRef.current.once('transport-connected', resolve);
            socketRef.current.once('error', reject);
          });
          
          callback();
        } catch (error) {
          errback(error);
        }
      });
      
      log('Consumer transport created');
      
    } catch (error) {
      throw new Error(`Failed to create consumer transport: ${error.message}`);
    }
  }, [roomId]);

  // Start audio - exact replica
  const startAudio = useCallback(async () => {
    try {
      if (role !== 'teacher') {
        setError('Only teachers can start audio');
        return;
      }

      log('Starting audio production...');
      
      // Get user media with enhanced audio constraints for better quality
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // Mono for voice
          sampleRate: 48000, // High quality sample rate
          sampleSize: 16, // 16-bit audio
          volume: 1.0, // Full volume
          // Enhanced constraints for better voice quality
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true,
          googAudioMirroring: false
        }
      });
      
      // Ensure we have producer transport
      if (!producerTransportRef.current) {
        log('Producer transport not ready, creating...', 'error');
        await createProducerTransport();
      }
      
      // Get audio track
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      
      // Create producer with enhanced codec options for voice clarity
      producerRef.current = await producerTransportRef.current.produce({
        track: audioTrack,
        codecOptions: {
          opusStereo: false, // Keep mono for voice
          opusDtx: true, // Discontinuous transmission for bandwidth efficiency
          opusFec: true, // Forward error correction for reliability
          opusPtime: 20, // 20ms frame size for low latency
          opusMaxPlaybackRate: 48000, // High quality playback
          opusMaxAverageBitrate: 320000, // Increased bitrate for better quality (320kbps)
          opusUseDtx: true, // Use discontinuous transmission
          opusSpropStereo: 0, // Mono signaling
          opusUseinbandfec: 1 // Use in-band forward error correction
        }
      });
      
      setIsProducing(true);
      log('Audio production started successfully');
      
    } catch (error) {
      log(`Error starting audio: ${error.message}`, 'error');
      setError(`Failed to start audio: ${error.message}`);
    }
  }, [role, createProducerTransport]);

  // Stop audio
  const stopAudio = useCallback(async () => {
    try {
      log('Stopping audio production...');
      
      if (producerRef.current) {
        producerRef.current.close();
        producerRef.current = null;
      }
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      
      setIsProducing(false);
      setIsMuted(false);
      log('Audio production stopped');
      
    } catch (error) {
      log(`Error stopping audio: ${error.message}`, 'error');
    }
  }, []);

  // Consume audio - exact replica with better transport handling
  const consumeAudio = useCallback(async (producerId) => {
    try {
      log(`Consuming audio from producer: ${producerId}`);
      
      if (!consumerTransportRef.current) {
        log('Consumer transport not ready, creating it first...', 'error');
        await createConsumerTransport();
        // Wait a bit for transport to be fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!consumerTransportRef.current) {
        log('Failed to create consumer transport', 'error');
        return;
      }
      
      // Create consumer
      socketRef.current.emit('create-consumer', {
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities
      });
      
      const consumerData = await new Promise((resolve, reject) => {
        socketRef.current.once('consumer-created', resolve);
        socketRef.current.once('error', reject);
        setTimeout(() => reject(new Error('Timeout creating consumer')), 5000);
      });
      
      consumerRef.current = await consumerTransportRef.current.consume({
        id: consumerData.id,
        producerId: consumerData.producerId,
        kind: consumerData.kind,
        rtpParameters: consumerData.rtpParameters
      });
      
      // Get remote stream and ensure audio plays
      const remoteStream = new MediaStream([consumerRef.current.track]);
      
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.muted = false;
        
        // Add event listeners for debugging
        remoteAudioRef.current.onloadedmetadata = () => {
          log('Remote audio metadata loaded');
        };
        
        remoteAudioRef.current.oncanplay = () => {
          log('Remote audio can play');
        };
        
        remoteAudioRef.current.onplay = () => {
          log('Remote audio started playing');
          setAudioReceiving(true);
        };
        
        remoteAudioRef.current.onpause = () => {
          log('Remote audio paused');
          setAudioReceiving(false);
        };
        
        remoteAudioRef.current.onerror = (e) => {
          log(`Remote audio error: ${e.target.error?.message || 'Unknown error'}`, 'error');
        };
        
        // Try to play the audio with user interaction fallback
        try {
          const playPromise = remoteAudioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              log('Remote audio playing successfully');
            }).catch(playError => {
              log(`Audio play failed (user interaction required): ${playError.message}`);
              
              // Add click handler to enable audio
              const enableAudio = async () => {
                try {
                  await remoteAudioRef.current.play();
                  log('Audio enabled after user interaction');
                  document.removeEventListener('click', enableAudio);
                  document.removeEventListener('touchstart', enableAudio);
                } catch (retryError) {
                  log(`Still failed to play after interaction: ${retryError.message}`, 'error');
                }
              };
              
              document.addEventListener('click', enableAudio, { once: true });
              document.addEventListener('touchstart', enableAudio, { once: true });
              
              // Show message to user
              setError('Click anywhere to enable audio');
              setTimeout(() => setError(null), 5000);
            });
          }
        } catch (immediateError) {
          log(`Immediate audio play error: ${immediateError.message}`, 'error');
        }
      } else {
        log('No audio element found!', 'error');
      }
      
      // Resume consumer
      socketRef.current.emit('resume-consumer', { consumerId: consumerRef.current.id });
      
      log('Audio consumption started successfully');
      
    } catch (error) {
      log(`Error consuming audio: ${error.message}`, 'error');
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!producerRef.current) return;
    
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (newMutedState) {
      producerRef.current.pause();
      socketRef.current.emit('teacher-mute');
      log('Audio muted');
    } else {
      producerRef.current.resume();
      socketRef.current.emit('teacher-unmute');
      log('Audio unmuted');
    }
  }, [isMuted]);

  // Wait for connection
  const waitForConnection = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (socketRef.current.connected) {
        resolve();
        return;
      }
      
      socketRef.current.once('connect', resolve);
      socketRef.current.once('connect_error', reject);
      
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return (
    <div className="flex items-center space-x-2">
      {/* Enhanced audio element for students with better quality settings */}
      {role === 'student' && (
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          volume={1.0}
          style={{ display: 'none' }}
          // Enhanced audio attributes for better quality
          preload="auto"
          controls={false}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="text-red-500 text-sm max-w-xs truncate" title={error}>
          ⚠️ {error}
        </div>
      )}

      {role === 'teacher' ? (
        <>
          {/* Teacher: Join/Leave Button */}
          <button
            onClick={isConnected ? leaveRoom : joinRoom}
            disabled={isConnecting}
            className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 backdrop-blur-md border shadow-lg hover:shadow-xl ${
              isConnected 
                ? 'bg-red-500/80 hover:bg-red-600/80 text-white border-red-400/30' 
                : 'bg-green-500/80 hover:bg-green-600/80 text-white border-green-400/30'
            }`}
            title={isConnected ? 'Leave Audio' : 'Join Audio'}
          >
            {isConnecting ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : isConnected ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-sm">
              {isConnected ? 'Leave' : 'Join'}
            </span>
          </button>

          {/* Teacher: Start/Stop Audio Button (only when connected) */}
          {isConnected && (
            <button
              onClick={isProducing ? stopAudio : startAudio}
              className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 backdrop-blur-md border shadow-lg hover:shadow-xl ${
                isProducing 
                  ? 'bg-blue-500/80 hover:bg-blue-600/80 text-white border-blue-400/30' 
                  : 'bg-gray-500/80 hover:bg-gray-600/80 text-white border-gray-400/30'
              }`}
              title={isProducing ? 'Stop Mic' : 'Start Mic'}
            >
              {isProducing ? (
                <Mic className="w-4 h-4" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
              <span className="hidden sm:inline text-sm">
                {isProducing ? 'Stop Mic' : 'Start Mic'}
              </span>
            </button>
          )}

          {/* Teacher: Mute/Unmute Button (only when producing) */}
          {isProducing && (
            <button
              onClick={toggleMute}
              className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 backdrop-blur-md border shadow-lg hover:shadow-xl ${
                isMuted 
                  ? 'bg-orange-500/80 hover:bg-orange-600/80 text-white border-orange-400/30' 
                  : 'bg-green-500/80 hover:bg-green-600/80 text-white border-green-400/30'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              <span className="hidden sm:inline text-sm">
                {isMuted ? 'Unmute' : 'Mute'}
              </span>
            </button>
          )}
        </>
      ) : (
        <>
          {/* Student: Join/Leave Button */}
          <button
            onClick={isConnected ? leaveRoom : joinRoom}
            disabled={isConnecting}
            className={`px-3 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 backdrop-blur-md border shadow-lg hover:shadow-xl ${
              isConnected 
                ? 'bg-green-500/80 hover:bg-green-600/80 text-white border-green-400/30' 
                : 'bg-blue-500/80 hover:bg-blue-600/80 text-white border-blue-400/30'
            }`}
            title={isConnected ? 'Connected - Listening' : 'Join Audio'}
          >
            {isConnecting ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : isConnected ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-sm">
              {isConnected ? (audioReceiving ? 'Receiving Audio' : 'Connected') : 'Join'}
            </span>
            {isConnected && (
              <div className={`w-2 h-2 rounded-full ${audioReceiving ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
            )}
          </button>
        </>
      )}
      
      {/* Audio element for receiving teacher's audio */}
      {role === 'student' && (
        <audio 
          ref={remoteAudioRef} 
          autoPlay 
          playsInline
          controls={false}
          volume={1.0}
          muted={false}
          style={{ 
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: '200px',
            height: '40px',
            zIndex: 1000,
            opacity: isConnected ? 1 : 0,
            pointerEvents: isConnected ? 'auto' : 'none'
          }}
        />
      )}
    </div>
  );
};

export default SimpleAudioClient;