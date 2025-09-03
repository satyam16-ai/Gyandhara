'use client'

import { FC } from 'react'

interface LandingPageProps {
  onSelectUserType: (type: 'teacher' | 'student') => void
}

const LandingPage: FC<LandingPageProps> = ({ onSelectUserType }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-pink-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-300"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-indigo-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-700"></div>
      </div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Voice
            </span>
            <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Board
            </span>
          </h1>
          <p className="text-xl md:text-3xl text-gray-700 mb-4 font-semibold">
            AI-Powered Low-Bandwidth Learning Platform
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Quality education for rural students with minimal data usage
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-12">
          <div 
            onClick={() => onSelectUserType('teacher')}
            className="group relative bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer border border-white/20 hover:border-blue-200 transform hover:scale-105 active:scale-95 overflow-hidden"
          >
            {/* Gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                👨‍🏫
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Teacher</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Create interactive lessons with whiteboard and voice. 
                Reach hundreds of students with minimal bandwidth.
              </p>
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-200">
                <span>Start Teaching</span>
                <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
              </div>
            </div>
          </div>

          <div 
            onClick={() => onSelectUserType('student')}
            className="group relative bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer border border-white/20 hover:border-emerald-200 transform hover:scale-105 active:scale-95 overflow-hidden"
          >
            {/* Gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                🎓
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Student</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Join live classes, interact with teachers, and learn 
                even on 2G networks with AI-enhanced features.
              </p>
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-semibold group-hover:from-emerald-700 group-hover:to-teal-700 transition-all duration-200">
                <span>Join Class</span>
                <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div className="flex items-center justify-center">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2">
              <span>📶</span>
              <span>Works on 2G</span>
            </span>
          </div>
          <div className="flex items-center justify-center">
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2">
              <span>🤖</span>
              <span>AI-Enhanced</span>
            </span>
          </div>
          <div className="flex items-center justify-center">
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2">
              <span>💾</span>
              <span>Offline-Ready</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
