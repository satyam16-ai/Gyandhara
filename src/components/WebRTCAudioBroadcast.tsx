'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Users, Signal, AlertCircle } from 'lucide-react'

interface WebRTCAudioBroadcastProps {
  socket: any // Socket.IO instance
  isTeacher: boolean
  roomId: string
  userId: string
  userName: string
  bandwidthMode?: 'ultra-low' | 'low' | 'normal'
  className?: string
}

interface RTCConnection {
  pc: RTCPeerConnection
  studentId: string
  connectionState: string
}

const WebRTCAudioBroadcast: React.FC<WebRTCAudioBroadcastProps> = ({
  socket,
  isTeacher,
  roomId,
  userId,
  userName,
  bandwidthMode = 'normal',
  className = ''
}) => {
  // DEBUG: Log component initialization
  console.log('🚀 WebRTCAudioBroadcast initialized with:', {
    isTeacher,
    roomId,
    userId,
    userName,
    bandwidthMode,
    socketExists: !!socket
  });

  // State
  const [isMicOn, setIsMicOn] = useState(false)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [audioLevel, setAudioLevel] = useState(0)
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [connectedStudents, setConnectedStudents] = useState<string[]>([])
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor'>('good')

  // Refs
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectionsRef = useRef<Map<string, RTCConnection>>(new Map())
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // Configuration based on bandwidth mode
  const getAudioConstraints = useCallback(() => {
    const constraints = {
      'ultra-low': {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      'low': {
        channelCount: 1, 
        sampleRate: 24000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      'normal': {
        channelCount: 1,
        sampleRate: 48000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    }
    return constraints[bandwidthMode]
  }, [bandwidthMode])

  const getBitrate = useCallback(() => {
    const bitrates = {
      'ultra-low': 16000,  // 16kbps
      'low': 24000,        // 24kbps  
      'normal': 48000      // 48kbps
    }
    return bitrates[bandwidthMode]
  }, [bandwidthMode])

  // RTCPeerConnection configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  }

  // Initialize audio context and analyser for audio level monitoring
  const initializeAudioAnalysis = useCallback(async (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Start audio level monitoring
      const updateAudioLevel = () => {
        if (!analyserRef.current) return
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        
        // Calculate RMS
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const rms = Math.sqrt(sum / dataArray.length)
        const level = Math.min(100, (rms / 128) * 100)
        
        setAudioLevel(level)
      }

      audioLevelIntervalRef.current = setInterval(updateAudioLevel, 100)
      console.log('🎤 Audio analysis initialized')
      
    } catch (error) {
      console.error('❌ Failed to initialize audio analysis:', error)
    }
  }, [])

  // Create RTCPeerConnection for a student
  const createPeerConnection = useCallback(async (studentId: string): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection(rtcConfiguration)
    
    // Configure Opus codec preference
    const sender = pc.addTransceiver('audio', {
      direction: isTeacher ? 'sendonly' : 'recvonly',
      sendEncodings: isTeacher ? [{
        maxBitrate: getBitrate(),
        priority: 'high'
      }] : undefined
    })

    // Force Opus codec
    if (isTeacher && sender.sender.track && localStreamRef.current) {
      const params = sender.sender.getParameters()
      params.encodings[0].maxBitrate = getBitrate()
      await sender.sender.setParameters(params)
    }

    // Add local stream tracks (teacher only)
    if (isTeacher && localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
      console.log('🎵 Added audio tracks to peer connection')
    }

    // Handle incoming audio stream (student only)
    if (!isTeacher) {
      pc.ontrack = (event) => {
        console.log('🔊 Received remote audio stream')
        const remoteStream = event.streams[0]
        
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = remoteStream
          audioElementRef.current.play().catch(console.error)
        }
      }
    }

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`🔗 WebRTC Connection state changed: ${state} for ${isTeacher ? 'student' : 'teacher'} ${studentId} (current user: ${userId})`);
      
      if (isTeacher) {
        // Teacher managing student connections
        if (state === 'connected') {
          setConnectedStudents(prev => [...prev.filter(s => s !== studentId), studentId]);
          console.log('✅ Teacher connected to student', studentId);
        } else if (state === 'disconnected' || state === 'failed') {
          setConnectedStudents(prev => prev.filter(s => s !== studentId));
          console.log('❌ Teacher disconnected from student', studentId);
        }
      } else {
        // Student connection to teacher
        if (state === 'connected') {
          setConnectionState('connected');
          console.log('✅ Student successfully connected to teacher!');
        } else if (state === 'disconnected' || state === 'failed') {
          setConnectionState('disconnected');
          console.log('❌ Student disconnected from teacher');
        } else if (state === 'connecting') {
          setConnectionState('connecting');
          console.log('🔄 Student connecting to teacher...');
        }
      }
    };

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('🧊 Sending ICE candidate from', userId, 'to', studentId);
        socket.emit('webrtc-ice-candidate', {
          to: isTeacher ? studentId : 'teacher',
          from: userId,
          candidate: event.candidate
        });
      }
    };

    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', pc.iceConnectionState, 'for', studentId);
    };

    return pc;
  }, [isTeacher, getBitrate, rtcConfiguration, userId, socket]);

  // Teacher: Start broadcasting
  const startBroadcast = useCallback(async () => {
    if (!isTeacher) return

    try {      
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioConstraints(),
        video: false
      })

      localStreamRef.current = stream
      setIsMicOn(true)
      setConnectionState('connected')

      // Initialize audio analysis
      await initializeAudioAnalysis(stream)

      // Notify server that teacher is ready to broadcast
      if (socket) {
        console.log('📤 Telling server teacher is ready to broadcast')
        socket.emit('webrtc-teacher-ready', { roomId, teacherId: userId, teacherName: userName })
      }
      
    } catch (error) {
      console.error('❌ Failed to start audio broadcast:', error)
      setIsMicOn(false)
      setConnectionState('disconnected')
    }
  }, [isTeacher, getAudioConstraints, roomId, userId, userName, socket, initializeAudioAnalysis])

  // Teacher: Stop broadcasting
  const stopBroadcast = useCallback(() => {
    if (!isTeacher) return
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    // Close all peer connections
    connectionsRef.current.forEach((connection) => {
      connection.pc.close()
    })
    connectionsRef.current.clear()

    // Clean up audio analysis
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current)
      audioLevelIntervalRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setIsMicOn(false)
    setAudioLevel(0)
    setConnectionState('disconnected')
    setConnectedStudents([])

    // Notify server
    if (socket) {
      socket.emit('webrtc-teacher-stop', { roomId, teacherId: userId })
    }
  }, [isTeacher, roomId, userId, socket])

  // Student: Join broadcast
  const joinBroadcast = useCallback(() => {
    console.log('🎓 Student joinBroadcast called, isTeacher:', isTeacher, 'userId:', userId);
    if (isTeacher) return

    setConnectionState('connecting');
    console.log('🔄 Student connection state set to connecting');

    if (socket) {
      console.log('📤 Student emitting webrtc-student-join to server');
      socket.emit('webrtc-student-join', { 
        roomId, 
        studentId: userId, 
        studentName: userName 
      });
    } else {
      console.log('❌ Student has no socket to emit join event');
    }
  }, [isTeacher, roomId, userId, userName, socket])

  // Student: Leave broadcast
  const leaveBroadcast = useCallback(() => {
    if (isTeacher) return
    
    // Close peer connection
    const connection = connectionsRef.current.get('teacher')
    if (connection) {
      connection.pc.close()
      connectionsRef.current.delete('teacher')
    }

    // Stop audio playback
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null
    }

    setConnectionState('disconnected')

    if (socket) {
      socket.emit('webrtc-student-leave', { roomId, studentId: userId })
    }
  }, [isTeacher, roomId, userId, socket])

  // Socket event handlers
  useEffect(() => {
    if (!socket) {
      console.log('❌ No socket available for WebRTC');
      return;
    }

    console.log('🔗 Setting up WebRTC socket event listeners for', isTeacher ? 'TEACHER' : 'STUDENT');

    // Teacher receives student join
    socket.on('webrtc-student-join', async ({ studentId, studentName }: { studentId: string, studentName: string }) => {
      console.log('👨‍🎓 Received student join event:', { studentId, studentName, isTeacher, currentUserId: userId });
      if (!isTeacher || studentId === userId) return
      
      try {
        const pc = await createPeerConnection(studentId)
        
        // Create and send offer
        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false
        })
        
        await pc.setLocalDescription(offer)
        
        socket.emit('webrtc-offer', {
          roomId,
          to: studentId,
          from: userId,
          offer: offer
        })
        
      } catch (error) {
        console.error('❌ Failed to handle student join:', error)
      }
    })

    // Student receives offer from teacher
    socket.on('webrtc-offer', async ({ from, offer }: { from: string, offer: RTCSessionDescriptionInit }) => {
      console.log('📡 Received WebRTC offer from:', from, 'to user:', userId, 'isTeacher:', isTeacher);
      if (isTeacher) return

      console.log(`📨 Student processing offer from teacher: ${from}`, { offer: !!offer })
      
      try {
        const pc = await createPeerConnection('teacher')
        
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        console.log('✅ Set remote description successfully')
        
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        console.log('✅ Created and set local answer')
        
        console.log('📤 Sending answer back to teacher')
        socket.emit('webrtc-answer', {
          roomId,
          to: from,
          from: userId,
          answer: answer
        })
        
        // Don't set to connected yet - wait for actual WebRTC connection
        setConnectionState('connecting')
        console.log('📤 Sent answer to teacher, waiting for connection...')
        
      } catch (error) {
        console.error('❌ Failed to handle offer:', error)
        setConnectionState('disconnected')
      }
    })

    // Teacher receives answer from student
    socket.on('webrtc-answer', async ({ from, answer }: { from: string, answer: RTCSessionDescriptionInit }) => {
      if (!isTeacher) return

      console.log(`📨 Received answer from student: ${from}`)
      
      const connection = connectionsRef.current.get(from)
      if (connection) {
        try {
          await connection.pc.setRemoteDescription(new RTCSessionDescription(answer))
          console.log(`✅ Answer processed for student: ${from}`)
        } catch (error) {
          console.error('❌ Failed to process answer:', error)
        }
      }
    })

    // ICE candidate exchange
    socket.on('webrtc-ice-candidate', async ({ from, candidate }: { from: string, candidate: RTCIceCandidateInit }) => {
      const connectionKey = isTeacher ? from : 'teacher'
      const connection = connectionsRef.current.get(connectionKey)
      
      if (connection) {
        try {
          await connection.pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (error) {
          console.error('❌ Failed to add ICE candidate:', error)
        }
      }
    })

    // Student notified when teacher stops
    socket.on('webrtc-teacher-stop', () => {
      if (!isTeacher) {
        leaveBroadcast()
      }
    })

    // Cleanup
    return () => {
      socket.off('webrtc-student-join')
      socket.off('webrtc-offer')
      socket.off('webrtc-answer')
      socket.off('webrtc-ice-candidate')
      socket.off('webrtc-teacher-stop')
    }
  }, [socket, isTeacher, userId, createPeerConnection, leaveBroadcast])

  // Component mount/unmount
  useEffect(() => {
    // Students should wait for teacher to broadcast before joining
    if (!isTeacher && socket) {
      console.log('🎓 Student waiting for teacher broadcast signal...');
      
      // Listen for teacher broadcast status
      socket.on('webrtc-teacher-broadcasting', ({ teacherId, teacherName }: { teacherId: string; teacherName: string }) => {
        console.log(`🎙️ Teacher ${teacherName} (${teacherId}) started broadcasting, student ${userId} joining...`);
        setConnectionState('connecting');
        joinBroadcast();
      });
      
      return () => {
        console.log('🔌 Student cleaning up webrtc-teacher-broadcasting listener');
        socket.off('webrtc-teacher-broadcasting');
      };
    } else if (!socket) {
      console.log('❌ Student has no socket to listen for teacher broadcast');
    }
  }, [isTeacher, socket, joinBroadcast, userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTeacher) {
        stopBroadcast()
      } else {
        leaveBroadcast()
      }
    }
  }, [isTeacher, stopBroadcast, leaveBroadcast])

  // Toggle microphone (teacher only)
  const toggleMicrophone = () => {
    if (!isTeacher) return
    
    if (isMicOn) {
      stopBroadcast()
    } else {
      startBroadcast()
    }
  }

  // Toggle audio (student only)
  const toggleAudio = () => {
    if (isTeacher) return
    
    setIsAudioOn(!isAudioOn)
    
    if (audioElementRef.current) {
      audioElementRef.current.muted = !isAudioOn
    }
  }

  // Get status text
  const getStatusText = () => {
    if (isTeacher) {
      if (!isMicOn) return 'Click to start broadcasting'
      return `Broadcasting to ${connectedStudents.length} student(s)`
    } else {
      if (connectionState === 'disconnected') return 'Not connected'
      if (connectionState === 'connecting') return 'Connecting to teacher...'
      return 'Receiving audio from teacher'
    }
  }

  // Get status color
  const getStatusColor = () => {
    if (isTeacher) {
      return isMicOn ? 'text-green-600' : 'text-gray-500'
    } else {
      if (connectionState === 'connected') return 'text-green-600'
      if (connectionState === 'connecting') return 'text-yellow-600'
      return 'text-red-500'
    }
  }

  // DEBUG: Log current state before render
  console.log('🎨 WebRTC Component rendering with state:', {
    userId,
    isTeacher,
    connectionState,
    connectedStudents: connectedStudents.length,
    isMicOn,
    socketExists: !!socket
  });

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      {/* Hidden audio element for students */}
      {!isTeacher && (
        <audio
          ref={audioElementRef}
          autoPlay
          playsInline
          muted={!isAudioOn}
          style={{ display: 'none' }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' : 
            connectionState === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <h3 className="font-semibold text-gray-800">
            WebRTC Audio {isTeacher ? 'Broadcast' : 'Receiver'}
          </h3>
        </div>
        
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Signal className="w-4 h-4" />
          <span className="capitalize">{networkQuality}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {isTeacher ? (
          <>
            {/* Teacher Controls */}
            <button
              onClick={toggleMicrophone}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                isMicOn 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isMicOn ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span>{isMicOn ? 'Stop Broadcasting' : 'Start Broadcasting'}</span>
            </button>

            {/* Audio Level Meter */}
            {isMicOn && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Audio Level</span>
                  <span>{Math.round(audioLevel)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${Math.min(audioLevel, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Connected Students */}
            {connectedStudents.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <Users className="w-4 h-4" />
                <span>{connectedStudents.length} student(s) listening</span>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Student Controls */}
            <button
              onClick={toggleAudio}
              disabled={connectionState !== 'connected'}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                connectionState !== 'connected'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isAudioOn 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
            >
              {isAudioOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <span>{isAudioOn ? 'Audio On' : 'Audio Off'}</span>
            </button>

            {/* Connection Status */}
            {connectionState === 'connecting' && (
              <div className="flex items-center space-x-2 text-sm text-yellow-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent" />
                <span>Connecting to teacher...</span>
              </div>
            )}
          </>
        )}

        {/* Status Text */}
        <div className={`text-sm text-center ${getStatusColor()}`}>
          {getStatusText()}
        </div>

        {/* Bandwidth Mode Indicator */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Quality: {bandwidthMode}</span>
          <span>{getBitrate() / 1000}kbps</span>
        </div>
      </div>
    </div>
  )
}

export default WebRTCAudioBroadcast
