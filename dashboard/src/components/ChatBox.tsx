import React, { useState } from "react";
import ChatMessage from "@/components/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useChatMessages } from "@/hooks";

const ChatBox = () => {
  const { messages, loading, sending, error, sendMessage } = useChatMessages();
  const [newMessage, setNewMessage] = useState("");

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    await sendMessage(newMessage);
    setNewMessage("");
  };

  return (
    <div className="flex flex-col bg-background border rounded-lg shadow-sm h-[420px]">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium">Ask AI</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <p className="text-red-500 text-center">{error}</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground">No messages yet. Start a conversation!</p>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg.message}
                timestamp={msg.timestamp}
                isUser={msg.isUser}
                senderName={msg.senderName}
              />
            ))
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
            placeholder="Type your message..." 
            className="flex-1 text-foreground" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={loading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={loading || !newMessage.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatBox; 