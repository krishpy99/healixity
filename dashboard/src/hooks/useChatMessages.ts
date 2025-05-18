import { useState, useEffect, useCallback } from 'react';
import { get, post } from './api';
import { ChatMessage, SendMessagePayload } from './types';

/**
 * Custom hook for managing chat messages (list and send)
 */
export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch chat messages
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await get<ChatMessage[]>('/api/chat-messages');
      setMessages(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Send a new message
  const sendMessage = useCallback(async (messageText: string, isUser: boolean = true, senderName?: string) => {
    if (!messageText.trim()) return null;
    
    setSending(true);
    
    // Create message object
    const messagePayload: SendMessagePayload = {
      message: messageText,
      isUser,
      senderName
    };
    
    // Optimistically add message to UI
    const optimisticMessage: ChatMessage = {
      id: Date.now().toString(),
      message: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser,
      senderName
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      // Send to API
      const newMessage = await post<ChatMessage, SendMessagePayload>(
        '/api/chat-messages', 
        messagePayload
      );
      
      // Replace optimistic message with actual server response if needed
      // (In this case we might not need to, as our optimistic update is sufficient)
      
      setError(null);
      return newMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      
      // You could remove the optimistic message here if desired
      return null;
    } finally {
      setSending(false);
    }
  }, []);

  return { 
    messages, 
    loading, 
    sending, 
    error,
    sendMessage,
    refreshMessages: fetchMessages
  };
} 