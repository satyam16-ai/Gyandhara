'use client'

import { Student } from '@/types'

interface StudentListProps {
  students: Student[]
}

const StudentList: React.FC<StudentListProps> = ({ students }) => {
  if (students.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <div className="text-2xl mb-2">👥</div>
        <p>No students connected</p>
        <p className="text-xs mt-1">Students will appear here when they join</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {students.map((student) => (
        <div
          key={student.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              student.isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <div>
              <div className="font-medium text-gray-800">{student.name}</div>
              <div className="text-xs text-gray-500">
                {student.bandwidthMode} mode
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {student.handRaised && (
              <span className="text-yellow-500 text-sm" title="Hand raised">
                ✋
              </span>
            )}
            <div className={`w-2 h-2 rounded-full ${
              student.isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default StudentList
