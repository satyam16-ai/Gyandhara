'use client'

import React, { useState, useRef } from 'react'
import { 
  Bot, 
  Send, 
  Image as ImageIcon, 
  X, 
  Languages,
  Loader2,
  MessageCircle,
  Camera,
  Download
} from 'lucide-react'

interface AIDoubtSolverProps {
  isVisible: boolean
  onToggleVisibility: () => void
  canvasRef: React.RefObject<HTMLCanvasElement>
  isStudent: boolean
}

interface DoubtMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: number
  language: string
  hasImage?: boolean
  imageData?: string
}

// Indian language options
const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृत' }
]

export default function AIDoubtSolver({ 
  isVisible, 
  onToggleVisibility, 
  canvasRef, 
  isStudent 
}: AIDoubtSolverProps) {
  const [messages, setMessages] = useState<DoubtMessage[]>([])
  const [newQuestion, setNewQuestion] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [isLoading, setIsLoading] = useState(false)
  const [includeWhiteboard, setIncludeWhiteboard] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const captureWhiteboard = (): string | null => {
    if (!canvasRef.current) return null
    
    try {
      // Create a new canvas with white background
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      canvas.width = canvasRef.current.width
      canvas.height = canvasRef.current.height

      // Fill with white background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw the whiteboard content
      ctx.drawImage(canvasRef.current, 0, 0)

      return canvas.toDataURL('image/jpeg', 0.8)
    } catch (error) {
      console.error('Error capturing whiteboard:', error)
      return null
    }
  }

  const askGeminiAI = async (question: string, imageData?: string) => {
    try {
      setIsLoading(true)

      const payload = {
        question,
        language: selectedLanguage,
        languageName: INDIAN_LANGUAGES.find(lang => lang.code === selectedLanguage)?.nativeName || 'English',
        includeImage: !!imageData,
        imageData: imageData || null,
        context: 'educational_whiteboard_doubt'
      }

      // Call the local Next.js API route instead of backend
      const response = await fetch('/api/ai/doubt-solver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      return data.answer || 'Sorry, I could not generate a response. Please try again.'
    } catch (error) {
      console.error('Error asking AI:', error)
      return 'Sorry, there was an error processing your question. Please check your connection and try again.'
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendQuestion = async () => {
    if (!newQuestion.trim()) return

    let whiteboardImage: string | null = null
    if (includeWhiteboard) {
      whiteboardImage = captureWhiteboard()
    }

    // Add user message
    const userMessage: DoubtMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: newQuestion.trim(),
      timestamp: Date.now(),
      language: selectedLanguage,
      hasImage: !!whiteboardImage,
      imageData: whiteboardImage || undefined
    }

    setMessages(prev => [...prev, userMessage])
    setNewQuestion('')

    // Get AI response
    const aiResponse = await askGeminiAI(newQuestion.trim(), whiteboardImage || undefined)

    // Add AI message
    const aiMessage: DoubtMessage = {
      id: `ai-${Date.now()}`,
      type: 'ai',
      content: aiResponse,
      timestamp: Date.now(),
      language: selectedLanguage
    }

    setMessages(prev => [...prev, aiMessage])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendQuestion()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const downloadChatHistory = () => {
    const chatContent = messages.map(msg => 
      `[${new Date(msg.timestamp).toLocaleString()}] ${msg.type === 'user' ? 'You' : 'AI'}: ${msg.content}`
    ).join('\n\n')

    const blob = new Blob([chatContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `doubt-solver-chat-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Don't render the floating button anymore since it's now in the top bar
  if (!isVisible) {
    return null
  }

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Language Selector */}
      <div className="p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Languages className="w-4 h-4 text-gray-600" />
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {INDIAN_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h4 className="font-semibold mb-2">Welcome to AI Doubt Solver!</h4>
            <p className="text-sm">
              Ask me any questions about the lesson. You can also include the current whiteboard in your question.
            </p>
            <div className="mt-4 p-3 bg-purple-50 rounded-lg text-left">
              <p className="text-sm font-medium text-purple-800 mb-1">Example questions:</p>
              <ul className="text-xs text-purple-700 space-y-1">
                <li>• "Can you explain this diagram?"</li>
                <li>• "What is the formula for this?"</li>
                <li>• "How do I solve this problem?"</li>
                <li>• "Can you give me more examples?"</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {message.hasImage && (
                  <div className="mb-2 p-2 bg-white/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm">
                      <Camera className="w-4 h-4" />
                      <span>Whiteboard included</span>
                    </div>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-purple-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-800 p-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        {/* Whiteboard Option */}
        <div className="mb-3 flex items-center space-x-2">
          <input
            type="checkbox"
            id="includeWhiteboard"
            checked={includeWhiteboard}
            onChange={(e) => setIncludeWhiteboard(e.target.checked)}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <label htmlFor="includeWhiteboard" className="text-sm text-gray-600 flex items-center space-x-1">
            <ImageIcon className="w-4 h-4" />
            <span>Include current whiteboard</span>
          </label>
        </div>

        {/* Input */}
        <div className="flex space-x-2">
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask your doubt in ${INDIAN_LANGUAGES.find(lang => lang.code === selectedLanguage)?.nativeName}...`}
            rows={2}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSendQuestion}
            disabled={!newQuestion.trim() || isLoading}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-2 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        {messages.length > 0 && (
          <div className="mt-3 flex justify-between">
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear chat
            </button>
            <button
              onClick={downloadChatHistory}
              className="text-xs text-purple-600 hover:text-purple-700 transition-colors flex items-center space-x-1"
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}