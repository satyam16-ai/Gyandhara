'use client'

import React, { useState, useRef, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

interface SimpleAudioRecorderProps {
  isTeacher: boolean
  userId?: string
  userName?: string
  roomId?: string
  classId?: string
}

export default function SimpleAudioRecorder({ isTeacher, userId, userName, roomId, classId }: SimpleAudioRecorderProps) {
  // Step 2: Recording + Socket.io real-time emission
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [receivedAudio, setReceivedAudio] = useState<string[]>([]) // Store received audio from other users
  const [socketConnected, setSocketConnected] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const chunksRef = useRef<Blob[]>([])

  // Socket.io connection
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gyandhara-backend.onrender.com'
    const socketConnection = io(backendUrl)
    setSocket(socketConnection)

    console.log('🔌 Socket.io connecting...')

    socketConnection.on('connect', () => {
      console.log('✅ Socket.io connected:', socketConnection.id)
      setSocketConnected(true)
      
      // Join the room
      const targetRoom = roomId || classId || 'default-room'
      socketConnection.emit('join-room', {
        roomId: targetRoom,
        userId: userId || 'anonymous',
        userName: userName || (isTeacher ? 'Teacher' : 'Student'),
        isTeacher
      })
    })

    // Listen for incoming audio streams
    socketConnection.on('audio-stream', (data: any) => {
      console.log('🔊 Received audio stream from:', data.userName, 'Size:', data.audio?.length)
      
      if (data.userId !== userId && data.audio) {
        // Convert received audio array back to blob and play
        playReceivedAudio(data.audio, data.userName)
      }
    })

    socketConnection.on('disconnect', () => {
      console.log('🔌 Socket.io disconnected')
      setSocketConnected(false)
    })

    return () => {
      socketConnection.disconnect()
    }
  }, [userId, userName, roomId, classId, isTeacher])

  const playReceivedAudio = async (audioArray: number[], fromUser: string) => {
    try {
      console.log('🔊 Playing received audio from:', fromUser)
      
      // Convert array back to ArrayBuffer
      const audioBuffer = new Uint8Array(audioArray).buffer
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm;codecs=opus' })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // Create audio element and play
      const audio = new Audio(audioUrl)
      audio.volume = 0.8
      
      const playPromise = audio.play()
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🔊 Received audio playback started from:', fromUser)
            setReceivedAudio(prev => [...prev, `${fromUser}: ${new Date().toLocaleTimeString()}`])
          })
          .catch(error => {
            console.warn('🔊 Received audio playback failed:', error.message)
          })
      }

      // Clean up URL after playback
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl)
      })
      
    } catch (error) {
      console.error('❌ Error playing received audio:', error)
    }
  }

  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording...')
      
      // Get microphone permission and stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })
      
      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      chunksRef.current = []
      
      // Handle recorded data - NOW WITH SOCKET.IO EMISSION
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          console.log('📊 Audio chunk received, size:', event.data.size)
          
          // STEP 2: Emit audio data via Socket.io in real-time
          if (socket && isTeacher) {
            event.data.arrayBuffer().then(buffer => {
              const audioArray = Array.from(new Uint8Array(buffer))
              
              const audioData = {
                userId: userId || 'anonymous',
                userName: userName || 'Teacher',
                isTeacher,
                audio: audioArray,
                timestamp: Date.now(),
                roomId: roomId || classId || 'default-room'
              }
              
              console.log('📡 Emitting audio data via Socket.io:', {
                userId: audioData.userId,
                userName: audioData.userName,
                audioSize: audioData.audio.length,
                roomId: audioData.roomId
              })
              
              socket.emit('audio-stream', audioData)
            })
          }
        }
      }
      
      // Handle recording stop
      recorder.onstop = () => {
        console.log('🎤 Recording stopped, creating audio blob...')
        
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        setRecordedAudio(audioUrl)
        console.log('✅ Audio blob created successfully, URL:', audioUrl)
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }
      
      // Start recording
      recorder.start(250) // Record in 250ms chunks for real-time streaming
      setMediaRecorder(recorder)
      setIsRecording(true)
      
      console.log('✅ Recording started successfully with Socket.io emission')
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error)
      alert('Failed to access microphone. Please allow microphone permission.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      console.log('🛑 Stopping recording...')
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const playRecording = () => {
    if (recordedAudio && audioRef.current) {
      console.log('🔊 Playing recorded audio...')
      audioRef.current.play()
    }
  }

  const clearRecording = () => {
    if (recordedAudio) {
      URL.revokeObjectURL(recordedAudio)
      setRecordedAudio(null)
      console.log('🗑️ Recording cleared')
    }
  }

  const clearReceivedAudio = () => {
    setReceivedAudio([])
    console.log('🗑️ Received audio log cleared')
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
        🎤 Audio Recorder - Step 2: Socket.io Real-time Streaming
      </h3>
      
      <div className="flex flex-col gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-3 h-3 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={socketConnected ? 'text-green-600' : 'text-red-600'}>
            Socket.io: {socketConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Recording Controls */}
        <div className="flex gap-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              disabled={!isTeacher || !socketConnected}
            >
              🎤 Start Recording & Stream
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors animate-pulse"
            >
              ⏹️ Stop Recording
            </button>
          )}
          
          {/* Recording status */}
          {isRecording && (
            <div className="flex items-center gap-2 text-red-500">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              Recording & Streaming...
            </div>
          )}
        </div>

        {/* Playback Controls */}
        {recordedAudio && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              ✅ Recording saved! You can test local playback:
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={playRecording}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                🔊 Play Local Recording
              </button>
              
              <button
                onClick={clearRecording}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                🗑️ Clear
              </button>
            </div>
            
            {/* Hidden audio element for playback */}
            <audio
              ref={audioRef}
              src={recordedAudio}
              onEnded={() => console.log('🔊 Playback finished')}
              onError={(e) => console.error('❌ Playback error:', e)}
            />
          </div>
        )}

        {/* Received Audio Log */}
        {receivedAudio.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                🔊 Received Audio Streams ({receivedAudio.length})
              </p>
              <button
                onClick={clearReceivedAudio}
                className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white text-xs rounded transition-colors"
              >
                Clear
              </button>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg max-h-32 overflow-y-auto">
              {receivedAudio.map((audio, index) => (
                <div key={index} className="text-sm text-green-700 dark:text-green-300">
                  {audio}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teacher only notice */}
        {!isTeacher && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            ⚠️ Only teachers can record and stream audio. Students can receive and listen.
          </p>
        )}

        {/* Debug info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded">
          <strong>Debug Info:</strong><br/>
          Recording: {isRecording ? 'Yes' : 'No'}<br/>
          Local Audio: {recordedAudio ? 'Yes' : 'No'}<br/>
          Socket Connected: {socketConnected ? 'Yes' : 'No'}<br/>
          MediaRecorder: {mediaRecorder ? 'Active' : 'None'}<br/>
          Room: {roomId || classId || 'default-room'}<br/>
          User: {userName || 'Anonymous'} ({isTeacher ? 'Teacher' : 'Student'})
        </div>
      </div>
    </div>
  )
}
