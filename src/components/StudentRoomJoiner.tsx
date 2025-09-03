'use client'

import React, { useState, useEffect } from 'react'
import { Users, Lock, Video, Clock, User, CheckCircle, AlertCircle, Search, Wifi } from 'lucide-react'

interface JoinRoomData {
  roomId: string
  roomPassword: string
}

interface Room {
  id: string
  roomId: string
  className: string
  title: string
  subject?: string
  description?: string
  teacher: {
    _id: string
    name: string
    email: string
  }
  settings: {
    allowChat: boolean
    allowHandRaise: boolean
    allowWhiteboard: boolean
    allowAudio: boolean
    recordSession: boolean
    allowStudentScreenShare: boolean
    muteParticipantsOnJoin: boolean
    requireApprovalToJoin: boolean
  }
  roomStatus: 'waiting' | 'active' | 'paused' | 'ended'
  currentParticipants: number
  maxParticipants: number
}

interface StudentRoomJoinerProps {
  userId: string
  onRoomJoin?: (room: Room) => void
}

export default function StudentRoomJoiner({ userId, onRoomJoin }: StudentRoomJoinerProps) {
  const [joinData, setJoinData] = useState<JoinRoomData>({
    roomId: '',
    roomPassword: ''
  })
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [roomPreview, setRoomPreview] = useState<Room | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [showAdvancedJoin, setShowAdvancedJoin] = useState(false)

  // Auto-fetch room preview when room ID is entered
  useEffect(() => {
    const timer = setTimeout(() => {
      if (joinData.roomId.length >= 6) {
        fetchRoomPreview()
      } else {
        setRoomPreview(null)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [joinData.roomId])

  const fetchRoomPreview = async () => {
    if (!joinData.roomId.trim()) return

    try {
      setLoadingPreview(true)
      const response = await fetch(`/api/rooms/${joinData.roomId.toUpperCase()}`)
      const data = await response.json()

      if (data.success) {
        setRoomPreview(data.room)
        setError('')
      } else {
        setRoomPreview(null)
        if (response.status === 404) {
          setError('Room not found. Please check the Room ID.')
        }
      }
    } catch (error) {
      console.error('Error fetching room preview:', error)
      setRoomPreview(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!joinData.roomId.trim() || !joinData.roomPassword.trim()) {
      setError('Please enter both Room ID and password')
      return
    }

    try {
      setJoining(true)
      
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: joinData.roomId.toUpperCase(),
          roomPassword: joinData.roomPassword,
          userId
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Successfully joined the room!')
        onRoomJoin?.(data.room)
        // Reset form
        setJoinData({ roomId: '', roomPassword: '' })
        setRoomPreview(null)
      } else {
        setError(data.error || 'Failed to join room')
      }
    } catch (error) {
      console.error('Error joining room:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setJoining(false)
    }
  }

  const formatRoomId = (value: string) => {
    // Remove non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    // Add dashes for better readability (optional)
    if (cleaned.length > 4) {
      return cleaned.slice(0, 4) + '-' + cleaned.slice(4, 8)
    }
    return cleaned
  }

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRoomId(e.target.value)
    setJoinData(prev => ({ ...prev, roomId: formatted.replace('-', '') }))
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      waiting: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Waiting to Start', icon: Clock },
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Live Now', icon: Video },
      paused: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Paused', icon: Clock },
      ended: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Ended', icon: CheckCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting
    const IconComponent = config.icon
    
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${config.bg} ${config.text}`}>
        <IconComponent className="w-4 h-4" />
        <span className="text-sm font-bold">{config.label}</span>
        {status === 'active' && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-1" />}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Join Classroom
        </h1>
        <p className="text-gray-600 text-lg">Enter your Room ID and password to join the live session</p>
      </div>

      {/* Main Join Card */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-8 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Learn?</h2>
            <p className="text-blue-100">Enter your classroom details below</p>
          </div>

          {/* Form */}
          <form onSubmit={handleJoinRoom} className="p-8 space-y-6">
            {/* Room ID Input */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Room ID *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatRoomId(joinData.roomId)}
                  onChange={handleRoomIdChange}
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all duration-300 text-center text-lg font-mono tracking-wider uppercase"
                  placeholder="XXXX-XXXX"
                  maxLength={9} // 8 chars + 1 dash
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {loadingPreview && joinData.roomId.length >= 6 && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {roomPreview && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {!loadingPreview && !roomPreview && joinData.roomId.length >= 6 && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500">Ask your teacher for the 8-character Room ID</p>
            </div>

            {/* Room Preview */}
            {roomPreview && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{roomPreview.className}</h3>
                    <p className="text-gray-600">{roomPreview.title}</p>
                    {roomPreview.subject && (
                      <p className="text-sm text-blue-600 font-medium">{roomPreview.subject}</p>
                    )}
                  </div>
                  {getStatusBadge(roomPreview.roomStatus)}
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Teacher: {roomPreview.teacher.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>{roomPreview.currentParticipants}/{roomPreview.maxParticipants} participants</span>
                  </div>
                </div>

                {roomPreview.description && (
                  <p className="text-sm text-gray-700 bg-white/50 p-3 rounded-xl">
                    {roomPreview.description}
                  </p>
                )}

                {/* Room Features */}
                <div className="flex flex-wrap gap-2">
                  {roomPreview.settings.allowChat && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">💬 Chat</span>
                  )}
                  {roomPreview.settings.allowAudio && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">🎤 Voice</span>
                  )}
                  {roomPreview.settings.allowWhiteboard && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">📝 Whiteboard</span>
                  )}
                  {roomPreview.settings.allowHandRaise && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">✋ Hand Raise</span>
                  )}
                </div>

                {roomPreview.roomStatus === 'ended' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-700 font-medium">This room has ended and is no longer accepting participants.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Room Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={joinData.roomPassword}
                  onChange={(e) => setJoinData(prev => ({ ...prev, roomPassword: e.target.value }))}
                  className="w-full pl-12 pr-6 py-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all duration-300"
                  placeholder="Enter room password"
                />
              </div>
              <p className="text-xs text-gray-500">Password provided by your teacher</p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 font-medium">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-green-700 font-medium">{success}</span>
                </div>
              </div>
            )}

            {/* Join Button */}
            <button
              type="submit"
              disabled={joining || !joinData.roomId || !joinData.roomPassword || (roomPreview?.roomStatus === 'ended')}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            >
              {joining ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Joining Room...</span>
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  <span>Join Classroom</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Join Tips */}
          <div className="bg-gray-50 p-6 border-t border-gray-100">
            <h4 className="font-bold text-gray-900 mb-3">Quick Tips:</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Make sure you have a stable internet connection</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Use headphones for better audio quality</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Test your microphone before joining</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Join from a quiet environment</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wifi className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">Connection Status</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
