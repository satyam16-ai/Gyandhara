// Core Components
import React from 'react'

// Fallback stub for WhiteBoard to avoid "Cannot find module './WhiteBoard'"
// Replace this stub with a proper re-export when ./WhiteBoard is added.
export const WhiteBoard: React.FC = () => {
  return null
}

//export { default as ChatPanel } from './ChatPanel'
//export { default as AudioControls } from './AudioControls'
// export { default as AudioPlayer } from './AudioPlayer' // Removed: module not found
export { default as StudentList } from './StudentList'
export { default as BandwidthMonitor } from './BandwidthMonitor'

// Dashboard Components  
export { default as LandingPage } from './LandingPage'
export { default as NewTeacherDashboard } from './NewTeacherDashboard'
export { default as NewStudentDashboard } from './NewStudentDashboard'

// Real-time Communication Components
export { default as WebRTCAudioBroadcast } from './WebRTCAudioBroadcast'
export { default as RealtimeChat } from './RealtimeChat'

// Room Management Components
// (Removed - using new classroom-based system)

// Export types
export type ChatMessage = {
  sessionId: string
  userId: string
  userName: string
  message: string
  type: 'text' | 'system' | 'notification'
  timestamp: string
}
// 'Student' type is not exported from './StudentList'; if you need a Student type here,
// define and export it explicitly, for example:
// export type Student = { id: string; name: string; email?: string }
