/**
 * MessageInput Component
 * Multiline textarea with send button for chat messages
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { IconButton } from '@mui/material';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSend(trimmedMessage);
      setMessage('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        {/* Textarea Container */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:border-blue-500"
            style={{
              maxHeight: '120px',
              minHeight: '42px',
            }}
          />
        </div>

        {/* Send Button */}
        <IconButton
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="h-10 w-10 flex-shrink-0"
          sx={{
            bgcolor: 'rgb(59 130 246)',
            color: 'white',
            '&:hover': {
              bgcolor: 'rgb(37 99 235)',
            },
            '&:disabled': {
              bgcolor: 'rgb(203 213 225)',
              color: 'rgb(148 163 184)',
            },
          }}
        >
          <Send size={18} />
        </IconButton>
      </div>

      {/* Helper Text */}
      <div className="mt-2 text-xs text-gray-500 dark:text-slate-500">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
};
