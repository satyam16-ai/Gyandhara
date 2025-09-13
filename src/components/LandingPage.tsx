'use client'

import { FC, useState } from 'react'
import { Users, BookOpen, Heart, Menu, X, ArrowRight, Shield, Wifi, Zap } from 'lucide-react'

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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-lg shadow-lg sticky top-0 z-50 border-b border-gray-100">
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
              <button onClick={() => scrollToSection('home')} className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Home</button>
              <button onClick={() => scrollToSection('features')} className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Features</button>
              <button onClick={() => scrollToSection('about')} className="text-gray-700 hover:text-blue-600 transition-colors font-medium">About</button>
              <button 
                onClick={() => window.location.href = '/admin-login'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Admin Login
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <div className="flex flex-col space-y-3">
                <button onClick={() => scrollToSection('home')} className="text-gray-700 hover:text-blue-600 transition-colors text-left font-medium">Home</button>
                <button onClick={() => scrollToSection('features')} className="text-gray-700 hover:text-blue-600 transition-colors text-left font-medium">Features</button>
                <button onClick={() => scrollToSection('about')} className="text-gray-700 hover:text-blue-600 transition-colors text-left font-medium">About</button>
                <button 
                  onClick={() => window.location.href = '/admin-login'}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all text-left font-medium"
                >
                  Admin Login
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-pink-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-300"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-indigo-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-700"></div>
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="mb-12">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                GYAN
              </span>
              <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                DHARA
              </span>
            </h1>
            <p className="text-2xl md:text-4xl text-gray-700 mb-6 font-semibold">
              AI-Powered Low-Bandwidth Learning Platform
            </p>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Bridging the digital divide in rural education with innovative technology that works on 2G networks. 
              Experience interactive whiteboard learning with minimal data usage.
            </p>
          </div>

          {/* User Type Selection Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
            <div 
              onClick={() => onSelectUserType('teacher')}
              className="group relative bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer border border-white/20 hover:border-blue-200 transform hover:scale-105 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Teacher Dashboard</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Create interactive lessons with whiteboard and voice. 
                  Reach hundreds of students with minimal bandwidth.
                </p>
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-200">
                  <span>Start Teaching</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              </div>
            </div>

            <div 
              onClick={() => onSelectUserType('student')}
              className="group relative bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer border border-white/20 hover:border-emerald-200 transform hover:scale-105 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Student Portal</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Join live classes, interact with teachers, and learn 
                  even on 2G networks with AI-enhanced features.
                </p>
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-semibold group-hover:from-emerald-700 group-hover:to-teal-700 transition-all duration-200">
                  <span>Join Class</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              </div>
            </div>

            <div 
              onClick={() => onSelectUserType('parent')}
              className="group relative bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer border border-white/20 hover:border-pink-200 transform hover:scale-105 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-rose-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <Heart className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Parent Portal</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Track your child's learning progress, attendance, 
                  and communicate with teachers effectively.
                </p>
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent font-semibold group-hover:from-pink-700 group-hover:to-rose-700 transition-all duration-200">
                  <span>Monitor Progress</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-center justify-center">
              <span className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2">
                <Wifi className="w-4 h-4" />
                <span>Works on 2G</span>
              </span>
            </div>
            <div className="flex items-center justify-center">
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>AI-Enhanced</span>
              </span>
            </div>
            <div className="flex items-center justify-center">
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Secure & Safe</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">About GYANDHARA</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Revolutionary educational technology designed specifically for India's rural communities,
              making quality education accessible regardless of internet connectivity.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Teachers</h3>
              <p className="text-gray-600">
                Empower educators with AI-assisted teaching tools that work seamlessly on low-bandwidth networks.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Students</h3>
              <p className="text-gray-600">
                Interactive learning experiences that adapt to slow internet speeds while maintaining engagement.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Parents</h3>
              <p className="text-gray-600">
                Stay connected with your child's educational journey through comprehensive progress tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Platform Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive suite of educational tools designed for modern learning needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Wifi className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Low-Bandwidth Optimized</h3>
              <p className="text-gray-600">Works flawlessly on 2G/3G networks with minimal data usage</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Zap className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Powered Learning</h3>
              <p className="text-gray-600">Smart assistance for doubt resolution and personalized learning</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Shield className="w-12 h-12 text-emerald-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Safe</h3>
              <p className="text-gray-600">Enterprise-grade security with parent monitoring capabilities</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Users className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Interactive Whiteboard</h3>
              <p className="text-gray-600">Real-time collaborative drawing and annotation tools</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <BookOpen className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Progress Tracking</h3>
              <p className="text-gray-600">Comprehensive analytics for students, teachers, and parents</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Heart className="w-12 h-12 text-pink-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Parent Portal</h3>
              <p className="text-gray-600">Monitor your child's learning journey and communicate with teachers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
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

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © 2025 GYANDHARA. All rights reserved. Built with ❤️ for rural education.
              </p>
              <p className="text-gray-400 text-sm mt-4 md:mt-0">
                Made in India 🇮🇳 | Digital India Initiative
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage;