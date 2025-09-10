'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Users } from 'lucide-react'
import { useWhiteboard } from '../contexts/WhiteboardContext'

interface SimpleWebRTCAudioProps {
  isTeacher: boolean
  roomId: string
  className?: string
}

const SimpleWebRTCAudio: React.FC<SimpleWebRTCAudioProps> = ({
  isTeacher,
  roomId,
  className = ''
}) => {
  // Get socket and current user info from WhiteboardContext
  const { socket, currentUserId, currentUserName } = useWhiteboard()
  
  // State
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)
  const [studentCount, setStudentCount] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isProcessingOffer, setIsProcessingOffer] = useState(false) // Prevent duplicate offers

  // Refs
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  console.log('🎙️ SimpleWebRTCAudio initialized:', { 
    isTeacher, 
    roomId,
    userId: currentUserId, 
    userName: currentUserName,
    socketExists: !!socket,
    userIdType: typeof currentUserId,
    userIdLength: currentUserId?.length,
    'currentUserId === null': currentUserId === null,
    'currentUserId === undefined': currentUserId === undefined,
    'currentUserId === ""': currentUserId === "",
    isBroadcasting,
    isReceiving,
    hasLocalStream: !!localStreamRef.current,
    localStreamDetails: localStreamRef.current ? {
      id: localStreamRef.current.id,
      active: localStreamRef.current.active,
      audioTracks: localStreamRef.current.getAudioTracks().length,
      videoTracks: localStreamRef.current.getVideoTracks().length
    } : null
  });

  // WebRTC Configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  }

  // Audio level monitoring
  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 256
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const updateLevel = () => {
        if (!analyserRef.current) return
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        
        const sum = dataArray.reduce((a, b) => a + b * b, 0)
        const rms = Math.sqrt(sum / dataArray.length)
        const level = Math.min(100, (rms / 128) * 100)
        
        setAudioLevel(level)
        requestAnimationFrame(updateLevel)
      }
      
      updateLevel()
      console.log('🎵 Audio level monitoring started')
    } catch (error) {
      console.log('❌ Failed to start audio monitoring:', error)
    }
  }, [])

  // Teacher: Start Broadcasting
  const startBroadcast = useCallback(async () => {
    if (!isTeacher || !socket) return
    
    try {
      console.log('🎙️ Teacher starting broadcast...')
      
      // Get teacher's microphone with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
          autoGainControl: true
        }
      })
      
      // Check if stream has audio tracks
      const audioTracks = stream.getAudioTracks()
      console.log('🔍 Teacher microphone details:', {
        streamId: stream.id,
        totalTracks: stream.getTracks().length,
        audioTracks: audioTracks.length,
        audioTrackDetails: audioTracks.map(track => ({
          id: track.id,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        }))
      })
      
      // Test if microphone is actually picking up audio
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks found in microphone stream')
      }

      localStreamRef.current = stream
      startAudioLevelMonitoring(stream)
      
      // Notify all students that teacher is broadcasting
      console.log('📤 Teacher emitting broadcast start with:', {
        roomId,
        teacherId: currentUserId,
        teacherName: currentUserName,
        userIdType: typeof currentUserId,
        audioTracksCount: audioTracks.length
      });
      
      socket.emit('teacher-broadcast-start', {
        roomId,
        teacherId: currentUserId,
        teacherName: currentUserName
      })
      
      setIsBroadcasting(true)
      console.log('✅ Teacher broadcast started with', audioTracks.length, 'audio tracks')
      
    } catch (error) {
      console.log('❌ Failed to start broadcast:', error)
      alert(`Failed to access microphone: ${error.message}. Please check permissions and try again.`)
    }
  }, [isTeacher, socket, roomId, currentUserId, currentUserName, startAudioLevelMonitoring])

  // Teacher: Stop Broadcasting
  const stopBroadcast = useCallback(() => {
    if (!isTeacher) return
    
    console.log('🛑 Teacher stopping broadcast...')
    
    // Stop microphone stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    // Notify students
    if (socket) {
      socket.emit('teacher-broadcast-stop', { roomId })
    }
    
    setIsBroadcasting(false)
    setAudioLevel(0)
    console.log('✅ Teacher broadcast stopped')
  }, [isTeacher, socket, roomId])

  // Student: Setup WebRTC to receive audio
  const setupReceiver = useCallback(async (teacherId: string) => {
    if (isTeacher) return
    
    try {
      console.log('🎧 Student setting up audio receiver for teacher:', teacherId)
      
      const pc = new RTCPeerConnection(rtcConfig)
      peerConnectionRef.current = pc
      
      // Handle incoming audio stream
      pc.ontrack = (event) => {
        console.log('🔊 Student received teacher audio stream')
        const remoteStream = event.streams[0]
        
        console.log('🔍 DEBUG audio stream details:', {
          streamId: remoteStream.id,
          trackCount: remoteStream.getTracks().length,
          audioTracks: remoteStream.getAudioTracks().length,
          tracks: remoteStream.getTracks().map(t => ({ 
            kind: t.kind, 
            enabled: t.enabled, 
            readyState: t.readyState,
            muted: t.muted 
          }))
        })
        
        if (remoteAudioRef.current) {
          console.log('🔊 Setting audio element srcObject')
          remoteAudioRef.current.srcObject = remoteStream
          remoteAudioRef.current.volume = 1.0
          remoteAudioRef.current.muted = false
          
          // Force play after a small delay to ensure stream is ready
          setTimeout(async () => {
            if (remoteAudioRef.current) {
              try {
                await remoteAudioRef.current.play()
                console.log('✅ Audio playback started successfully')
                setIsReceiving(true)
              } catch (error) {
                console.log('❌ Audio auto-play failed (browser policy):', error)
                console.log('🔧 User will need to manually enable audio')
                setIsReceiving(true) // Still set as receiving, user can manually enable
              }
            }
          }, 500)
        } else {
          console.log('❌ remoteAudioRef.current is null!')
        }
      }
      
      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc-ice-candidate', {
            roomId,
            from: currentUserId,
            to: teacherId,
            candidate: event.candidate
          })
        }
      }
      
      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log('🔗 Student connection state:', pc.connectionState)
        if (pc.connectionState === 'connected') {
          setIsReceiving(true)
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setIsReceiving(false)
        }
      }
      
      // Request teacher's audio offer
      console.log('📤 Student requesting audio with:', {
        roomId,
        studentId: currentUserId,
        teacherId,
        studentIdType: typeof currentUserId,
        teacherIdType: typeof teacherId
      });
      
      if (!socket) {
        console.log('❌ Student: No socket available for audio request');
        return;
      }
      
      socket.emit('student-request-audio', {
        roomId,
        studentId: currentUserId,
        teacherId
      })
      
    } catch (error) {
      console.log('❌ Failed to setup receiver:', error)
    }
  }, [isTeacher, socket, roomId, currentUserId])

  // Teacher: Handle student audio request
  const handleStudentRequest = useCallback(async (studentId: string) => {
    if (!isTeacher || !localStreamRef.current) {
      console.log('❌ Cannot handle student request:', { 
        isTeacher, 
        hasStream: !!localStreamRef.current 
      })
      return
    }
    
    try {
      console.log('📞 Teacher handling audio request from student:', studentId)
      
      const pc = new RTCPeerConnection(rtcConfig)
      
      // Add teacher's audio stream with detailed logging
      const audioTracks = localStreamRef.current.getAudioTracks()
      console.log('🎵 Adding audio tracks to peer connection:', {
        totalTracks: localStreamRef.current.getTracks().length,
        audioTracks: audioTracks.length,
        trackDetails: audioTracks.map(track => ({
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        }))
      })
      
      localStreamRef.current.getTracks().forEach((track, index) => {
        console.log(`📡 Adding track ${index + 1}:`, {
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        })
        pc.addTrack(track, localStreamRef.current!)
      })
      
      console.log('✅ All tracks added to peer connection')
      
      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc-ice-candidate', {
            roomId,
            from: currentUserId,
            to: studentId,
            candidate: event.candidate
          })
        }
      }
      
      // Create and send offer to student
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      if (!socket) {
        console.log('❌ Teacher: No socket available for WebRTC offer');
        return;
      }
      
      socket.emit('webrtc-offer', {
        roomId,
        from: currentUserId,
        to: studentId,
        offer
      })
      
      console.log('📤 Teacher sent offer to student:', studentId)
      
    } catch (error) {
      console.log('❌ Failed to handle student request:', error)
    }
  }, [isTeacher, socket, roomId, currentUserId])

  // Socket event handlers
  useEffect(() => {
    if (!socket) {
      console.log('❌ SimpleWebRTCAudio: No socket available');
      return;
    }

    console.log('🔗 SimpleWebRTCAudio: Setting up socket listeners for', isTeacher ? 'TEACHER' : 'STUDENT', 'in room', roomId);

    if (isTeacher) {
      console.log('👨‍🏫 Setting up TEACHER socket listeners');
      // Teacher events
      socket.on('student-request-audio', ({ studentId }: { studentId: string }) => {
        console.log('📞 Teacher received audio request from student:', studentId);
        handleStudentRequest(studentId);
      });
      
      socket.on('student-joined-room', ({ count }: { count: number }) => {
        console.log('👥 Teacher notified: student count =', count);
        setStudentCount(count);
      });
      
    } else {
      console.log('🎓 Setting up STUDENT socket listeners');
      // Student events
      console.log('🎧 Student setting up listener for teacher-broadcast-start event');
      
      socket.on('teacher-broadcast-start', ({ teacherId, teacherName }: { teacherId: string, teacherName: string }) => {
        console.log('🎙️ Student received teacher-broadcast-start event:', { teacherId, teacherName, teacherIdType: typeof teacherId, teacherIdLength: teacherId?.length });
        console.log('🎧 Student detected teacher broadcast from:', teacherId, 'connecting...');
        
        if (!teacherId) {
          console.log('❌ Student: Received empty teacherId, cannot setup audio connection');
          return;
        }
        
        setupReceiver(teacherId);
      });
      
      socket.on('teacher-broadcast-stop', () => {
        console.log('🛑 Student: Teacher stopped broadcasting');
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        setIsReceiving(false);
        setIsProcessingOffer(false); // Reset offer processing flag
      });
      
            socket.on('webrtc-offer', async ({ from, offer }: { from: string, offer: RTCSessionDescriptionInit }) => {
        console.log('📨 Student received WebRTC offer from:', from);
        
        // Prevent processing duplicate offers
        if (isProcessingOffer) {
          console.log('⚠️ Already processing an offer, ignoring duplicate');
          return;
        }
        
        if (!peerConnectionRef.current) {
          console.log('❌ No peer connection available for offer');
          return;
        }
        
        setIsProcessingOffer(true);
        
        try {
          const pc = peerConnectionRef.current;
          
          // Check connection state before proceeding
          console.log('🔍 PeerConnection state:', pc.signalingState);
          
          if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
            console.log('⚠️ PeerConnection not in correct state for offer:', pc.signalingState);
            setIsProcessingOffer(false);
            return;
          }
          
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          if (!socket) {
            console.log('❌ Student: No socket available for WebRTC answer');
            setIsProcessingOffer(false);
            return;
          }
          
          socket.emit('webrtc-answer', {
            roomId,
            from: currentUserId,
            to: from,
            answer
          });
          
          console.log('📩 Student sent answer to teacher');
        } catch (error) {
          console.log('❌ Failed to handle offer:', error);
        } finally {
          setIsProcessingOffer(false);
        }
      });
      
      socket.on('webrtc-answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        console.log('📩 Teacher received WebRTC answer');
        if (!peerConnectionRef.current) {
          console.log('❌ No peer connection available for answer');
          return;
        }
        
        try {
          console.log('🔍 PeerConnection state before setRemoteDescription:', peerConnectionRef.current.signalingState);
          await peerConnectionRef.current.setRemoteDescription(answer);
          console.log('✅ Teacher processed answer successfully');
        } catch (error) {
          console.log('❌ Failed to handle answer. Error details:', {
            message: error?.message || 'Unknown error',
            name: error?.name || 'Unknown',
            pcState: peerConnectionRef.current?.signalingState || 'unknown'
          });
        }
      });
      
      socket.on('webrtc-ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        console.log('🧊 Received ICE candidate');
        if (!peerConnectionRef.current) {
          console.log('❌ No peer connection available for ICE candidate');
          return;
        }
        
        try {
          await peerConnectionRef.current.addIceCandidate(candidate);
          console.log('✅ Added ICE candidate successfully');
        } catch (error) {
          console.log('❌ Failed to add ICE candidate. Error details:', {
            message: error?.message || 'Unknown error',
            name: error?.name || 'Unknown',
            pcState: peerConnectionRef.current?.signalingState || 'unknown'
          });
        }
      });
    }
    
    return () => {
      console.log('🧹 SimpleWebRTCAudio: Cleaning up socket listeners');
      socket.off('student-request-audio');
      socket.off('student-joined-room');
      socket.off('teacher-broadcast-start');
      socket.off('teacher-broadcast-stop');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
    };
  }, [socket, isTeacher, roomId, currentUserId]) // Remove handleStudentRequest and setupReceiver from deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  console.log('🎨 Rendering SimpleWebRTCAudio:', { 
    isTeacher, 
    isBroadcasting, 
    isReceiving, 
    studentCount 
  })

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      {/* Audio element for students - make visible for debugging */}
      {!isTeacher && (
        <div className="mb-4 p-2 bg-gray-50 rounded">
          <p className="text-xs text-gray-600 mb-1">Audio Element (Debug)</p>
          <audio
            ref={remoteAudioRef}
            autoPlay
            playsInline
            controls
            muted={false}
            className="w-full h-8"
            onPlay={() => console.log('🔊 Audio element started playing')}
            onPause={() => console.log('⏸️ Audio element paused')}
            onError={(e) => console.log('❌ Audio element error:', e)}
            onLoadStart={() => console.log('🔄 Audio loading started')}
            onCanPlay={() => console.log('✅ Audio can play')}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            isTeacher 
              ? (isBroadcasting ? 'bg-green-500' : 'bg-red-500')
              : (isReceiving ? 'bg-green-500' : 'bg-red-500')
          }`} />
          <h3 className="font-semibold text-gray-800">
            Audio {isTeacher ? 'Broadcast' : 'Receiver'}
          </h3>
        </div>
        
        {isTeacher && (
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{studentCount} students</span>
          </div>
        )}
      </div>

      {/* Controls */}
      {isTeacher ? (
        <div className="space-y-3">
          {/* Debug Button for Current Stream State */}
          <button
            onClick={async () => {
              console.log('🔍 TEACHER DEBUG - Current stream state:', {
                hasLocalStream: !!localStreamRef.current,
                isBroadcasting,
                studentCount,
                currentUserId,
                currentUserName,
                socketConnected: !!socket,
                roomId,
                streamDetails: localStreamRef.current ? {
                  id: localStreamRef.current.id,
                  active: localStreamRef.current.active,
                  totalTracks: localStreamRef.current.getTracks().length,
                  audioTracks: localStreamRef.current.getAudioTracks().length,
                  audioTrackDetails: localStreamRef.current.getAudioTracks().map(track => ({
                    id: track.id,
                    label: track.label,
                    enabled: track.enabled,
                    readyState: track.readyState,
                    muted: track.muted
                  }))
                } : 'NO STREAM - Click Start Broadcasting first!'
              })
              
              // Also test microphone availability
              try {
                const devices = await navigator.mediaDevices.enumerateDevices()
                const audioInputs = devices.filter(device => device.kind === 'audioinput')
                console.log('🎙️ Available microphones:', audioInputs.map(device => ({
                  deviceId: device.deviceId,
                  label: device.label || 'Unknown microphone',
                  groupId: device.groupId
                })))
              } catch (error) {
                console.log('❌ Failed to enumerate devices:', error)
              }
            }}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔍 Debug Current Stream
          </button>

          {/* Broadcast Button */}
          <button
            onClick={isBroadcasting ? stopBroadcast : startBroadcast}
            disabled={!socket}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              isBroadcasting
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isBroadcasting ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span>
              {isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
            </span>
          </button>

          {/* Audio Level Indicator */}
          {isBroadcasting && (
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Audio Level</span>
                <span>{Math.round(audioLevel)}%</span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <div className={`flex items-center justify-center space-x-2 text-lg ${
            isReceiving ? 'text-green-600' : 'text-gray-500'
          }`}>
            {isReceiving ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            <span>
              {isReceiving ? 'Receiving Audio' : 'Waiting for Teacher'}
            </span>
          </div>
          
          <p className="text-sm text-gray-500 mt-2">
            {isReceiving 
              ? 'Connected to teacher\'s broadcast'
              : 'Teacher will appear here when broadcasting starts'
            }
          </p>

          {/* Always show Enable Audio button when receiving */}
          {isReceiving && (
            <div className="mt-4 space-y-2">
              <button
                onClick={async () => {
                  console.log('🔊 Manual audio enable clicked');
                  if (remoteAudioRef.current) {
                    console.log('🔍 Audio element state:', {
                      paused: remoteAudioRef.current.paused,
                      muted: remoteAudioRef.current.muted,
                      volume: remoteAudioRef.current.volume,
                      srcObject: !!remoteAudioRef.current.srcObject,
                      readyState: remoteAudioRef.current.readyState
                    });
                    
                    remoteAudioRef.current.muted = false;
                    remoteAudioRef.current.volume = 1.0;
                    
                    try {
                      await remoteAudioRef.current.play();
                      console.log('✅ Manual audio play successful');
                    } catch (error) {
                      console.log('❌ Manual audio play failed:', error);
                    }
                  }
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Volume2 className="w-4 h-4" />
                <span>🔊 Enable Audio / Unmute</span>
              </button>
              
              <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                💡 If you can't hear audio, click the "Enable Audio" button above or use the audio controls.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SimpleWebRTCAudio
