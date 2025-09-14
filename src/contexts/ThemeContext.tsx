'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextType {
  isDarkMode: boolean
  toggleDarkMode: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if dark mode preference is saved in localStorage
    const savedTheme = localStorage.getItem('darkMode')
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'true')
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      // Save theme preference to localStorage
      localStorage.setItem('darkMode', isDarkMode.toString())
      
      // Apply theme to document
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
        // Add custom CSS variables for enhanced dark mode
        document.documentElement.style.setProperty('--dark-bg-primary', '#0a0a0a')
        document.documentElement.style.setProperty('--dark-bg-secondary', '#111111')
        document.documentElement.style.setProperty('--dark-bg-tertiary', '#1a1a1a')
        document.documentElement.style.setProperty('--dark-text-primary', '#ffffff')
        document.documentElement.style.setProperty('--dark-text-secondary', '#e5e5e5')
      } else {
        document.documentElement.classList.remove('dark')
        // Remove custom dark mode variables
        document.documentElement.style.removeProperty('--dark-bg-primary')
        document.documentElement.style.removeProperty('--dark-bg-secondary')
        document.documentElement.style.removeProperty('--dark-bg-tertiary')
        document.documentElement.style.removeProperty('--dark-text-primary')
        document.documentElement.style.removeProperty('--dark-text-secondary')
      }
    }
  }, [isDarkMode, mounted])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    // Instead of throwing an error, return default values
    console.warn('useTheme must be used within a ThemeProvider. Using default values.')
    return {
      isDarkMode: false,
      toggleDarkMode: () => console.warn('ThemeProvider not available')
    }
  }
  return context
}