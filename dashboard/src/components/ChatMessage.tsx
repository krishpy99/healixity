import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import 'highlight.js/styles/github-dark.css'; // Better for dark mode support

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
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return timestamp;
    }
  };

  const markdownComponents: Components = {
    // Custom styling for markdown elements
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="text-sm">{children}</li>,
    code: ({ children, className, ...props }) => {
      const isInline = !className;
      return isInline ? (
        <code 
          className={`px-1 py-0.5 rounded text-xs font-mono ${
            isUser 
              ? 'bg-primary-foreground/20 text-primary-foreground' 
              : 'bg-muted-foreground/20 text-foreground'
          }`} 
          {...props}
        >
          {children}
        </code>
      ) : (
        <code 
          className="block p-2 rounded bg-muted-foreground/10 text-xs font-mono overflow-x-auto" 
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-muted-foreground/10 rounded p-2 mb-2 overflow-x-auto">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-muted-foreground/30 pl-3 mb-2 italic">
        {children}
      </blockquote>
    ),
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    a: ({ children, href }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`underline hover:no-underline ${
          isUser 
            ? 'text-primary-foreground/90 hover:text-primary-foreground' 
            : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
        }`}
      >
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-2">
        <table className="min-w-full border-collapse border border-muted-foreground/30">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-muted-foreground/30 px-2 py-1 bg-muted-foreground/10 font-bold text-left">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-muted-foreground/30 px-2 py-1">
        {children}
      </td>
    ),
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-[80%] rounded-lg p-3 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-foreground'
        }`}
      >
        <div className="text-sm">
          {isUser ? (
            // For user messages, render as plain text
            <p>{message}</p>
          ) : (
            // For AI messages, render as markdown
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {message}
            </ReactMarkdown>
          )}
        </div>
        <p className={`text-xs mt-2 ${
          isUser 
            ? 'text-primary-foreground/80' 
            : 'text-muted-foreground'
        }`}>
          {formatTimestamp(timestamp)}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;