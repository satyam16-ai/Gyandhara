'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, MessageCircle, X, Users, Smile, Paperclip, MoreVertical } from 'lucide-react'

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
  type: 'text' | 'system' | 'notification'
  isTeacher: boolean
  replyTo?: string
}

interface RealtimeChatProps {
  socket: any
  currentUserId: string
  currentUserName: string
  isTeacher: boolean
  connectedUsers: Array<{
    id: string
    name: string
    role: string
    isTeacher: boolean
    joinedAt: Date
  }>
  isVisible: boolean
  onToggleVisibility: () => void
  messages?: ChatMessage[]
  setMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}

const RealtimeChat: React.FC<RealtimeChatProps> = ({
  socket,
  currentUserId,
  currentUserName,
  isTeacher,
  connectedUsers,
  isVisible,
  onToggleVisibility,
  messages: externalMessages,
  setMessages: externalSetMessages
}) => {
  // Chat state - use external state if provided, otherwise use internal state
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([])
  const messages = externalMessages || internalMessages
  const setMessages = externalSetMessages || setInternalMessages
  
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Emoji list for quick reactions
  const quickEmojis = ['👍', '❤️', '😊', '🎉', '👏', '🤔', '😂', '🔥']

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Handle incoming messages
  useEffect(() => {
    if (!socket) return

    const handleChatMessage = (messageData: any) => {
      console.log('💬 Received chat message:', messageData)
      
      // Map server response format to frontend ChatMessage format
      const formattedMessage: ChatMessage = {
        id: messageData._id || messageData.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: messageData.userId,
        userName: messageData.userName,
        message: messageData.message,
        timestamp: messageData.timestamp || Date.now(),
        type: messageData.messageType || messageData.type || 'text',
        isTeacher: messageData.isTeacher || false,
        replyTo: messageData.replyTo
      }
      
      setMessages(prev => {
        // More robust duplicate checking - check by ID, timestamp, and content
        const isDuplicate = prev.some(msg => 
          (msg.id === formattedMessage.id) || 
          (msg.timestamp === formattedMessage.timestamp && msg.message === formattedMessage.message && msg.userId === formattedMessage.userId)
        )
        
        if (isDuplicate) {
          console.log('🚫 Duplicate message detected, skipping')
          return prev
        }
        
        console.log('✅ Adding new chat message:', formattedMessage)
        return [...prev, formattedMessage]
      })

      // Increment unread count if chat is not visible and not from current user
      if (!isVisible && formattedMessage.userId !== currentUserId) {
        setUnreadCount(prev => prev + 1)
      }

      // Auto-scroll to bottom
      setTimeout(scrollToBottom, 100)
    }

    const handleTypingStatus = (data: { userId: string, userName: string, isTyping: boolean }) => {
      if (data.userId === currentUserId) return

      setTypingUsers(prev => {
        if (data.isTyping) {
          return prev.includes(data.userName) ? prev : [...prev, data.userName]
        } else {
          return prev.filter(user => user !== data.userName)
        }
      })
    }

    const handleUserJoined = (userData: { userId: string, userName: string, isTeacher: boolean }) => {
      const systemMessage: ChatMessage = {
        id: `system_${Date.now()}_${Math.random()}`,
        userId: 'system',
        userName: 'System',
        message: `${userData.userName} joined the class ${userData.isTeacher ? '(Teacher)' : '(Student)'}`,
        timestamp: Date.now(),
        type: 'system',
        isTeacher: false
      }
      
      setMessages(prev => [...prev, systemMessage])
      setTimeout(scrollToBottom, 100)
    }

    const handleUserLeft = (userData: { userId: string, userName: string }) => {
      const systemMessage: ChatMessage = {
        id: `system_${Date.now()}_${Math.random()}`,
        userId: 'system',
        userName: 'System',
        message: `${userData.userName} left the class`,
        timestamp: Date.now(),
        type: 'system',
        isTeacher: false
      }
      
      setMessages(prev => [...prev, systemMessage])
      setTimeout(scrollToBottom, 100)
    }

    socket.on('message-received', handleChatMessage)
    socket.on('typing-status', handleTypingStatus)
    socket.on('user-joined-chat', handleUserJoined)
    socket.on('user-left-chat', handleUserLeft)

    return () => {
      socket.off('message-received', handleChatMessage)
      socket.off('typing-status', handleTypingStatus)
      socket.off('user-joined-chat', handleUserJoined)
      socket.off('user-left-chat', handleUserLeft)
    }
  }, [socket, currentUserId, isVisible, scrollToBottom])

  // Send message
  const sendMessage = useCallback(() => {
    if (!socket || !newMessage.trim()) return

    const messageData: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUserId,
      userName: currentUserName,
      message: newMessage.trim(),
      timestamp: Date.now(),
      type: 'text',
      isTeacher,
      replyTo: replyTo?.id
    }

    // Don't add to local messages immediately - let the server broadcast back
    // This prevents duplication issues
    
    // Send to server
    socket.emit('chat-message', messageData)

    // Clear input and reply
    setNewMessage('')
    setReplyTo(null)
    
    // Stop typing indicator
    handleStopTyping()

    // Auto-scroll
    setTimeout(scrollToBottom, 100)
  }, [socket, newMessage, currentUserId, currentUserName, isTeacher, replyTo, scrollToBottom])

  // Handle typing indicators
  const handleStartTyping = useCallback(() => {
    if (!socket || isTyping) return

    setIsTyping(true)
    socket.emit('typing-status', { 
      userId: currentUserId, 
      userName: currentUserName, 
      isTyping: true 
    })

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping()
    }, 2000)
  }, [socket, isTyping, currentUserId, currentUserName])

  const handleStopTyping = useCallback(() => {
    if (!socket || !isTyping) return

    setIsTyping(false)
    socket.emit('typing-status', { 
      userId: currentUserId, 
      userName: currentUserName, 
      isTyping: false 
    })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [socket, isTyping, currentUserId, currentUserName])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    handleStartTyping()
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Get message style based on type
  const getMessageStyle = (message: ChatMessage) => {
    if (message.type === 'system') {
      return 'bg-gray-100 text-gray-600 text-center py-2 px-4 rounded-full text-sm'
    }

    const isOwn = message.userId === currentUserId
    const baseStyle = 'max-w-xs lg:max-w-md px-4 py-2 rounded-2xl break-words'
    
    if (isOwn) {
      return `${baseStyle} bg-blue-500 text-white ml-auto`
    } else {
      return `${baseStyle} bg-gray-200 text-gray-800`
    }
  }

  // Reply to message
  const handleReply = (message: ChatMessage) => {
    if (message.type === 'system') return
    setReplyTo(message)
    messageInputRef.current?.focus()
  }

  // Add emoji to message
  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
    messageInputRef.current?.focus()
  }

  // Clear unread count when chat becomes visible
  useEffect(() => {
    if (isVisible) {
      setUnreadCount(0)
    }
  }, [isVisible])

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-50"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Container */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-80">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-1">
              {/* Reply Context */}
              {message.replyTo && (
                <div className="text-xs text-gray-500 pl-4 border-l-2 border-gray-300">
                  Replying to: {messages.find(m => m.id === message.replyTo)?.message?.slice(0, 30)}...
                </div>
              )}
              
              {/* Message */}
              <div 
                className={`flex ${message.userId === currentUserId ? 'justify-end' : 'justify-start'}`}
                onDoubleClick={() => handleReply(message)}
              >
                <div className={getMessageStyle(message)}>
                  {message.type !== 'system' && message.userId !== currentUserId && (
                    <div className="text-xs font-semibold mb-1">
                      {message.userName}{message.isTeacher && ' 👨‍🏫'}
                    </div>
                  )}
                  <div className="break-words">{message.message}</div>
                  {message.type !== 'system' && (
                    <div className={`text-xs mt-1 opacity-70 ${
                      message.userId === currentUserId ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-gray-500 text-sm">
            <div className="flex space-x-1">
              <div key="dot1" className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div key="dot2" className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div key="dot3" className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="bg-gray-100 border-t border-gray-200 p-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Replying to {replyTo.userName}:</span>
            <div className="truncate">{replyTo.message}</div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Chat Input */}
      <div className="border-t border-gray-200 p-3 space-y-2">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="flex space-x-1 pb-2">
            {quickEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => addEmoji(emoji)}
                className="text-lg hover:bg-gray-100 p-1 rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-gray-500 hover:text-blue-500 transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 text-sm"
            maxLength={500}
          />
          
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className={`p-2 rounded-full transition-all duration-200 ${
              newMessage.trim()
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Character Count */}
        <div className="text-xs text-gray-500 text-right">
          {newMessage.length}/500
        </div>
      </div>
    </div>
  )
}

export default RealtimeChat
