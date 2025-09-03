// Core Components
import React from 'react'

// Fallback stub for WhiteBoard to avoid "Cannot find module './WhiteBoard'"
// Replace this stub with a proper re-export when ./WhiteBoard is added.
export const WhiteBoard: React.FC = () => {
  return null
}

export { default as ChatPanel } from './ChatPanel'
export { default as AudioControls } from './AudioControls'
export { default as AudioPlayer } from './AudioPlayer'
export { default as StudentList } from './StudentList'
export { default as BandwidthMonitor } from './BandwidthMonitor'

// Dashboard Components  
export { default as LandingPage } from './LandingPage'
export { default as TeacherDashboard } from './TeacherDashboard'
export { default as StudentDashboard } from './StudentDashboard'

// Room Management Components
export { default as TeacherRoomManager } from './TeacherRoomManager'
export { default as StudentRoomJoiner } from './StudentRoomJoiner'
export { default as ClassManager } from './ClassManager'
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
// 'Student' type is not exported from './StudentList'; if you need a Student type here,
// define and export it explicitly, for example:
// export type Student = { id: string; name: string; email?: string }
