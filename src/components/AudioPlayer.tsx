'use client'

import { useRef, useEffect, useState } from 'react'

interface AudioPlayerProps {
  bandwidthMode: 'ultra-low' | 'low' | 'normal'
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ bandwidthMode }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isConnected, setIsConnected] = useState(false)
  const [audioQueue, setAudioQueue] = useState<string[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  useEffect(() => {
    // Initialize audio context
    audioContextRef.current = new AudioContext()
    gainNodeRef.current = audioContextRef.current.createGain()
    gainNodeRef.current.connect(audioContextRef.current.destination)
    gainNodeRef.current.gain.value = volume

    // Simulate WebSocket connection for receiving audio chunks
    setIsConnected(true)

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume
    }
  }, [volume])

  const playAudioChunk = async (base64Data: string) => {
    if (!audioContextRef.current || !gainNodeRef.current) return

    try {
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Decode audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer)
      
      // Create and play audio source
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(gainNodeRef.current)
      source.start()

    } catch (error) {
      console.error('Error playing audio chunk:', error)
    }
  }

  // Simulate receiving audio chunks (in real app, this would come from WebSocket)
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      // This would normally be received from WebSocket
      // For demo purposes, we'll just show the interface
      console.log('Receiving audio chunk...')
    }, 1000)

    return () => clearInterval(interval)
  }, [isConnected])

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
  }

  const getQualityLabel = () => {
    switch (bandwidthMode) {
      case 'ultra-low': return 'Voice Only (16kbps)'
      case 'low': return 'Standard (32kbps)'
      case 'normal': return 'High Quality (64kbps)'
      default: return 'Standard'
    }
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600">
          {isConnected ? 'Receiving Audio' : 'Disconnected'}
        </span>
      </div>

      {/* Audio Quality Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        Audio Quality: {getQualityLabel()}
      </div>

      {/* Playback Controls */}
      <div className="space-y-3">
        <button
          onClick={handleTogglePlay}
          disabled={!isConnected}
          className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
            isConnected
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>{isPlaying ? '⏸️' : '▶️'}</span>
          <span>{isPlaying ? 'Pause' : 'Play'} Audio</span>
        </button>

        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Volume</span>
            <span className="text-sm text-gray-500">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Audio Features (AI Enhancements) */}
      <div className="space-y-2 text-sm">
        <div className="font-medium text-gray-700">AI Features</div>
        <div className="space-y-1 text-gray-600">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="captions" defaultChecked />
            <label htmlFor="captions">Live Captions</label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="translation" />
            <label htmlFor="translation">Auto Translation</label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="noise-reduction" defaultChecked />
            <label htmlFor="noise-reduction">Noise Reduction</label>
          </div>
        </div>
      </div>

      {/* Live Captions Area */}
      <div className="bg-black text-white p-3 rounded text-sm min-h-[60px]">
        <div className="text-xs text-gray-400 mb-1">Live Captions:</div>
        <div className="text-sm">
          {isConnected ? (
            <span className="animate-pulse">Listening for speech...</span>
          ) : (
            <span className="text-gray-500">Connect to see captions</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer
