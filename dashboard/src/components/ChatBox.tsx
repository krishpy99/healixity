import React from "react";
import ChatMessage from "@/components/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatMessage {
  message: string;
  timestamp: string;
  isUser: boolean;
  senderName?: string;
}

const ChatBox = () => {
  // Chat messages
  const chatMessages = [
    {
      message: "Hi, Doctor. I've been having frequent headaches, mostly in the morning.",
      timestamp: "12:00 PM",
      isUser: true,
    },
    {
      message: "I see. On a scale of 1 to 10, how severe are the headaches?",
      timestamp: "12:10 PM",
      isUser: false,
      senderName: "Dr. Darrell Steward",
    },
    {
      message: "About a 7 or 8. Very painful.",
      timestamp: "12:15 PM",
      isUser: true,
    },
  ];

  return (
    <div className="flex flex-col bg-background border rounded-lg shadow-sm h-[420px]">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium">Ask AI</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {chatMessages.map((msg, i) => (
            <ChatMessage
              key={i}
              message={msg.message}
              timestamp={msg.timestamp}
              isUser={msg.isUser}
              senderName={msg.senderName}
            />
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t mt-auto">
        <div className="flex gap-2">
          <Input placeholder="Type your message..." className="flex-1" />
          <Button size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox; 