'use client'

import React, { useState, useEffect } from 'react'
import { 
  PlusCircle, 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  Edit3, 
  Trash2, 
  Play, 
  Square,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react'

interface RoomClass {
  _id: string
  roomId: string
  subject: string
  lectureNumber: number
  topic: string
  teacherId: string
  teacher?: {
    _id: string
    name: string
    email: string
  }
  scheduledDate: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  attendees: Array<{
    userId: string
    name: string
    joinedAt: string
  }>
  sessionId?: string
  startedAt?: string
  endedAt?: string
  duration?: number
  materials?: Array<{
    type: 'document' | 'link' | 'video'
    title: string
    url: string
    uploadedAt: string
  }>
  stats?: {
    totalAttendees: number
    averageAttendanceTime: number
    peakAttendance: number
  }
  createdAt: string
  updatedAt: string
}

interface CreateClassData {
  subject: string
  lectureNumber: number
  topic: string
  scheduledDate: string
  description?: string
}

interface ClassManagerProps {
  roomId: string
  teacherId: string
  className?: string
}

export default function ClassManager({ roomId, teacherId, className }: ClassManagerProps) {
  const [classes, setClasses] = useState<RoomClass[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingClass, setCreatingClass] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'live' | 'completed' | 'cancelled'>('all')
  
  const [createClassData, setCreateClassData] = useState<CreateClassData>({
    subject: '',
    lectureNumber: 1,
    topic: '',
    scheduledDate: '',
    description: ''
  })

  useEffect(() => {
    fetchClasses()
  }, [roomId])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/room-classes?roomId=${roomId}`)
      const data = await response.json()
      
      if (data.success) {
        setClasses(data.classes)
        
        // Auto-increment lecture number for new classes
        if (data.classes.length > 0) {
          const maxLectureNumber = Math.max(...data.classes.map((c: RoomClass) => c.lectureNumber))
          setCreateClassData(prev => ({ ...prev, lectureNumber: maxLectureNumber + 1 }))
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClass = async () => {
    try {
      setCreatingClass(true)
      
      const response = await fetch('/api/room-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createClassData,
          roomId,
          teacherId
        })
      })

      const data = await response.json()

      if (data.success) {
        setShowCreateModal(false)
        setCreateClassData({
          subject: '',
          lectureNumber: createClassData.lectureNumber + 1,
          topic: '',
          scheduledDate: '',
          description: ''
        })
        fetchClasses()
      } else {
        console.error('Failed to create class:', data.message)
      }
    } catch (error) {
      console.error('Error creating class:', error)
    } finally {
      setCreatingClass(false)
    }
  }

  const handleStartClass = async (classId: string) => {
    try {
      const response = await fetch(`/api/room-classes/${classId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId })
      })

      if (response.ok) {
        // Store the class and room info for the teacher whiteboard
        const classToStart = classes.find(cls => cls._id === classId)
        if (classToStart) {
          localStorage.setItem('teacherRoomId', classToStart.roomId)
          localStorage.setItem('teacherClassId', classId)
          localStorage.setItem('currentTeachingClass', JSON.stringify(classToStart))
          
          // Navigate to teacher dashboard with whiteboard
          window.location.href = '/teacher-dashboard'
        }
        
        fetchClasses()
      }
    } catch (error) {
      console.error('Error starting class:', error)
    }
  }

  const handleEndClass = async (classId: string) => {
    try {
      const response = await fetch(`/api/room-classes/${classId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId })
      })

      if (response.ok) {
        fetchClasses()
      }
    } catch (error) {
      console.error('Error ending class:', error)
    }
  }

  const handleDeleteClass = async (classId: string) => {
    if (confirm('Are you sure you want to delete this class?')) {
      try {
        const response = await fetch(`/api/room-classes/${classId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          fetchClasses()
        }
      } catch (error) {
        console.error('Error deleting class:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      live: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.scheduled
  }

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `Lecture ${cls.lectureNumber}`.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || cls.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Class Management</h2>
          <p className="text-gray-600">Manage lectures and sessions for {className || 'this room'}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Add Class</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search classes by subject, topic, or lecture number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Classes</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classes...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {classes.length === 0 ? 'Get started by creating your first class.' : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => (
            <div key={cls._id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {cls.subject} - Lecture {cls.lectureNumber}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{cls.topic}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cls.status)}`}>
                  {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(cls.scheduledDate).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  {cls.attendees.length} attendees
                </div>
                {cls.duration && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    {Math.round(cls.duration / 60)} minutes
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                {cls.status === 'scheduled' && (
                  <button
                    onClick={() => handleStartClass(cls._id)}
                    className="flex-1 flex items-center justify-center space-x-1 bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start</span>
                  </button>
                )}
                
                {cls.status === 'live' && (
                  <button
                    onClick={() => handleEndClass(cls._id)}
                    className="flex-1 flex items-center justify-center space-x-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    <span>End</span>
                  </button>
                )}

                {(cls.status === 'scheduled' || cls.status === 'cancelled') && (
                  <button
                    onClick={() => handleDeleteClass(cls._id)}
                    className="px-3 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Class</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={createClassData.subject}
                  onChange={(e) => setCreateClassData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., Mathematics, Physics, Biology"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lecture Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={createClassData.lectureNumber}
                  onChange={(e) => setCreateClassData(prev => ({ ...prev, lectureNumber: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic
                </label>
                <input
                  type="text"
                  value={createClassData.topic}
                  onChange={(e) => setCreateClassData(prev => ({ ...prev, topic: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., Quadratic Equations, Newton's Laws"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={createClassData.scheduledDate}
                  onChange={(e) => setCreateClassData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={createClassData.description}
                  onChange={(e) => setCreateClassData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Brief description of the class content..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClass}
                disabled={creatingClass || !createClassData.subject || !createClassData.topic || !createClassData.scheduledDate}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creatingClass ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
