import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { ChatRequest, ChatResponse } from './types';

interface ChatState {
  messages: Array<{
    id: string;
    message: string;
    timestamp: string;
    isUser: boolean;
    senderName?: string;
    sources?: string[];
    tokensUsed?: number;
  }>;
  loading: boolean;
  error: string | null;
  sessionId?: string;
}

export function useChatMessages() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    loading: false,
    error: null
  });

  // Load messages from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chatMessages');
      if (stored) {
        try {
          setChatState(prev => ({ ...prev, messages: JSON.parse(stored) }));
        } catch {
          console.warn('Failed to parse stored chat messages');
        }
      }
    }
  }, []);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && chatState.messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(chatState.messages));
    }
  }, [chatState.messages]);

  const addMessage = useCallback((message: ChatState['messages'][0]) => {
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }));
  }, []);

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        console.log('🔄 useChatMessages: Loading chat history...');
        const history = await api.chat.getChatHistory();
        console.log('✅ useChatMessages: Chat history loaded successfully');
        
        // Transform chat history to message format
        if (history.sessions && history.sessions.length > 0) {
          // For now, just show we could load history
          // In a full implementation, you'd transform the history data
          console.log('Chat history loaded:', history);
        }
      } catch (error) {
        console.error('❌ useChatMessages: Failed to load chat history:', error);
      }
    };

    loadChatHistory();
  }, []);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Add user message immediately
    const userMessage = {
      id: Math.random().toString(36).substr(2, 9),
      message: messageText,
      timestamp: new Date().toISOString(),
      isUser: true,
      senderName: 'You'
    };

    addMessage(userMessage);
    setChatState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Send via REST API
      const request: ChatRequest = {
        message: messageText,
        session_id: chatState.sessionId
      };

      const response = await api.chat.sendMessage(request);

      // Update session ID if received
      if (response.session_id) {
        setChatState(prev => ({ ...prev, sessionId: response.session_id }));
      }

      // Add AI response
      const aiMessage = {
        id: response.id,
        message: response.message,
        timestamp: response.timestamp,
        isUser: false,
        senderName: 'Health Assistant',
        tokensUsed: response.tokens_used
      };

      addMessage(aiMessage);

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message
      const errorMessage = {
        id: Math.random().toString(36).substr(2, 9),
        message: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
        isUser: false,
        senderName: 'Health Assistant'
      };

      addMessage(errorMessage);
      
      setChatState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to send message'
      }));
    } finally {
      setChatState(prev => ({ ...prev, loading: false }));
    }
  };

  const clearMessages = () => {
    setChatState(prev => ({
      ...prev,
      messages: [],
      error: null
    }));
    // Remove persisted messages
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chatMessages');
    }
  };

  return {
    messages: chatState.messages,
    loading: chatState.loading,
    error: chatState.error,
    sessionId: chatState.sessionId,
    sendMessage,
    clearMessages
  };
} 