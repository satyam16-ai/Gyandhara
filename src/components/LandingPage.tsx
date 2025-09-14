'use client'

import { FC, useState } from 'react'
import { Users, BookOpen, Heart, Menu, X, ArrowRight, Shield, Wifi, Zap } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

interface LandingPageProps {
  onSelectUserType: (type: 'teacher' | 'student' | 'parent') => void
}

const LandingPage: FC<LandingPageProps> = ({ onSelectUserType }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Navigation */}
      <nav className="navbar-enhanced bg-white/95 dark:bg-gray-900/98 backdrop-blur-lg shadow-lg sticky top-0 z-50 border-b border-gray-100 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                GYANDHARA
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('home')} className="navbar-text text-gray-700 dark:text-gray-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Home</button>
              <button onClick={() => scrollToSection('features')} className="navbar-text text-gray-700 dark:text-gray-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Features</button>
              <button onClick={() => scrollToSection('about')} className="navbar-text text-gray-700 dark:text-gray-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">About</button>
              <ThemeToggle />
              <button 
                onClick={() => window.location.href = '/admin-login'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all font-medium hover:from-blue-700 hover:to-purple-700 shadow-md"
              >
                Admin Login
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="navbar-text text-gray-700 dark:text-gray-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100 dark:border-gray-700 bg-white/98 dark:bg-gray-900/98">
              <div className="flex flex-col space-y-3">
                <button onClick={() => scrollToSection('home')} className="navbar-text text-gray-700 dark:text-gray-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">Home</button>
                <button onClick={() => scrollToSection('features')} className="navbar-text text-gray-700 dark:text-gray-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">Features</button>
                <button onClick={() => scrollToSection('about')} className="navbar-text text-gray-700 dark:text-gray-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">About</button>
                <div className="flex items-center justify-between pt-2">
                  <ThemeToggle />
                  <button 
                    onClick={() => window.location.href = '/admin-login'}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all font-medium hover:from-blue-700 hover:to-purple-700 shadow-md"
                  >
                    Admin Login
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-black dark:via-gray-900 dark:to-black flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden transition-colors duration-300">
        {/* Decorative background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 sm:w-48 sm:h-48 lg:w-72 lg:h-72 bg-purple-300/20 dark:bg-purple-500/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-32 h-32 sm:w-48 sm:h-48 lg:w-72 lg:h-72 bg-pink-300/20 dark:bg-pink-500/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-300"></div>
          <div className="absolute bottom-1/4 left-1/3 w-32 h-32 sm:w-48 sm:h-48 lg:w-72 lg:h-72 bg-indigo-300/20 dark:bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-700"></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10 w-full">
          <div className="mb-8 sm:mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-4 sm:mb-6 leading-tight">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                GYAN
              </span>
              <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                DHARA
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-4xl text-gray-700 dark:text-gray-100 mb-4 sm:mb-6 font-semibold px-4">
              AI-Powered Low-Bandwidth Learning Platform
            </p>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-200 max-w-3xl mx-auto leading-relaxed px-4">
              Bridging the digital divide in rural education with innovative technology that works on 2G networks. 
              Experience interactive whiteboard learning with minimal data usage.
            </p>
          </div>

          {/* User Type Selection Cards - Enhanced Mobile Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto mb-8 sm:mb-12 px-4">
            {/* Teacher Dashboard Card */}
            <div 
              onClick={() => onSelectUserType('teacher')}
              className="group relative bg-gradient-to-br from-gray-800/90 via-gray-900/95 to-black/90 dark:from-gray-700/90 dark:via-gray-800/95 dark:to-gray-900/90 backdrop-blur-xl p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl hover:shadow-[0_25px_50px_rgba(59,130,246,0.3)] transition-all duration-500 cursor-pointer border border-gray-700/50 dark:border-gray-600/50 hover:border-blue-400/50 transform hover:scale-105 hover:-translate-y-2 active:scale-95 overflow-hidden w-full"
            >
              {/* Glossy overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30 group-hover:opacity-50 transition-opacity duration-500 rounded-2xl sm:rounded-3xl"></div>
              
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-2xl sm:rounded-3xl blur-xl"></div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-all duration-1000 rounded-2xl sm:rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl group-hover:shadow-[0_20px_40px_rgba(59,130,246,0.4)] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white drop-shadow-lg" />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-3 sm:mb-4 group-hover:text-blue-200 transition-colors duration-300">Teacher Dashboard</h3>
                <p className="text-sm sm:text-base text-gray-300 dark:text-gray-200 leading-relaxed mb-4 sm:mb-6 group-hover:text-gray-200 dark:group-hover:text-gray-100 transition-colors duration-300">
                  Create interactive lessons with whiteboard and voice. 
                  Reach hundreds of students with minimal bandwidth.
                </p>
                <div className="inline-flex items-center space-x-2 text-blue-400 group-hover:text-blue-300 font-semibold transition-all duration-300 group-hover:translate-x-1 text-sm sm:text-base">
                  <span>Start Teaching</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 transform group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              </div>
              
              {/* Bottom highlight */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl sm:rounded-b-3xl"></div>
            </div>

            {/* Student Portal Card */}
            <div 
              onClick={() => onSelectUserType('student')}
              className="group relative bg-gradient-to-br from-gray-800/90 via-gray-900/95 to-black/90 dark:from-gray-700/90 dark:via-gray-800/95 dark:to-gray-900/90 backdrop-blur-xl p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl hover:shadow-[0_25px_50px_rgba(16,185,129,0.3)] transition-all duration-500 cursor-pointer border border-gray-700/50 dark:border-gray-600/50 hover:border-emerald-400/50 transform hover:scale-105 hover:-translate-y-2 active:scale-95 overflow-hidden w-full"
            >
              {/* Glossy overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30 group-hover:opacity-50 transition-opacity duration-500 rounded-2xl sm:rounded-3xl"></div>
              
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-2xl sm:rounded-3xl blur-xl"></div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-all duration-1000 rounded-2xl sm:rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl group-hover:shadow-[0_20px_40px_rgba(16,185,129,0.4)] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white drop-shadow-lg" />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-3 sm:mb-4 group-hover:text-emerald-200 transition-colors duration-300">Student Portal</h3>
                <p className="text-sm sm:text-base text-gray-300 dark:text-gray-200 leading-relaxed mb-4 sm:mb-6 group-hover:text-gray-200 dark:group-hover:text-gray-100 transition-colors duration-300">
                  Join live classes, interact with teachers, and learn 
                  even on 2G networks with AI-enhanced features.
                </p>
                <div className="inline-flex items-center space-x-2 text-emerald-400 group-hover:text-emerald-300 font-semibold transition-all duration-300 group-hover:translate-x-1 text-sm sm:text-base">
                  <span>Join Class</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 transform group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              </div>
              
              {/* Bottom highlight */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl sm:rounded-b-3xl"></div>
            </div>

            {/* Parent Portal Card */}
            <div 
              onClick={() => onSelectUserType('parent')}
              className="group relative bg-gradient-to-br from-gray-800/90 via-gray-900/95 to-black/90 dark:from-gray-700/90 dark:via-gray-800/95 dark:to-gray-900/90 backdrop-blur-xl p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl hover:shadow-[0_25px_50px_rgba(236,72,153,0.3)] transition-all duration-500 cursor-pointer border border-gray-700/50 dark:border-gray-600/50 hover:border-pink-400/50 transform hover:scale-105 hover:-translate-y-2 active:scale-95 overflow-hidden w-full sm:col-span-2 lg:col-span-1"
            >
              {/* Glossy overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30 group-hover:opacity-50 transition-opacity duration-500 rounded-2xl sm:rounded-3xl"></div>
              
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-2xl sm:rounded-3xl blur-xl"></div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-all duration-1000 rounded-2xl sm:rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-pink-500 via-pink-600 to-rose-700 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl group-hover:shadow-[0_20px_40px_rgba(236,72,153,0.4)] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <Heart className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white drop-shadow-lg" />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-3 sm:mb-4 group-hover:text-pink-200 transition-colors duration-300">Parent Portal</h3>
                <p className="text-sm sm:text-base text-gray-300 dark:text-gray-200 leading-relaxed mb-4 sm:mb-6 group-hover:text-gray-200 dark:group-hover:text-gray-100 transition-colors duration-300">
                  Track your child's learning progress, attendance, 
                  and communicate with teachers effectively.
                </p>
                <div className="inline-flex items-center space-x-2 text-pink-400 group-hover:text-pink-300 font-semibold transition-all duration-300 group-hover:translate-x-1 text-sm sm:text-base">
                  <span>Monitor Progress</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 transform group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              </div>
              
              {/* Bottom highlight */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-rose-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl sm:rounded-b-3xl"></div>
            </div>
          </div>

          {/* Features Grid - Enhanced Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 text-sm px-4">
            <div className="flex items-center justify-center">
              <span className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white px-3 sm:px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2 text-sm">
                <Wifi className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Works on 2G</span>
              </span>
            </div>
            <div className="flex items-center justify-center">
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-3 sm:px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2 text-sm">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>AI-Enhanced</span>
              </span>
            </div>
            <div className="flex items-center justify-center sm:col-span-2 lg:col-span-1">
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-3 sm:px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2 text-sm">
                <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Secure & Safe</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-black transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">About GYANDHARA</h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-100 max-w-3xl mx-auto px-4">
              Revolutionary educational technology designed specifically for India's rural communities,
              making quality education accessible regardless of internet connectivity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">For Teachers</h3>
              <p className="text-gray-600 dark:text-gray-200 text-sm sm:text-base">
                Empower educators with AI-assisted teaching tools that work seamlessly on low-bandwidth networks.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">For Students</h3>
              <p className="text-gray-600 dark:text-gray-200 text-sm sm:text-base">
                Interactive learning experiences that adapt to slow internet speeds while maintaining engagement.
              </p>
            </div>

            <div className="text-center md:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">For Parents</h3>
              <p className="text-gray-600 dark:text-gray-200 text-sm sm:text-base">
                Stay connected with your child's educational journey through comprehensive progress tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Whiteboard Showcase */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-black dark:to-gray-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4 sm:mb-6">
              🎨 Interactive Whiteboard Sync
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-100 max-w-4xl mx-auto px-4">
              Experience GYANDHARA's cutting-edge real-time whiteboard synchronization - where teacher drawings instantly appear on student devices through secure socket connections, optimized for rural connectivity.
            </p>
          </div>

          {/* Dual Whiteboard Connection Display */}
          <div className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              
              {/* Teacher Whiteboard */}
              <div className="relative order-1">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">👨‍🏫 Teacher Whiteboard</h3>
                  <p className="text-gray-600 dark:text-gray-300">Drawing and teaching in real-time</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border-4 border-blue-200 dark:border-blue-600 p-4 sm:p-6 transform hover:scale-105 transition-all duration-500 relative">
                  {/* Socket Connection Point - Teacher Side */}
                  <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-20">
                    <div className="relative">
                      {/* Socket Base */}
                      
                    </div>
                  </div>

                  {/* Whiteboard Header */}
                  <div className="flex items-center justify-between mb-4 sm:mb-6 p-2 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-xl sm:rounded-2xl border border-blue-200 dark:border-gray-500">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse delay-100"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse delay-200"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-100">Teaching Mode</span>
                    </div>
                  </div>

                  {/* Teacher Whiteboard Canvas */}
                  <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-700 dark:to-gray-600 border-2 border-dashed border-blue-300 dark:border-blue-400 rounded-xl h-64 lg:h-80 relative overflow-hidden shadow-inner">
                    {/* Teacher Drawing Animations */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 300">
                      {/* Mathematical Equation */}
                      <text 
                        x="50" 
                        y="80" 
                        className="fill-blue-600 text-2xl font-bold opacity-0 animate-[fadeIn_3s_ease-in-out_1s_infinite]"
                      >
                        y = 2x + 5
                      </text>
                      
                      {/* Animated Graph Line */}
                      <path 
                        d="M50 200 L200 120 L350 40" 
                        fill="none" 
                        stroke="#3B82F6" 
                        strokeWidth="4"
                        strokeDasharray="300"
                        strokeDashoffset="300"
                        className="animate-[draw_4s_ease-in-out_1.5s_infinite]"
                      />
                      
                      {/* Coordinate Points */}
                      <circle 
                        cx="125" 
                        cy="160" 
                        r="6" 
                        fill="#EF4444" 
                        className="opacity-0 animate-[fadeIn_3s_ease-in-out_3s_infinite]"
                      />
                      <text 
                        x="135" 
                        y="165" 
                        className="fill-red-600 text-sm font-bold opacity-0 animate-[fadeIn_3s_ease-in-out_3.2s_infinite]"
                      >
                        (2,9)
                      </text>
                      
                      {/* Arrow pointing to graph */}
                      <path 
                        d="M280 100 L320 80 L300 60" 
                        fill="none" 
                        stroke="#10B981" 
                        strokeWidth="3"
                        strokeDasharray="60"
                        strokeDashoffset="60"
                        className="animate-[draw_4s_ease-in-out_4s_infinite]"
                      />
                    </svg>

                    {/* Live Teaching Indicator */}
                    <div className="absolute bottom-4 left-4">
                      <div className="flex items-center space-x-2 animate-pulse">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">🎓 Teaching Live...</span>
                      </div>
                    </div>
                  </div>

                  {/* Teacher Tool Palette */}
                  <div className="flex items-center justify-center space-x-3 mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-blue-200 dark:border-gray-600">
                    <div className="w-8 h-8 bg-black rounded-full border-2 border-gray-300 cursor-pointer hover:scale-125 transition-transform shadow-lg"></div>
                    <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-gray-300 cursor-pointer hover:scale-125 transition-transform shadow-lg ring-4 ring-blue-200"></div>
                    <div className="w-8 h-8 bg-red-500 rounded-full border-2 border-gray-300 cursor-pointer hover:scale-125 transition-transform shadow-lg"></div>
                    <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-gray-300 cursor-pointer hover:scale-125 transition-transform shadow-lg"></div>
                  </div>
                </div>

                {/* Teacher Badge */}
                <div className="absolute -top-4 -left-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl animate-pulse">
                  📡 Broadcasting
                </div>
              </div>

              {/* Student Whiteboard */}
              <div className="relative order-2">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">👨‍🎓 Student Whiteboard</h3>
                  <p className="text-gray-600 dark:text-gray-300">Receiving and viewing in real-time</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border-4 border-green-200 dark:border-green-600 p-4 sm:p-6 transform hover:scale-105 transition-all duration-500 relative">
                  {/* Socket Connection Point - Student Side */}
                  <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 z-20">
                    <div className="relative">
                    </div>
                  </div>

                  {/* Student Whiteboard Header */}
                  <div className="flex items-center justify-between mb-4 sm:mb-6 p-2 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 rounded-xl sm:rounded-2xl border border-green-200 dark:border-gray-500">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse delay-100"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse delay-200"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-100">Learning Mode</span>
                    </div>
                  </div>

                  {/* Student Whiteboard Canvas - Mirrors Teacher Content */}
                  <div className="bg-gradient-to-br from-white to-green-50 dark:from-gray-700 dark:to-gray-600 border-2 border-dashed border-green-300 dark:border-green-400 rounded-xl h-64 lg:h-80 relative overflow-hidden shadow-inner">
                    {/* Student Receiving Same Content with Slight Delay */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 300">
                      {/* Same Mathematical Equation - Slightly Delayed */}
                      <text 
                        x="50" 
                        y="80" 
                        className="fill-green-600 text-2xl font-bold opacity-0 animate-[fadeIn_3s_ease-in-out_1.3s_infinite]"
                      >
                        y = 2x + 5
                      </text>
                      
                      {/* Same Graph Line - Slightly Delayed */}
                      <path 
                        d="M50 200 L200 120 L350 40" 
                        fill="none" 
                        stroke="#10B981" 
                        strokeWidth="4"
                        strokeDasharray="300"
                        strokeDashoffset="300"
                        className="animate-[draw_4s_ease-in-out_1.8s_infinite]"
                      />
                      
                      {/* Same Coordinate Points - Slightly Delayed */}
                      <circle 
                        cx="125" 
                        cy="160" 
                        r="6" 
                        fill="#EF4444" 
                        className="opacity-0 animate-[fadeIn_3s_ease-in-out_3.3s_infinite]"
                      />
                      <text 
                        x="135" 
                        y="165" 
                        className="fill-red-600 text-sm font-bold opacity-0 animate-[fadeIn_3s_ease-in-out_3.5s_infinite]"
                      >
                        (2,9)
                      </text>
                      
                      {/* Same Arrow - Slightly Delayed */}
                      <path 
                        d="M280 100 L320 80 L300 60" 
                        fill="none" 
                        stroke="#10B981" 
                        strokeWidth="3"
                        strokeDasharray="60"
                        strokeDashoffset="60"
                        className="animate-[draw_4s_ease-in-out_4.3s_infinite]"
                      />
                    </svg>

                    {/* Live Receiving Indicator */}
                    <div className="absolute bottom-4 left-4">
                      <div className="flex items-center space-x-2 animate-pulse">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">📺 Receiving Live...</span>
                      </div>
                    </div>

                    {/* Student Name Indicators */}
                    <div className="absolute top-4 right-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded-full">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Rahul</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded-full">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Priya</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student View Only Interface */}
                  <div className="flex items-center justify-center space-x-3 mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-green-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-300">📖 View-Only Mode</span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>

                {/* Student Badge */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl animate-pulse delay-500">
                  📥 Receiving
                </div>
              </div>
            </div>

            {/* Precise Connection Wire */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:block">
              <svg 
                width="96" 
                height="60" 
                viewBox="0 0 96 60" 
                className="absolute"
                style={{ 
                  left: 'calc(-48px)', /* Half of width to center */
                  top: 'calc(-30px)'   /* Half of height to center */
                }}
              >
                <defs>
                  <linearGradient id="preciseWire" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                
                {/* Precise curved wire connecting socket to plug */}
                <path
                  d="M 0 30 Q 48 15, 96 30"
                  stroke="url(#preciseWire)"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="150"
                  strokeDashoffset="150"
                  style={{
                    animation: 'drawPreciseWire 2s ease-in-out 1s forwards'
                  }}
                />
                
                {/* Live Sync indicator */}
                <g style={{ opacity: 0, animation: 'showLiveSync 0.5s ease-out 3s forwards' }}>
                  <rect 
                    x="28" 
                    y="5" 
                    width="40" 
                    height="16" 
                    rx="8" 
                    fill="rgba(16, 185, 129, 0.15)" 
                    stroke="rgba(16, 185, 129, 0.6)" 
                    strokeWidth="1"
                  />
                  <text 
                    x="48" 
                    y="15" 
                    textAnchor="middle" 
                    className="fill-green-600 dark:fill-green-400 text-xs font-semibold"
                  >
                    Live Sync
                  </text>
                </g>
                
                {/* Data flow dots along the exact wire path */}
                <circle
                  r="2"
                  fill="#3b82f6"
                  opacity="0"
                  style={{
                    animation: 'dataFlowPrecise 2s ease-in-out 3.5s infinite'
                  }}
                >
                  <animateMotion
                    dur="2s"
                    begin="3.5s"
                    repeatCount="indefinite"
                  >
                    <mpath href="#preciseWirePath"/>
                  </animateMotion>
                </circle>
                
                <circle
                  r="1.5"
                  fill="#10b981"
                  opacity="0"
                  style={{
                    animation: 'dataFlowPrecise 2s ease-in-out 4s infinite'
                  }}
                >
                  <animateMotion
                    dur="2s"
                    begin="4s"
                    repeatCount="indefinite"
                  >
                    <mpath href="#preciseWirePath"/>
                  </animateMotion>
                </circle>
                
                {/* Hidden path for animation - exact same as visible wire */}
                <path
                  id="preciseWirePath"
                  d="M 0 30 Q 48 15, 96 30"
                  fill="none"
                  opacity="0"
                />
              </svg>
            </div>

            {/* Mobile Connection Indicator */}
            <div className="lg:hidden flex justify-center my-8">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">📡</span>
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200"></div>
                </div>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">📥</span>
                </div>
              </div>
              <div className="absolute mt-12 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-600 shadow-lg">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Real-time Sync</span>
              </div>
            </div>
          </div>

          {/* Technical Features Description */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔌</span>
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Socket Connection</h4>
              <p className="text-gray-600 dark:text-gray-300">WebSocket technology ensures instant, real-time communication between teacher and student devices with minimal latency.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Live Synchronization</h4>
              <p className="text-gray-600 dark:text-gray-300">Every stroke, shape, and annotation appears instantly on all connected student devices, creating seamless collaborative learning.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📡</span>
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2G Optimized</h4>
              <p className="text-gray-600 dark:text-gray-300">Advanced compression algorithms ensure smooth operation even on slowest internet connections in rural areas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-black transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">Platform Features</h2>
            <p className="text-xl text-gray-600 dark:text-gray-100 max-w-3xl mx-auto">
              Comprehensive suite of educational tools designed for modern learning needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border dark:border-gray-700">
              <Wifi className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Low-Bandwidth Optimized</h3>
              <p className="text-gray-600 dark:text-gray-200">Works flawlessly on 2G/3G networks with minimal data usage</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border dark:border-gray-700">
              <Zap className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">AI-Powered Learning</h3>
              <p className="text-gray-600 dark:text-gray-200">Smart assistance for doubt resolution and personalized learning</p>
            </div>

            <div className="bg-white dark:bg-gray-700 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Shield className="w-12 h-12 text-emerald-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Secure & Safe</h3>
              <p className="text-gray-600 dark:text-gray-300">Enterprise-grade security with parent monitoring capabilities</p>
            </div>

            <div className="bg-white dark:bg-gray-700 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Users className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Interactive Whiteboard</h3>
              <p className="text-gray-600 dark:text-gray-300">Real-time collaborative drawing and annotation tools</p>
            </div>

            <div className="bg-white dark:bg-gray-700 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <BookOpen className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Progress Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300">Comprehensive analytics for students, teachers, and parents</p>
            </div>

            <div className="bg-white dark:bg-gray-700 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Heart className="w-12 h-12 text-pink-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Parent Portal</h3>
              <p className="text-gray-600 dark:text-gray-300">Monitor your child's learning journey and communicate with teachers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">G</span>
                </div>
                <span className="text-2xl font-bold">GYANDHARA</span>
              </div>
              <p className="text-gray-400 mb-6">
                Transforming rural education through innovative low-bandwidth technology solutions.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-6">Platform</h3>
              <div className="space-y-3">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Teacher Dashboard</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Student Portal</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Parent Portal</a>
                <a href="/admin-login" className="block text-gray-400 hover:text-white transition-colors">Admin Panel</a>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-6">Support</h3>
              <div className="space-y-3">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Documentation</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Help Center</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Community</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Contact Us</a>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-6">Company</h3>
              <div className="space-y-3">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">About Us</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Careers</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 dark:border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-6 mb-4 md:mb-0">
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  © 2025 GYANDHARA. All rights reserved. Built with ❤️ for rural education.
                </p>
                <div className="md:hidden">
                  <ThemeToggle />
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="hidden md:block">
                  <ThemeToggle />
                </div>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Made in India 🇮🇳 | Digital India Initiative
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage;