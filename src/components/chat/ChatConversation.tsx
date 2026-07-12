/**
 * ChatConversation Component
 * Center area showing chat messages and input
 */

import React, { useEffect, useRef } from 'react';
import { Bot, Info, MessageSquare } from 'lucide-react';
import { IconButton, CircularProgress } from '@mui/material';
import { Agent, ChatMessage } from '../../types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { AvatarMedia } from './AvatarMedia';

interface ChatConversationProps {
  agent: Agent;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (content: string, files?: File[]) => void;
  onToggleInfo: () => void;
  /** Current user's avatar URL */
  userAvatar?: string;
  /** Current user's avatar type */
  userAvatarType?: 'image' | 'video';
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  agent,
  messages,
  isLoading,
  onSendMessage,
  onToggleInfo,
  userAvatar,
  userAvatarType,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* Header - Fixed Height */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          {/* Agent Avatar */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
            <AvatarMedia
              src={agent.avatarUrl}
              type={agent.avatarType}
              alt={agent.name}
              fallback={<Bot size={20} className="text-white" />}
            />
          </div>

          {/* Agent Info */}
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-gray-900 dark:text-slate-100">
              {agent.name}
            </h2>
            {agent.description && (
              <p className="truncate text-sm text-gray-600 dark:text-slate-400">
                {agent.description}
              </p>
            )}
          </div>
        </div>

        {/* Toggle Info Button */}
        <IconButton
          onClick={onToggleInfo}
          size="small"
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <Info size={20} />
        </IconButton>
      </div>

      {/* Messages Area - Flex 1, Scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900">
        {messages.length === 0 ? (
          // Empty State - Centered in available space
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                <MessageSquare size={32} className="text-gray-400 dark:text-slate-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
                Start a conversation
              </h3>
              <p className="max-w-md text-sm text-gray-600 dark:text-slate-400">
                Send a message to start chatting with {agent.name}. Your conversation will be saved
                for future reference.
              </p>
            </div>
          </div>
        ) : (
          // Messages List - With proper padding
          <div className="w-full px-4 py-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                agentName={agent.name}
                agentAvatar={agent.avatarUrl ?? undefined}
                agentAvatarType={agent.avatarType}
                userAvatar={userAvatar}
                userAvatarType={userAvatarType}
              />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                  <AvatarMedia
                    src={agent.avatarUrl}
                    type={agent.avatarType}
                    alt={agent.name}
                    fallback={<Bot size={16} className="text-white" />}
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 dark:bg-slate-800">
                  <CircularProgress size={16} className="text-gray-600 dark:text-slate-400" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    {agent.name} is thinking...
                  </span>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input - Fixed at Bottom */}
      <div className="flex-shrink-0">
        <MessageInput
          onSend={onSendMessage}
          disabled={isLoading}
          placeholder={`Message ${agent.name}...`}
        />
      </div>
    </div>
  );
};
