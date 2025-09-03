'use client'

import React, { useState, useEffect } from 'react'
import { PlusCircle, Settings, Users, Clock, Video, Shield, Copy, Check, Eye, EyeOff, BookOpen } from 'lucide-react'
import ClassManager from './ClassManager'

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
  maxParticipants: number
  currentParticipants: number
  roomStatus: 'waiting' | 'active' | 'paused' | 'ended'
  isPublic: boolean
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
  createdAt: string
}

interface CreateRoomData {
  className: string
  title: string
  subject: string
  description: string
  roomPassword: string
  maxParticipants: number
  isPublic: boolean
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
}

interface TeacherRoomManagerProps {
  teacherId: string
  onRoomCreate?: (room: Room) => void
  onRoomJoin?: (roomId: string) => void
}

export default function TeacherRoomManager({ teacherId, onRoomCreate, onRoomJoin }: TeacherRoomManagerProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'ended' | 'all'>('active')
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [showClassManager, setShowClassManager] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  const [createRoomData, setCreateRoomData] = useState<CreateRoomData>({
    className: '',
    title: '',
    subject: '',
    description: '',
    roomPassword: '',
    maxParticipants: 30,
    isPublic: false,
    settings: {
      allowChat: true,
      allowHandRaise: true,
      allowWhiteboard: true,
      allowAudio: true,
      recordSession: true,
      allowStudentScreenShare: false,
      muteParticipantsOnJoin: false,
      requireApprovalToJoin: false
    }
  })

  useEffect(() => {
    fetchRooms()
  }, [teacherId, activeTab])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/rooms/teacher/${teacherId}?status=${activeTab}`)
      const data = await response.json()
      
      if (data.success) {
        setRooms(data.rooms)
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCreateRoomData(prev => ({ ...prev, roomPassword: password }))
  }

  const handleCreateRoom = async () => {
    try {
      setCreatingRoom(true)
      
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createRoomData,
          teacherId
        })
      })

      const data = await response.json()

      if (data.success) {
        setShowCreateModal(false)
        setCreateRoomData({
          className: '',
          title: '',
          subject: '',
          description: '',
          roomPassword: '',
          maxParticipants: 30,
          isPublic: false,
          settings: {
            allowChat: true,
            allowHandRaise: true,
            allowWhiteboard: true,
            allowAudio: true,
            recordSession: true,
            allowStudentScreenShare: false,
            muteParticipantsOnJoin: false,
            requireApprovalToJoin: false
          }
        })
        fetchRooms()
        onRoomCreate?.(data.room)
      } else {
        alert('Error creating room: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating room:', error)
      alert('Failed to create room. Please try again.')
    } finally {
      setCreatingRoom(false)
    }
  }

  const copyToClipboard = (text: string, roomId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedRoomId(roomId)
    setTimeout(() => setCopiedRoomId(null), 2000)
  }

  const togglePasswordVisibility = (roomId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [roomId]: !prev[roomId]
    }))
  }

  const handleJoinRoom = (roomId: string) => {
    onRoomJoin?.(roomId)
  }

  const handleManageClasses = (room: Room) => {
    setSelectedRoom(room)
    setShowClassManager(true)
  }

  const getStatusBadge = (status: string, currentParticipants: number) => {
    const statusConfig = {
      waiting: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Waiting' },
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Live' },
      paused: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Paused' },
      ended: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Ended' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting
    
    return (
      <div className="flex items-center space-x-2">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
          {config.label}
        </span>
        {status === 'active' && (
          <span className="flex items-center space-x-1 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">{currentParticipants} online</span>
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            My Classrooms
          </h1>
          <p className="text-gray-600 mt-2">Create and manage your virtual classrooms</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-3"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Create New Room</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-gray-100 p-2 rounded-2xl">
        {[
          { key: 'active', label: 'Active Rooms', icon: Video },
          { key: 'ended', label: 'Past Rooms', icon: Clock },
          { key: 'all', label: 'All Rooms', icon: Users }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No rooms found</h3>
          <p className="text-gray-600 mb-6">
            {activeTab === 'active' ? 'Create your first classroom to get started' : 'No rooms in this category'}
          </p>
          {activeTab === 'active' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
            >
              Create Room
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room, index) => (
            <div key={room.id || `room-${index}`} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              {/* Room Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{room.className}</h3>
                  <p className="text-sm text-gray-600">{room.title}</p>
                  {room.subject && (
                    <p className="text-xs text-blue-600 font-medium mt-1">{room.subject}</p>
                  )}
                </div>
                {getStatusBadge(room.roomStatus, room.currentParticipants)}
              </div>

              {/* Room Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Room ID</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-100 px-2 py-1 rounded font-mono text-blue-600">
                      {room.roomId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(room.roomId, room.roomId)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {copiedRoomId === room.roomId ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Password</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-100 px-2 py-1 rounded font-mono text-gray-800">
                      {showPasswords[room.id] ? '********' : '••••••••'}
                    </code>
                    <button
                      onClick={() => togglePasswordVisibility(room.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {showPasswords[room.id] ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Participants</span>
                  <span className="font-medium">
                    {room.currentParticipants}/{room.maxParticipants}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Created</span>
                  <span className="text-gray-800">
                    {new Date(room.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {room.roomStatus !== 'ended' && (
                  <button
                    onClick={() => handleManageClasses(room)}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Manage Classes</span>
                  </button>
                )}
                
                <button className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  <Settings className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Create New Classroom</h2>
                  <p className="text-blue-100">Set up your virtual learning environment</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Class Name *
                    </label>
                    <input
                      type="text"
                      value={createRoomData.className}
                      onChange={(e) => setCreateRoomData(prev => ({ ...prev, className: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                      placeholder="e.g., Mathematics Grade 10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Session Title *
                    </label>
                    <input
                      type="text"
                      value={createRoomData.title}
                      onChange={(e) => setCreateRoomData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                      placeholder="e.g., Algebra Fundamentals"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={createRoomData.subject}
                      onChange={(e) => setCreateRoomData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                      placeholder="e.g., Mathematics"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={createRoomData.maxParticipants}
                      onChange={(e) => setCreateRoomData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 30 }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={createRoomData.description}
                    onChange={(e) => setCreateRoomData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors resize-none"
                    placeholder="Brief description of the session..."
                  />
                </div>
              </div>

              {/* Security Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Security Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Room Password *
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={createRoomData.roomPassword}
                        onChange={(e) => setCreateRoomData(prev => ({ ...prev, roomPassword: e.target.value }))}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                        placeholder="Enter room password"
                      />
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                      >
                        Generate
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">4-20 characters required</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={createRoomData.isPublic}
                      onChange={(e) => setCreateRoomData(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                      Make room publicly discoverable
                    </label>
                  </div>
                </div>
              </div>

              {/* Room Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Room Features</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { key: 'allowChat', label: 'Text Chat', icon: '💬' },
                    { key: 'allowHandRaise', label: 'Hand Raising', icon: '✋' },
                    { key: 'allowWhiteboard', label: 'Whiteboard', icon: '📝' },
                    { key: 'allowAudio', label: 'Voice Chat', icon: '🎤' },
                    { key: 'recordSession', label: 'Recording', icon: '📹' },
                    { key: 'allowStudentScreenShare', label: 'Student Screen Share', icon: '📺' }
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                      <input
                        type="checkbox"
                        id={setting.key}
                        checked={createRoomData.settings[setting.key as keyof typeof createRoomData.settings]}
                        onChange={(e) => setCreateRoomData(prev => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            [setting.key]: e.target.checked
                          }
                        }))}
                        className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={setting.key} className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <span>{setting.icon}</span>
                        <span>{setting.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={!createRoomData.className || !createRoomData.title || !createRoomData.roomPassword || creatingRoom}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {creatingRoom ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5" />
                      <span>Create Room</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class Manager Modal */}
      {showClassManager && selectedRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Manage Classes</h2>
                  <p className="text-blue-100">{selectedRoom.className} - {selectedRoom.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowClassManager(false)
                    setSelectedRoom(null)
                  }}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Class Manager Content */}
            <div className="p-6">
              <ClassManager 
                roomId={selectedRoom.roomId}
                teacherId={teacherId}
                className={selectedRoom.className}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
