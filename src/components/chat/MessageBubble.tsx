/**
 * MessageBubble Component
 * Displays a single chat message with markdown support
 */

import React from 'react';
import { Bot, User as UserIcon } from 'lucide-react';
import { ChatMessage } from '../../types';
import { AvatarMedia } from './AvatarMedia';

interface MessageBubbleProps {
  message: ChatMessage;
  agentName?: string;
  agentAvatar?: string;
  agentAvatarType?: 'image' | 'video';
  userAvatar?: string;
  userAvatarType?: 'image' | 'video';
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  agentAvatar,
  agentAvatarType,
  userAvatar,
  userAvatarType,
}) => {
  const isUser = message.role === 'user';

  // Format timestamp
  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`mb-3 flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`flex max-w-[70%] gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Avatar */}
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full ${
            isUser
              ? 'bg-blue-500 dark:bg-blue-600'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600'
          }`}
        >
          {isUser ? (
            <AvatarMedia
              src={userAvatar}
              type={userAvatarType}
              alt="You"
              fallback={<UserIcon size={16} className="text-white" />}
            />
          ) : (
            <AvatarMedia
              src={agentAvatar}
              type={agentAvatarType}
              alt="Agent"
              fallback={<Bot size={16} className="text-white" />}
            />
          )}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Message Bubble */}
          <div
            className={`rounded-lg px-3.5 py-2 ${
              isUser
                ? 'bg-blue-500 text-white dark:bg-blue-600'
                : 'bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-100'
            }`}
          >
            {/* Simple text rendering - can be enhanced with markdown */}
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </div>
          </div>

          {/* Timestamp */}
          <div className="mt-1 px-1 text-xs text-gray-500 dark:text-slate-500">
            {formatTime(message.timestamp)}
            {message.status === 'sending' && (
              <span className="ml-1 italic"> • Sending...</span>
            )}
            {message.status === 'failed' && (
              <span className="ml-1 text-red-500"> • Failed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
