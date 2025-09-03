'use client'

import { FC, useEffect, useState, ReactNode } from 'react'
import { BookOpen, GraduationCap, PenTool, Zap, WifiOff, BrainCircuit } from 'lucide-react'
import { HoleBackground } from './animate-ui/backgrounds/hole'

interface LandingPageProps {
  onSelectUserType: (type: 'teacher' | 'student') => void
}

const LandingPage: FC<LandingPageProps> = ({ onSelectUserType }) => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Gyaandhara...</p>
        </div>
      </div>
    )
  }

  return (
    <HoleBackground className="min-h-screen bg-gray-900 text-white relative overflow-hidden">

      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
        <div className="text-2xl font-bold">
          <span className="text-teal-400">Gyaan</span>
          <span className="text-indigo-400">dhara</span>
        </div>
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#features" className="hover:text-teal-400 transition-colors">Features</a>
          <a href="#about" className="hover:text-indigo-400 transition-colors">About</a>
          <a href="#contact" className="hover:text-teal-400 transition-colors">Contact</a>
        </nav>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 pt-24 md:pt-12">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
              Gyaandhara
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Flow of Knowledge, Empowering Minds. An AI-Powered Learning Platform for All.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">
          <UserCard
            icon={<PenTool size={32} className="text-teal-400" />}
            title="Teacher"
            description="Craft engaging lessons, manage classrooms, and inspire students with powerful tools."
            buttonText="Start Teaching"
            onClick={() => onSelectUserType('teacher')}
            gradient="from-teal-500/20 to-cyan-500/20"
            hoverBorder="hover:border-teal-400"
          />
          <UserCard
            icon={<GraduationCap size={32} className="text-indigo-400" />}
            title="Student"
            description="Join live classes, collaborate with peers, and learn from anywhere, on any device."
            buttonText="Join a Class"
            onClick={() => onSelectUserType('student')}
            gradient="from-indigo-500/20 to-purple-500/20"
            hoverBorder="hover:border-indigo-400"
          />
        </div>

        <div id="features" className="text-center">
          <h2 className="text-3xl font-bold mb-10">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard icon={<WifiOff />} title="Low-Bandwidth Mode" description="Optimized for 2G networks, ensuring access for everyone." />
            <FeatureCard icon={<BrainCircuit />} title="AI-Powered Assistance" description="Smart summaries, transcriptions, and insights to enhance learning." />
            <FeatureCard icon={<BookOpen />} title="Interactive Whiteboard" description="Real-time collaboration with drawing, text, and shapes." />
          </div>
        </div>
      </main>

      <footer id="about" className="relative z-10 text-center p-8 mt-16 border-t border-gray-800">
        <p className="text-gray-500">&copy; 2025 Gyaandhara. All rights reserved.</p>
        <p id="contact" className="text-gray-600 mt-2">Contact us at <a href="mailto:support@gyaandhara.com" className="text-teal-400 hover:underline">support@gyaandhara.com</a></p>
      </footer>
    </HoleBackground>
  )
}

interface UserCardProps {
  icon: ReactNode
  title: string
  description: string
  buttonText: string
  onClick: () => void
  gradient?: string
  hoverBorder?: string
}

const UserCard: FC<UserCardProps> = ({ icon, title, description, buttonText, onClick, gradient = 'from-teal-500/20 to-cyan-500/20', hoverBorder = '' }) => (
  <div
    onClick={onClick}
    className={`group relative bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-700 ${hoverBorder} transform hover:-translate-y-2 overflow-hidden`}
    suppressHydrationWarning={true}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
    <div className="relative z-10 text-center">
      <div className="w-20 h-20 mx-auto mb-6 bg-gray-900 rounded-full flex items-center justify-center shadow-md group-hover:shadow-xl transition-shadow duration-300">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed mb-6">{description}</p>
      <div className="inline-flex items-center space-x-2 font-semibold text-teal-400 group-hover:text-white transition-colors duration-300">
        <span>{buttonText}</span>
        <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
      </div>
    </div>
  </div>
)

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
}

const FeatureCard: FC<FeatureCardProps> = ({ icon, title, description }) => (
  <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700 text-center">
    <div className="text-teal-400 mb-4 inline-block">{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </div>
)

export default LandingPage