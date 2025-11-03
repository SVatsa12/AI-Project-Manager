import React, { createContext, useContext, useState, useEffect } from 'react'

const ChatContext = createContext()

const CHAT_STORAGE_KEY = "group_chat_v1"

function readChatState() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return { messages: {}, activeProject: null }
    return JSON.parse(raw)
  } catch (e) {
    console.error("Error reading chat state", e)
    return { messages: {}, activeProject: null }
  }
}

function writeChatState(state) {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state))
}

export function ChatProvider({ children }) {
  const [chatState, setChatState] = useState(() => readChatState())

  // Save to localStorage whenever state changes
  useEffect(() => {
    writeChatState(chatState)
  }, [chatState])

  // Listen for storage changes from other tabs
  useEffect(() => {
    function handleStorage(e) {
      if (e.key !== CHAT_STORAGE_KEY) return
      try {
        const parsed = JSON.parse(e.newValue || '{"messages":{},"activeProject":null}')
        setChatState(parsed)
      } catch (err) {
        console.error("Error parsing chat state from storage", err)
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const setActiveProject = (projectId) => {
    setChatState(prev => ({
      ...prev,
      activeProject: projectId
    }))
  }

  const sendMessage = (projectId, message, sender) => {
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: message,
      sender: sender,
      timestamp: new Date().toISOString(),
      projectId: projectId
    }

    setChatState(prev => ({
      ...prev,
      messages: {
        ...prev.messages,
        [projectId]: [
          ...(prev.messages[projectId] || []),
          newMessage
        ]
      }
    }))
  }

  const getMessages = (projectId) => {
    return chatState.messages[projectId] || []
  }

  const clearChat = (projectId) => {
    setChatState(prev => ({
      ...prev,
      messages: {
        ...prev.messages,
        [projectId]: []
      }
    }))
  }

  const value = {
    activeProject: chatState.activeProject,
    setActiveProject,
    sendMessage,
    getMessages,
    clearChat
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
