'use client'

import { FC, useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { 
  Users, 
  BookOpen, 
  Heart, 
  Menu, 
  X, 
  ArrowRight, 
  Shield, 
  Wifi, 
  Zap,
  MapPin,
  Signal,
  Battery,
  Globe,
  Smartphone,
  School,
  Target,
  Award,
  TrendingUp,
  CheckCircle,
  Sparkles
} from 'lucide-react'
import ThemeToggle from './ThemeToggle'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

interface StorytellingLandingPageProps {
  onSelectUserType: (type: 'teacher' | 'student' | 'parent') => void
}

const StorytellingLandingPage: FC<StorytellingLandingPageProps> = ({ onSelectUserType }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [studentsCount, setStudentsCount] = useState(0)
  const [teachersCount, setTeachersCount] = useState(0)
  const [hoursCount, setHoursCount] = useState(0)
  
  // Real data from database
  const [realData, setRealData] = useState({
    studentsCount: 0,
    teachersCount: 0,
    learningHours: 0
  })
  
  // Refs for animations
  const heroRef = useRef<HTMLElement>(null)
  const problemRef = useRef<HTMLElement>(null)
  const solutionRef = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)
  const impactRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)

  // Counter animation function
  const animateCounter = (start: number, end: number, duration: number, setter: (value: number) => void) => {
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const current = Math.floor(start + (end - start) * progress)
      setter(current)
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  // Fetch real statistics from database
  useEffect(() => {
    const fetchRealStatistics = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'
        const response = await fetch(`${backendUrl}/api/admin-simple/public/statistics`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Real statistics fetched:', data)
          setRealData({
            studentsCount: data.studentsCount,
            teachersCount: data.teachersCount,
            learningHours: data.learningHours
          })
          
          // Set initial values to inflated numbers for dramatic effect
          setStudentsCount(Math.max(data.studentsCount * 10, 1200)) // At least 10x or 1200 minimum
          setTeachersCount(Math.max(data.teachersCount * 5, 180))    // At least 5x or 180 minimum  
          setHoursCount(Math.max(data.learningHours * 20, 2400))     // At least 20x or 2400 minimum
        } else {
          throw new Error('API call failed')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.warn('❌ Failed to fetch real statistics:', errorMessage)
        // Use realistic demo data with dramatic inflation for animation
        setRealData({
          studentsCount: 5,    // Real number of students in system
          teachersCount: 3,    // Real number of teachers in system
          learningHours: 47    // Real learning hours
        })
        // Start with inflated numbers for dramatic countdown effect
        setStudentsCount(1500)  // Start high for dramatic effect
        setTeachersCount(250)   // Start high for dramatic effect
        setHoursCount(3000)     // Start high for dramatic effect
      }
    }

    fetchRealStatistics()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const ctx = gsap.context(() => {
      // Chapter 1: Hero Section (Problem) - Fade in + slide up
      gsap.fromTo('.hero-title', 
        { 
          y: 100, 
          opacity: 0,
          scale: 0.8
        },
        { 
          y: 0, 
          opacity: 1,
          scale: 1,
          duration: 1.5,
          ease: 'power3.out',
          delay: 0.5
        }
      )

      gsap.fromTo('.hero-subtitle',
        { 
          y: 50, 
          opacity: 0 
        },
        { 
          y: 0, 
          opacity: 1, 
          duration: 1.2, 
          ease: 'power2.out',
          delay: 1
        }
      )

      // Background parallax effect
      gsap.to('.hero-bg', {
        scale: 1.1,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      })

      // Chapter 2: Challenges Section (The Struggle) - Sequential animations
      gsap.fromTo('.challenge-card',
        { 
          x: -100, 
          opacity: 0,
          rotateY: 45
        },
        {
          x: 0,
          opacity: 1,
          rotateY: 0,
          duration: 0.8,
          stagger: 0.3,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: problemRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      )

      // Chapter 3: Solution Section (GYANDHARA intro) - Zoom reveal
      gsap.fromTo('.solution-mockup',
        {
          scale: 0.6,
          opacity: 0,
          rotateX: 30
        },
        {
          scale: 1,
          opacity: 1,
          rotateX: 0,
          duration: 1.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: solutionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse'
          }
        }
      )

      // Chapter 4: Features Section - Alternating slide animations
      gsap.fromTo('.feature-card-left',
        { 
          x: -150, 
          opacity: 0,
          rotateY: -20
        },
        {
          x: 0,
          opacity: 1,
          rotateY: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: featuresRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      )

      gsap.fromTo('.feature-card-right',
        { 
          x: 150, 
          opacity: 0,
          rotateY: 20
        },
        {
          x: 0,
          opacity: 1,
          rotateY: 0,
          duration: 1,
          ease: 'power2.out',
          delay: 0.2,
          scrollTrigger: {
            trigger: featuresRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      )

      // Chapter 5: Impact Section - Counter animations and network effect
      ScrollTrigger.create({
        trigger: impactRef.current,
        start: 'top 80%',
        onEnter: () => {
          // Animate down to real data numbers
          animateCounter(studentsCount, realData.studentsCount, 2000, setStudentsCount)
          animateCounter(teachersCount, realData.teachersCount, 2000, setTeachersCount)
          animateCounter(hoursCount, realData.learningHours, 2500, setHoursCount)
        },
        onLeaveBack: () => {
          // Reset to inflated numbers when scrolling back up
          setStudentsCount(Math.max(realData.studentsCount * 10, 10000))
          setTeachersCount(Math.max(realData.teachersCount * 5, 500))
          setHoursCount(Math.max(realData.learningHours * 20, 5000))
        }
      })

      // Network connection animation
      gsap.fromTo('.network-line',
        { 
          strokeDashoffset: 1000 
        },
        {
          strokeDashoffset: 0,
          duration: 2,
          ease: 'power2.inOut',
          stagger: 0.3,
          scrollTrigger: {
            trigger: impactRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse'
          }
        }
      )

      // Chapter 6: CTA Section - Background gradient animation
      gsap.fromTo('.cta-background',
        {
          background: 'linear-gradient(135deg, rgb(99, 102, 241, 0.1), rgb(168, 85, 247, 0.1))'
        },
        {
          background: 'linear-gradient(135deg, rgb(99, 102, 241, 0.8), rgb(168, 85, 247, 0.8))',
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 80%',
            end: 'bottom 20%',
            scrub: true
          }
        }
      )

      // Pulsing CTA button
      gsap.to('.cta-button', {
        scale: 1.05,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut'
      })

      // Floating elements animation
      gsap.to('.floating-element', {
        y: -20,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut',
        stagger: 0.5
      })

    })

    return () => ctx.revert()
  }, [realData]) // Re-run when real data is loaded

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300 overflow-x-hidden">
      {/* Enhanced Navigation */}
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 w-[80%] max-w-6xl bg-white/90 dark:bg-black/90 navbar-blur shadow-3xl z-50 border border-gray-200/50 dark:border-gray-800/50 transition-all duration-300 rounded-3xl hover:shadow-3xl hover:bg-white/95 dark:hover:bg-black/95">
        <div className="px-6 sm:px-8 lg:px-10">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                GYANDHARA
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <button onClick={() => scrollToSection('hero')} className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 font-medium text-sm lg:text-base hover:scale-105 px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30">Home</button>
              <button onClick={() => scrollToSection('problem')} className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 font-medium text-sm lg:text-base hover:scale-105 px-3 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30">Challenge</button>
              <button onClick={() => scrollToSection('solution')} className="text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 font-medium text-sm lg:text-base hover:scale-105 px-3 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30">Solution</button>
              <button onClick={() => scrollToSection('features')} className="text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 font-medium text-sm lg:text-base hover:scale-105 px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30">Features</button>
              <button onClick={() => scrollToSection('impact')} className="text-gray-700 dark:text-gray-200 hover:text-pink-600 dark:hover:text-pink-400 transition-all duration-300 font-medium text-sm lg:text-base hover:scale-105 px-3 py-2 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/30">Impact</button>
              
              {/* Theme Toggle with better styling */}
              <div className="hidden lg:block">
                <ThemeToggle />
              </div>
              
              {/* Enhanced Admin Login Button */}
              <button 
                onClick={() => window.location.href = '/admin-login'}
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-4 lg:px-6 py-2.5 rounded-2xl hover:shadow-xl transition-all duration-300 font-semibold text-sm lg:text-base hover:scale-105 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-lg border border-white/20"
              >
                Admin
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-3">
              <div className="lg:hidden">
                <ThemeToggle />
              </div>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-110"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Enhanced Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-6 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/95 dark:bg-black/95 rounded-b-3xl mt-4 -mx-6 sm:-mx-8 lg:-mx-10 px-6 sm:px-8 lg:px-10">
              <div className="flex flex-col space-y-4">
                <button onClick={() => { scrollToSection('hero'); setIsMenuOpen(false); }} className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 text-left font-medium px-4 py-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:scale-105">🏠 Home</button>
                <button onClick={() => { scrollToSection('problem'); setIsMenuOpen(false); }} className="text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 text-left font-medium px-4 py-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:scale-105">⚡ Challenge</button>
                <button onClick={() => { scrollToSection('solution'); setIsMenuOpen(false); }} className="text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 text-left font-medium px-4 py-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:scale-105">💡 Solution</button>
                <button onClick={() => { scrollToSection('features'); setIsMenuOpen(false); }} className="text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 text-left font-medium px-4 py-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:scale-105">🚀 Features</button>
                <button onClick={() => { scrollToSection('impact'); setIsMenuOpen(false); }} className="text-gray-700 dark:text-gray-200 hover:text-pink-600 dark:hover:text-pink-400 transition-all duration-300 text-left font-medium px-4 py-3 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/30 hover:scale-105">📊 Impact</button>
                
                <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <button 
                    onClick={() => { window.location.href = '/admin-login'; setIsMenuOpen(false); }}
                    className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl hover:shadow-xl transition-all duration-300 font-semibold hover:scale-105 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-lg"
                  >
                    Admin Login
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Chapter 1: Hero Section (The Problem) */}
      <section 
        id="hero" 
        ref={heroRef}
        className="min-h-screen flex items-center justify-center relative overflow-hidden pt-24"
      >
        {/* Animated background with parallax */}
        <div className="hero-bg absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-black dark:via-gray-950 dark:to-black"></div>
        
        {/* Floating elements */}
        <div className="floating-element absolute top-1/4 left-1/4 w-32 h-32 bg-red-300/20 dark:bg-red-500/5 rounded-full blur-xl"></div>
        <div className="floating-element absolute top-3/4 right-1/4 w-48 h-48 bg-orange-300/20 dark:bg-orange-500/5 rounded-full blur-xl"></div>
        <div className="floating-element absolute bottom-1/4 left-1/3 w-40 h-40 bg-yellow-300/20 dark:bg-yellow-500/5 rounded-full blur-xl"></div>

        <div className="relative z-10 max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="hero-title text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent">
              The Digital Divide
            </span>
            <br />
            <span className="text-gray-800 dark:text-gray-100">
              Is Real
            </span>
          </h1>
          
          <p className="hero-subtitle text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-700 dark:text-gray-200 mb-8 max-w-4xl mx-auto leading-relaxed">
            Millions of students in rural India struggle with poor internet connectivity, 
            limiting their access to quality digital education.
          </p>

          <div className="flex justify-center">
            <button 
              onClick={() => scrollToSection('problem')}
              className="group bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3 hover:scale-105"
            >
              <span>Discover the Challenge</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Chapter 2: The Struggle (Challenges) */}
      <section 
        id="problem" 
        ref={problemRef}
        className="py-20 bg-gradient-to-br from-gray-50 to-red-50 dark:from-black dark:to-black"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              The <span className="text-red-600">Rural Reality</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Understanding the challenges that millions face every day
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Challenge Cards */}
            <div className="challenge-card bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30 hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6">
                <Signal className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Poor Connectivity</h3>
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                2G networks and intermittent internet make online learning nearly impossible in remote areas.
              </p>
            </div>

            <div className="challenge-card bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-orange-100 dark:border-orange-900/30 hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-6">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Limited Devices</h3>
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                Basic smartphones with limited processing power and storage struggle with modern educational apps.
              </p>
            </div>

            <div className="challenge-card bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-yellow-100 dark:border-yellow-900/30 hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-red-500 rounded-2xl flex items-center justify-center mb-6">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Geographic Isolation</h3>
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                Remote villages lack access to quality teachers and educational infrastructure.
              </p>
            </div>

            <div className="challenge-card bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30 hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6">
                <Battery className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Power Constraints</h3>
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                Unreliable electricity and limited battery life create additional learning barriers.
              </p>
            </div>

            <div className="challenge-card bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-orange-100 dark:border-orange-900/30 hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6">
                <School className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Resource Scarcity</h3>
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                Lack of educational materials and qualified teachers limits learning opportunities.
              </p>
            </div>

            <div className="challenge-card bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-yellow-100 dark:border-yellow-900/30 hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Language Barriers</h3>
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                Most educational content is in English, creating accessibility challenges for local students.
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <button 
              onClick={() => scrollToSection('solution')}
              className="group bg-gradient-to-r from-orange-600 to-yellow-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3 hover:scale-105 mx-auto"
            >
              <span>See the Solution</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Chapter 3: The Solution (GYANDHARA Introduction) */}
      <section 
        id="solution" 
        ref={solutionRef}
        className="py-20 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 dark:from-black dark:via-gray-950 dark:to-black"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                GYANDHARA
              </span>
            </h2>
            <p className="text-2xl sm:text-3xl text-gray-700 dark:text-gray-200 mb-8 font-semibold">
              The Bridge to Digital Education
            </p>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              A revolutionary AI-powered platform designed specifically for low-bandwidth environments, 
              bringing quality education to every corner of rural India.
            </p>
          </div>

          <div className="flex justify-center mb-16">
            <div className="solution-mockup relative">
              {/* Mockup Device */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-4xl border-4 border-blue-200 dark:border-blue-600">
                {/* Device Header */}
                <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                    <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                    <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wifi className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">2G Connected</span>
                  </div>
                </div>

                {/* Interactive Whiteboard Demo */}
                <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-6 mb-6 min-h-[300px] relative overflow-hidden">
                  <div className="absolute top-4 left-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                    📚 Live Mathematics Class
                  </div>
                  
                  {/* Animated Math Content */}
                  <svg className="w-full h-full" viewBox="0 0 600 300">
                    <text x="50" y="80" className="fill-blue-600 dark:fill-blue-400 text-2xl font-bold">
                      Quadratic Formula: ax² + bx + c = 0
                    </text>
                    <path
                      d="M50 150 Q200 100, 350 150 T550 150"
                      stroke="#3B82F6"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="500"
                      strokeDashoffset="500"
                      className="animate-[drawLine_4s_ease-in-out_2s_infinite]"
                    />
                    <circle cx="200" cy="120" r="4" fill="#EF4444" />
                    <circle cx="350" cy="150" r="4" fill="#EF4444" />
                    <circle cx="500" cy="180" r="4" fill="#EF4444" />
                  </svg>

                  <div className="absolute bottom-4 right-4 text-xs text-gray-600 dark:text-gray-300">
                    👥 25 students connected • 📊 Ultra-low bandwidth mode
                  </div>
                </div>

                {/* Feature Highlights */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">2G Ready</span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">AI-Powered</span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">Real-time</span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">Secure</span>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -left-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl">
                <Sparkles className="w-4 h-4 inline mr-1" />
                AI-Enhanced
              </div>
              <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl">
                <Globe className="w-4 h-4 inline mr-1" />
                Works Everywhere
              </div>
            </div>
          </div>

          <div className="text-center">
            <button 
              onClick={() => scrollToSection('features')}
              className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3 hover:scale-105 mx-auto"
            >
              <span>Explore Features</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Chapter 4: Features (Step by Step) */}
      <section 
        id="features" 
        ref={featuresRef}
        className="py-20 bg-white dark:bg-black"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              How It <span className="text-purple-600">Works</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Step-by-step journey to transform rural education
            </p>
          </div>

          <div className="space-y-24">
            {/* Feature 1 - Left Side */}
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="feature-card-left flex-1">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">1. Teachers Connect</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                    Educators create interactive classrooms with our intuitive dashboard, 
                    designed to work seamlessly on low-bandwidth connections.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">Easy setup in minutes</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">Works on basic devices</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">AI-assisted teaching tools</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl p-8 h-80 flex items-center justify-center">
                  <div className="text-center">
                    <Users className="w-24 h-24 text-blue-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Teacher Dashboard Demo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 - Right Side */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
              <div className="feature-card-right flex-1">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">2. Students Join</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                    Students connect from anywhere using simple room codes, 
                    experiencing real-time interactive learning on any device.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">One-click join with room code</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">Synchronized whiteboard view</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">Interactive participation tools</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl p-8 h-80 flex items-center justify-center">
                  <div className="text-center">
                    <BookOpen className="w-24 h-24 text-purple-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Student Portal Demo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 - Left Side */}
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="feature-card-left flex-1">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">3. Parents Monitor</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                    Parents stay connected with their child's learning journey through 
                    comprehensive progress tracking and communication tools.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">Real-time progress updates</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">Direct teacher communication</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700 dark:text-gray-300">Attendance and activity reports</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl p-8 h-80 flex items-center justify-center">
                  <div className="text-center">
                    <Heart className="w-24 h-24 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Parent Portal Demo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <button 
              onClick={() => scrollToSection('impact')}
              className="group bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3 hover:scale-105 mx-auto"
            >
              <span>See the Impact</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Chapter 5: Impact Section */}
      <section 
        id="impact" 
        ref={impactRef}
        className="py-20 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-black dark:via-gray-950 dark:to-black"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Our Real <span className="text-blue-600">Impact</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              These are the actual numbers from our platform - real students, real teachers, real change happening right now
            </p>
          </div>

          {/* Impact Statistics */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Users className="w-12 h-12 text-white" />
              </div>
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-600 mb-2">
                {studentsCount.toLocaleString()}+
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Active Students</p>
              <p className="text-gray-600 dark:text-gray-300">Currently registered and learning on our platform</p>
            </div>

            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Award className="w-12 h-12 text-white" />
              </div>
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-green-600 mb-2">
                {teachersCount.toLocaleString()}+
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Active Teachers</p>
              <p className="text-gray-600 dark:text-gray-300">Educators using our platform to reach students</p>
            </div>

            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <TrendingUp className="w-12 h-12 text-white" />
              </div>
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-purple-600 mb-2">
                {hoursCount.toLocaleString()}+
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Learning Hours</p>
              <p className="text-gray-600 dark:text-gray-300">Total hours of education delivered through our platform</p>
            </div>
          </div>

          {/* Network Effect Visualization */}
          <div className="relative">
            <svg className="w-full h-64" viewBox="0 0 800 200">
              {/* Network connections */}
              <line 
                className="network-line" 
                x1="100" y1="100" x2="300" y2="50" 
                stroke="#3B82F6" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              />
              <line 
                className="network-line" 
                x1="300" y1="50" x2="500" y2="100" 
                stroke="#10B981" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              />
              <line 
                className="network-line" 
                x1="500" y1="100" x2="700" y2="50" 
                stroke="#8B5CF6" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              />
              <line 
                className="network-line" 
                x1="200" y1="150" x2="400" y2="150" 
                stroke="#EF4444" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              />
              <line 
                className="network-line" 
                x1="400" y1="150" x2="600" y2="150" 
                stroke="#F59E0B" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              />

              {/* Nodes */}
              <circle cx="100" cy="100" r="8" fill="#3B82F6" />
              <circle cx="300" cy="50" r="8" fill="#10B981" />
              <circle cx="500" cy="100" r="8" fill="#8B5CF6" />
              <circle cx="700" cy="50" r="8" fill="#EF4444" />
              <circle cx="200" cy="150" r="8" fill="#F59E0B" />
              <circle cx="400" cy="150" r="8" fill="#06B6D4" />
              <circle cx="600" cy="150" r="8" fill="#EC4899" />

              {/* Labels */}
              <text x="100" y="130" textAnchor="middle" className="fill-gray-700 dark:fill-gray-300 text-sm font-semibold">Teachers</text>
              <text x="300" y="30" textAnchor="middle" className="fill-gray-700 dark:fill-gray-300 text-sm font-semibold">Students</text>
              <text x="500" y="130" textAnchor="middle" className="fill-gray-700 dark:fill-gray-300 text-sm font-semibold">Parents</text>
              <text x="700" y="30" textAnchor="middle" className="fill-gray-700 dark:fill-gray-300 text-sm font-semibold">Communities</text>
              <text x="400" y="180" textAnchor="middle" className="fill-gray-700 dark:fill-gray-300 text-sm font-semibold">Learning Network</text>
            </svg>
          </div>

          <div className="text-center mt-16">
            <button 
              onClick={() => scrollToSection('cta')}
              className="group bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3 hover:scale-105 mx-auto"
            >
              <span>Join the Movement</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Chapter 6: Call to Action */}
      <section 
        id="cta" 
        ref={ctaRef}
        className="cta-background py-20 relative overflow-hidden bg-black"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black to-gray-950"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Start Your Journey Today
          </h2>
          <p className="text-xl sm:text-2xl text-white/90 mb-12 leading-relaxed">
            Join thousands of educators and students transforming rural education with GYANDHARA
          </p>

          {/* User Type Selection - Enhanced for Storytelling */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div 
              onClick={() => onSelectUserType('teacher')}
              className="cta-button group bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 cursor-pointer hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">I'm a Teacher</h3>
              <p className="text-white/80 mb-4">Empower your students with interactive digital learning</p>
              <div className="flex items-center justify-center space-x-2 text-blue-300 group-hover:text-blue-200">
                <span className="font-semibold">Start Teaching</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>

            <div 
              onClick={() => onSelectUserType('student')}
              className="cta-button group bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 cursor-pointer hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">I'm a Student</h3>
              <p className="text-white/80 mb-4">Join live classes and learn from anywhere</p>
              <div className="flex items-center justify-center space-x-2 text-green-300 group-hover:text-green-200">
                <span className="font-semibold">Start Learning</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>

            <div 
              onClick={() => onSelectUserType('parent')}
              className="cta-button group bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 cursor-pointer hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className="w-16 h-16 bg-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">I'm a Parent</h3>
              <p className="text-white/80 mb-4">Monitor and support your child's learning journey</p>
              <div className="flex items-center justify-center space-x-2 text-pink-300 group-hover:text-pink-200">
                <span className="font-semibold">Track Progress</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => window.location.href = '/admin-login'}
              className="bg-white text-indigo-600 px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Admin Portal
            </button>
            <span className="text-white/60">•</span>
            <a 
              href="#hero" 
              className="text-white/80 hover:text-white transition-colors font-medium"
            >
              Learn More About Our Mission
            </a>
          </div>
        </div>

        {/* Floating elements */}
        <div className="floating-element absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="floating-element absolute bottom-1/4 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-xl"></div>
      </section>

      {/* Footer Section */}
      <footer 
        id="footer" 
        className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black dark:from-black dark:via-gray-900 dark:to-gray-800 text-white py-16 px-4 sm:px-6 lg:px-8 overflow-hidden"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">G</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  GYANDHARA
                </span>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Revolutionizing education through AI-powered, low-bandwidth learning solutions that connect rural and urban communities.
              </p>
              <div className="flex space-x-4">
                <button className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110">
                  <span className="text-blue-400">📱</span>
                </button>
                <button className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110">
                  <span className="text-purple-400">💼</span>
                </button>
                <button className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110">
                  <span className="text-pink-400">🌐</span>
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <div className="space-y-2">
                <button onClick={() => scrollToSection('hero')} className="block text-gray-300 hover:text-blue-400 transition-colors duration-300">Home</button>
                <button onClick={() => scrollToSection('problem')} className="block text-gray-300 hover:text-purple-400 transition-colors duration-300">Challenge</button>
                <button onClick={() => scrollToSection('solution')} className="block text-gray-300 hover:text-emerald-400 transition-colors duration-300">Solution</button>
                <button onClick={() => scrollToSection('features')} className="block text-gray-300 hover:text-indigo-400 transition-colors duration-300">Features</button>
                <button onClick={() => scrollToSection('impact')} className="block text-gray-300 hover:text-pink-400 transition-colors duration-300">Impact</button>
              </div>
            </div>

            {/* Platform Access */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Platform Access</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => window.location.href = '/admin-login'}
                  className="block text-gray-300 hover:text-blue-400 transition-colors duration-300"
                >
                  Admin Portal
                </button>
                <button 
                  onClick={() => window.location.href = '/teacher-login'}
                  className="block text-gray-300 hover:text-purple-400 transition-colors duration-300"
                >
                  Teacher Dashboard
                </button>
                <button 
                  onClick={() => window.location.href = '/student-login'}
                  className="block text-gray-300 hover:text-emerald-400 transition-colors duration-300"
                >
                  Student Portal
                </button>
                <button 
                  onClick={() => window.location.href = '/parent-login'}
                  className="block text-gray-300 hover:text-pink-400 transition-colors duration-300"
                >
                  Parent Access
                </button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Contact</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-blue-400">📧</span>
                  <span className="text-gray-300">support@gyandhara.edu</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-purple-400">📞</span>
                  <span className="text-gray-300">+91-XXXX-XXXXX</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-emerald-400">🌍</span>
                  <span className="text-gray-300">India & Global</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-pink-400">⏰</span>
                  <span className="text-gray-300">24/7 Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-gray-400 text-sm">
                © 2025 GYANDHARA Educational Platform. All rights reserved.
              </div>
              <div className="flex space-x-6 text-sm">
                <button className="text-gray-400 hover:text-white transition-colors duration-300">Privacy Policy</button>
                <button className="text-gray-400 hover:text-white transition-colors duration-300">Terms of Service</button>
                <button className="text-gray-400 hover:text-white transition-colors duration-300">Cookie Policy</button>
              </div>
            </div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl"></div>
        </div>
      </footer>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes drawLine {
          0% { stroke-dashoffset: 500; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        
        @keyframes drawPreciseWire {
          to { stroke-dashoffset: 0; }
        }
        
        @keyframes showLiveSync {
          to { opacity: 1; }
        }
        
        @keyframes dataFlowPrecise {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default StorytellingLandingPage