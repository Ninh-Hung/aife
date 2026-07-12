/**
 * MessageBubble Component
 * Displays a single chat message with markdown support
 */

import React, { useState } from 'react';
import { Bot, User as UserIcon, Copy, Check, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { ChatMessage } from '../../types';
import { AvatarMedia } from './AvatarMedia';
import { parseAgentResponse } from '../../utils/agentResponse';

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
  const [copied, setCopied] = useState(false);
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const parsedMessage = isUser
    ? { content: message.content, reasoning: null }
    : message.reasoning
      ? { content: message.content, reasoning: message.reasoning }
      : parseAgentResponse(message.content);
  const displayContent = parsedMessage.content;
  const reasoning = parsedMessage.reasoning?.trim() || null;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent || message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
    <div className={`mb-3 flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[70%] gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
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
            {reasoning && (
              <div
                className={
                  displayContent ? 'mb-2 border-b border-gray-100 pb-2 dark:border-slate-700' : ''
                }
              >
                <button
                  type="button"
                  onClick={() => setIsReasoningOpen((prev) => !prev)}
                  className="flex w-full items-center gap-1.5 text-left text-xs italic text-gray-400 transition-colors hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  {isReasoningOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Brain size={13} />
                  <span>Reasoning</span>
                </button>
                {isReasoningOpen && (
                  <div className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words pr-1 text-xs italic leading-relaxed text-gray-400 dark:text-slate-500">
                    {reasoning}
                  </div>
                )}
              </div>
            )}

            {displayContent && (
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {displayContent}
              </div>
            )}
          </div>

          {/* Timestamp + Copy */}
          <div
            className={`mt-1 flex items-center gap-1.5 px-1 text-xs text-gray-500 dark:text-slate-500 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <span>
              {formatTime(message.timestamp)}
              {message.status === 'sending' && <span className="ml-1 italic"> • Sending...</span>}
              {message.status === 'failed' && <span className="ml-1 text-red-500"> • Failed</span>}
            </span>
            <button
              onClick={handleCopy}
              title="Copy message"
              className="rounded p-0.5 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
