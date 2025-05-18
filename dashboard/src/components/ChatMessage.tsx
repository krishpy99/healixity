import React from 'react';

interface ChatMessageProps {
  message: string;
  timestamp: string;
  isUser: boolean;
  senderName?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  timestamp,
  isUser,
}) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-[70%] rounded-lg p-3 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-foreground'
        }`}
      >
        <p className="text-sm">{message}</p>
        <p className={`text-xs mt-1 ${
          isUser 
            ? 'text-primary-foreground/80' 
            : 'text-muted-foreground'
        }`}>
          {timestamp}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;