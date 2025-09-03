'use client'

import { useState, useRef, useEffect } from 'react'

interface AudioControlsProps {
  isTeaching: boolean
  bandwidthMode: 'ultra-low' | 'low' | 'normal'
}

const AudioControls: React.FC<AudioControlsProps> = ({ isTeaching, bandwidthMode }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  useEffect(() => {
    if (isTeaching && isRecording) {
      startAudioCapture()
    } else {
      stopAudioCapture()
    }

    return () => {
      stopAudioCapture()
    }
  }, [isTeaching, isRecording])

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: bandwidthMode === 'ultra-low' ? 16000 : 44100,
        } 
      })

      // Set up audio context for level monitoring
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      // Set up MediaRecorder with appropriate codec
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: getBitrate()
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options)
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Convert to base64 and send via WebSocket
          const reader = new FileReader()
          reader.onloadend = () => {
            const audioData = {
              chunk: reader.result?.toString().split(',')[1] || '',
              time: Date.now(),
              duration: 1000 // 1 second chunks
            }
            // Send audioData via WebSocket to students
            console.log('Audio chunk ready:', audioData.chunk.length, 'bytes')
          }
          reader.readAsDataURL(event.data)
        }
      }

      mediaRecorderRef.current.start(1000) // Record in 1-second chunks
      monitorAudioLevel()

    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const stopAudioCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setAudioLevel(0)
  }

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const updateLevel = () => {
      if (!analyserRef.current) return

      analyserRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
      setAudioLevel(average / 255) // Normalize to 0-1

      if (isRecording) {
        requestAnimationFrame(updateLevel)
      }
    }

    updateLevel()
  }

  const getBitrate = (): number => {
    switch (bandwidthMode) {
      case 'ultra-low': return 16000  // 16kbps
      case 'low': return 32000        // 32kbps  
      case 'normal': return 64000     // 64kbps
      default: return 32000
    }
  }

  const handleToggleRecording = () => {
    if (!isTeaching) return
    setIsRecording(!isRecording)
  }

  const handleToggleMute = () => {
    setIsMuted(!isMuted)
    // In real implementation, mute/unmute the audio stream
  }

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggleRecording}
          disabled={!isTeaching}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          } ${!isTeaching ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>{isRecording ? '⏹️' : '🎤'}</span>
          <span>{isRecording ? 'Stop' : 'Start'} Audio</span>
        </button>

        <button
          onClick={handleToggleMute}
          className={`p-2 rounded-lg transition-colors ${
            isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Audio Level Indicator */}
      {isRecording && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Audio Level:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-100"
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
          </div>
          
          {/* Bandwidth Info */}
          <div className="text-xs text-gray-500">
            Mode: {bandwidthMode} ({getBitrate() / 1000}kbps)
          </div>
        </div>
      )}

      {/* Status */}
      <div className="text-sm text-gray-600">
        {isTeaching ? (
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-400'}`} />
            <span>{isRecording ? 'Broadcasting' : 'Ready to broadcast'}</span>
          </div>
        ) : (
          <div className="text-gray-400">Start class to enable audio</div>
        )}
      </div>
    </div>
  )
}

export default AudioControls
