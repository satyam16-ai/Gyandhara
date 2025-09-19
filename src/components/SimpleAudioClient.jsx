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
      
      log(`Consumer data received: ${JSON.stringify({
        id: consumerData.id,
        kind: consumerData.kind,
        producerId: consumerData.producerId
      })}`);
      
      consumerRef.current = await consumerTransportRef.current.consume({
        id: consumerData.id,
        producerId: consumerData.producerId,
        kind: consumerData.kind,
        rtpParameters: consumerData.rtpParameters
      });
      
      // Debug consumer track
      const track = consumerRef.current.track;
      log(`Consumer track created - ID: ${track.id}, Kind: ${track.kind}, Enabled: ${track.enabled}, ReadyState: ${track.readyState}`);
      
      // Get remote stream and ensure audio plays
      const remoteStream = new MediaStream([track]);
      log(`Remote stream created - ID: ${remoteStream.id}, Active: ${remoteStream.active}, Tracks: ${remoteStream.getTracks().length}`);
      
      // Log track state changes
      track.addEventListener('ended', () => log('Track ended'));
      track.addEventListener('mute', () => log('Track muted'));
      track.addEventListener('unmute', () => log('Track unmuted'));
      
      if (remoteAudioRef.current) {
        log('Setting up audio element...');
        
        // For live streams, we need to handle the audio differently
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.muted = false;
        
        // Set properties for live streaming
        remoteAudioRef.current.autoplay = true;
        remoteAudioRef.current.playsInline = true;
        remoteAudioRef.current.defaultMuted = false;
        
        // Enhanced event listeners for debugging
        remoteAudioRef.current.onloadstart = () => log('Audio: Load start');
        remoteAudioRef.current.onloadeddata = () => {
          log('Audio: Data loaded');
          // For live streams, duration will be Infinity or 0
          log(`Audio duration: ${remoteAudioRef.current.duration} (Live stream)`);
        };
        remoteAudioRef.current.onloadedmetadata = () => {
          log(`Audio metadata loaded - Duration: ${remoteAudioRef.current.duration || 'Live'}, Volume: ${remoteAudioRef.current.volume}`);
          // Live streams have infinite or undefined duration
          if (remoteAudioRef.current.duration === Infinity || isNaN(remoteAudioRef.current.duration)) {
            log('Confirmed: This is a live audio stream');
          }
        };
        
        remoteAudioRef.current.oncanplay = () => {
          log('Audio can play - attempting to play');
          setAudioReceiving(true);
        };
        
        remoteAudioRef.current.onplaying = () => {
          log('✅ Audio is now playing!');
          setAudioReceiving(true);
        };
        
        remoteAudioRef.current.onplay = () => {
          log('Audio play event fired');
          setAudioReceiving(true);
        };
        
        remoteAudioRef.current.onpause = () => {
          log('Audio paused');
          setAudioReceiving(false);
        };
        
        remoteAudioRef.current.onended = () => {
          log('Audio ended');
          setAudioReceiving(false);
        };
        
        remoteAudioRef.current.onerror = (e) => {
          const error = e.target.error;
          log(`Audio error - Code: ${error?.code}, Message: ${error?.message}`, 'error');
        };
        
        remoteAudioRef.current.onstalled = () => log('Audio stalled', 'error');
        remoteAudioRef.current.onsuspend = () => log('Audio suspended');
        remoteAudioRef.current.onwaiting = () => log('Audio waiting for data');
        
        // Add time update listener to show live stream status
        remoteAudioRef.current.ontimeupdate = () => {
          if (remoteAudioRef.current && !remoteAudioRef.current.paused) {
            // For live streams, we'll show that it's playing
            log(`Live audio time: ${remoteAudioRef.current.currentTime.toFixed(1)}s`);
          }
        };
        
        // Check browser audio context state and create Web Audio API connection
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
          const AudioCtx = AudioContext || webkitAudioContext;
          const audioContext = new AudioCtx();
          log(`Audio context state: ${audioContext.state}`);
          
          if (audioContext.state === 'suspended') {
            log('Audio context suspended - attempting to resume');
            audioContext.resume().then(() => {
              log('Audio context resumed successfully');
            }).catch(err => {
              log(`Failed to resume audio context: ${err.message}`, 'error');
            });
          }
          
          // Create Web Audio API nodes for better control
          try {
            const source = audioContext.createMediaStreamSource(remoteStream);
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 1.0; // Full volume
            
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            log('✅ Web Audio API nodes created and connected');
            
            // Store references for later use
            remoteAudioRef.current.audioContext = audioContext;
            remoteAudioRef.current.audioSource = source;
            remoteAudioRef.current.gainNode = gainNode;
            
          } catch (webAudioError) {
            log(`Web Audio API setup failed: ${webAudioError.message}`, 'error');
          }
        }
        
        // Try to play the audio with enhanced error handling and multiple fallbacks
        try {
          log('Attempting to play audio...');
          const playPromise = remoteAudioRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise.then(() => {
              log('✅ Audio playing successfully!');
              setAudioReceiving(true);
            }).catch(async (playError) => {
              log(`❌ Audio play failed: ${playError.name} - ${playError.message}`);
              
              // Check if it's an autoplay restriction
              if (playError.name === 'NotAllowedError') {
                log('Autoplay blocked - trying Web Audio API fallback');
                
                // Try Web Audio API as fallback
                if (remoteAudioRef.current.audioContext && remoteAudioRef.current.audioSource) {
                  try {
                    await remoteAudioRef.current.audioContext.resume();
                    log('✅ Web Audio API fallback working');
                    setAudioReceiving(true);
                    setError(null);
                  } catch (webAudioError) {
                    log(`Web Audio API fallback failed: ${webAudioError.message}`, 'error');
                    setError('Click "Enable Audio" to hear the teacher');
                  }
                } else {
                  setError('Click "Enable Audio" to hear the teacher');
                }
              }
              
              // Add global click handler to enable audio
              const enableAudio = async () => {
                try {
                  log('User interaction detected - enabling audio');
                  
                  // Try both HTML5 audio and Web Audio API
                  const audioPromises = [];
                  
                  // HTML5 Audio
                  if (remoteAudioRef.current && !remoteAudioRef.current.paused) {
                    audioPromises.push(remoteAudioRef.current.play());
                  }
                  
                  // Web Audio API
                  if (remoteAudioRef.current.audioContext) {
                    audioPromises.push(remoteAudioRef.current.audioContext.resume());
                  }
                  
                  await Promise.all(audioPromises);
                  log('✅ Audio enabled successfully after user interaction');
                  setError(null);
                  setAudioReceiving(true);
                  document.removeEventListener('click', enableAudio);
                  document.removeEventListener('touchstart', enableAudio);
                } catch (retryError) {
                  log(`❌ Still failed to play after interaction: ${retryError.message}`, 'error');
                  setError(`Audio error: ${retryError.message}`);
                }
              };
              
              document.addEventListener('click', enableAudio, { once: true });
              document.addEventListener('touchstart', enableAudio, { once: true });
            });
          }
        } catch (immediateError) {
          log(`❌ Immediate play error: ${immediateError.message}`, 'error');
        }
        
        // Log current audio element state
        setTimeout(() => {
          log(`Audio element state check:
            - Source: ${remoteAudioRef.current.srcObject ? 'Set' : 'Not set'}
            - Volume: ${remoteAudioRef.current.volume}
            - Muted: ${remoteAudioRef.current.muted}
            - Paused: ${remoteAudioRef.current.paused}
            - Ready State: ${remoteAudioRef.current.readyState}
            - Current Time: ${remoteAudioRef.current.currentTime}
            - Duration: ${remoteAudioRef.current.duration}
          `);
        }, 1000);
        
      } else {
        log('❌ No audio element found!', 'error');
      }
      
      // Resume consumer
      socketRef.current.emit('resume-consumer', { consumerId: consumerRef.current.id });
      
      log('✅ Audio consumption setup completed');
      
    } catch (error) {
      log(`❌ Error consuming audio: ${error.message}`, 'error');
      setError(`Audio setup failed: ${error.message}`);
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
      
      {/* Enable Audio Button for autoplay restrictions */}
      {role === 'student' && isConnected && (
        <button
          onClick={async () => {
            if (remoteAudioRef.current) {
              try {
                console.log('🔊 User clicked Enable Audio button');
                
                // Check if audio context needs to be resumed
                if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                  const AudioCtx = AudioContext || webkitAudioContext;
                  let audioContext = remoteAudioRef.current.audioContext;
                  
                  if (!audioContext) {
                    audioContext = new AudioCtx();
                    remoteAudioRef.current.audioContext = audioContext;
                  }
                  
                  if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                    console.log('Audio context resumed by user action');
                  }
                  
                  // If Web Audio API nodes aren't set up, create them
                  if (!remoteAudioRef.current.audioSource && remoteAudioRef.current.srcObject) {
                    try {
                      const source = audioContext.createMediaStreamSource(remoteAudioRef.current.srcObject);
                      const gainNode = audioContext.createGain();
                      gainNode.gain.value = 1.0;
                      
                      source.connect(gainNode);
                      gainNode.connect(audioContext.destination);
                      
                      remoteAudioRef.current.audioSource = source;
                      remoteAudioRef.current.gainNode = gainNode;
                      
                      console.log('✅ Web Audio API nodes created on user interaction');
                    } catch (webAudioError) {
                      console.error('Web Audio API setup failed:', webAudioError);
                    }
                  }
                }
                
                // Force play the audio element
                await remoteAudioRef.current.play();
                console.log('✅ Audio manually enabled by user');
                setError(null);
                setAudioReceiving(true);
              } catch (error) {
                console.error('❌ Failed to enable audio:', error);
                setError(`Audio enable failed: ${error.message}`);
              }
            }
          }}
          className={`px-4 py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 backdrop-blur-md shadow-xl hover:shadow-2xl ${
            audioReceiving 
              ? 'bg-green-500/90 hover:bg-green-600/90 text-white border border-green-400/50' 
              : 'bg-orange-500/90 hover:bg-orange-600/90 text-white border border-orange-400/50 animate-bounce'
          }`}
          title={audioReceiving ? 'Audio is playing' : 'Click to enable audio playback'}
        >
          <Volume2 className="w-6 h-6" />
          <span>
            {audioReceiving ? '🔊 Audio Playing' : '🔊 Enable Audio'}
          </span>
          {!audioReceiving && (
            <div className="w-3 h-3 bg-white rounded-full animate-ping" />
          )}
        </button>
      )}

      {/* Audio element for receiving teacher's audio */}
      {role === 'student' && (
        <audio 
          ref={remoteAudioRef} 
          autoPlay 
          playsInline
          controls={true}  // Enable controls for debugging
          volume={1.0}
          muted={false}
          preload="auto"
          style={{ 
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: '300px',  // Wider for controls
            height: '60px',   // Taller for controls
            zIndex: 1000,
            opacity: isConnected ? 1 : 0,  // Fully visible when connected
            pointerEvents: isConnected ? 'auto' : 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            border: '2px solid #4ade80'  // Green border for visibility
          }}
          onLoadedData={() => console.log('Audio data loaded')}
          onCanPlay={() => console.log('Audio can play')}
          onPlay={() => console.log('Audio started playing')}
          onPause={() => console.log('Audio paused')}
          onVolumeChange={() => console.log('Volume changed:', remoteAudioRef.current?.volume)}
          onTimeUpdate={() => console.log('Audio time update')}
        />
      )}
    </div>
  );
};

export default SimpleAudioClient;