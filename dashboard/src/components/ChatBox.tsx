import React, { useState, useEffect, useRef } from "react";
import ChatMessage from "@/components/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useChatMessages } from "@/hooks";

const ChatBox = () => {
  const { 
    messages, 
    loading, 
    error, 
    sendMessage, 
    clearMessages
  } = useChatMessages();
  
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || loading) return;
    
    try {
      await sendMessage(newMessage);
      setNewMessage("");
    } catch (error) {
      // Error handling is already done in the hook
      console.error('Failed to send message:', error);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Safe array to handle undefined messages
  const safeMessages = Array.isArray(messages) ? messages : [];

  return (
    <div className="flex flex-col bg-background border rounded-lg shadow-sm h-[420px]">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-medium">Health Assistant</h2>
        <div className="flex items-center gap-2">
          {/* Clear messages button */}
          {safeMessages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="h-6 px-2 text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          {safeMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-2">👋 Hi! I&apos;m your health assistant.</p>
              <p className="text-sm">Ask me about your health data, trends, or upload documents for analysis.</p>
            </div>
          ) : (
            safeMessages.map((msg) => (
              <ChatMessage
                key={msg.id || Math.random().toString(36)}
                message={msg.message || ''}
                timestamp={msg.timestamp || new Date().toISOString()}
                isUser={msg.isUser || false}
                senderName={msg.senderName || (msg.isUser ? 'You' : 'Assistant')}
              />
            ))
          )}
          
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              <span className="text-sm">Assistant is thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t mt-auto">
        <form 
          className="flex gap-2" 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <Input 
            placeholder="Ask about your health data, trends, or upload documents..." 
            className="flex-1 text-foreground" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            maxLength={1000}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={loading || !newMessage.trim()}
            className="shrink-0"
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        {newMessage.length > 900 && (
          <p className="text-xs text-muted-foreground mt-1">
            {1000 - newMessage.length} characters remaining
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatBox; 