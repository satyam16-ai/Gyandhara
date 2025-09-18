// Active Components Export
export { default as StudentList } from './StudentList'
export { default as BandwidthMonitor } from './BandwidthMonitor'

// Dashboard Components  
export { default as LandingPage } from './LandingPage'
export { default as StorytellingLandingPage } from './StorytellingLandingPage'
export { default as NewTeacherDashboard } from './NewTeacherDashboard'
export { default as NewStudentDashboard } from './NewStudentDashboard'

// Real-time Communication Components
export { default as RealtimeChat } from './RealtimeChat'

// Whiteboard Component
export { default as FullWhiteBoard } from './FullWhiteBoard'

// Student Classroom
export { default as StudentClassroom } from './StudentClassroom'

// Export types
export type ChatMessage = {
  sessionId: string
  userId: string
  userName: string
  message: string
  type: 'text' | 'system' | 'notification'
  timestamp: string
}
