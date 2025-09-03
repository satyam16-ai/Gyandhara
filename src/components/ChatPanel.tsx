'use client'

import { useState } from 'react'
import { ChatMessage } from '@/types'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('')
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)

  const handleSendText = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim())
      setNewMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  const handleVoiceRecord = () => {
    setIsRecordingVoice(!isRecordingVoice)
    // In real implementation, start/stop voice recording
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-96">
      <h3 className="font-semibold text-gray-800 mb-3">Q&A Chat</h3>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-2xl mb-2">💬</div>
            <p>No messages yet</p>
            <p className="text-xs mt-1">Ask questions or join the discussion</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-2 rounded-lg ${
                message.type === 'question' 
                  ? 'bg-blue-50 border-l-4 border-blue-500' 
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-gray-800">
                  {message.userName}
                </span>
                <div className="flex items-center space-x-1">
                  {message.type === 'voice' && (
                    <span className="text-xs text-blue-600">🎤</span>
                  )}
                  {message.type === 'question' && (
                    <span className="text-xs text-blue-600">❓</span>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-700">{message.message}</p>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="space-y-2">
        <div className="flex space-x-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question or share your thoughts..."
            className="flex-1 p-2 border border-gray-300 rounded-lg resize-none"
            rows={2}
          />
          <div className="flex flex-col space-y-1">
            <button
              onClick={handleSendText}
              disabled={!newMessage.trim()}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="Send message"
            >
              📤
            </button>
            <button
              onClick={handleVoiceRecord}
              className={`p-2 rounded-lg transition-colors ${
                isRecordingVoice 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={isRecordingVoice ? 'Stop recording' : 'Record voice message'}
            >
              {isRecordingVoice ? '⏹️' : '🎤'}
            </button>
          </div>
        </div>

        {/* Message Type Selector */}
        <div className="flex space-x-2 text-xs">
          <button className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
            💬 Chat
          </button>
          <button className="px-2 py-1 bg-blue-100 text-blue-600 rounded">
            ❓ Question
          </button>
          <button className="px-2 py-1 bg-green-100 text-green-600 rounded">
            💡 Suggestion
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatPanel
