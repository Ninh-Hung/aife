/**
 * MessageBubble Component
 * Displays a single chat message with markdown support
 */

import React, { useState } from 'react';
import {
  Bot,
  User as UserIcon,
  Copy,
  Check,
  Brain,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { ChatMessage, ChatSource } from '../../types';
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
  const parsedContent = parseAgentResponse(message.content);
  const parsedReasoning = message.reasoning ? parseAgentResponse(message.reasoning) : null;
  const reasoningContainsAnswer =
    Boolean(parsedReasoning?.content.trim()) &&
    parsedReasoning?.content.trim() !== message.reasoning?.trim();
  const parsedMessage = isUser
    ? { content: message.content, reasoning: null }
    : reasoningContainsAnswer
      ? {
          content: parsedContent.content.trim() || parsedReasoning?.content || '',
          reasoning: parsedContent.reasoning,
        }
      : {
          content: parsedContent.content,
          reasoning: parsedReasoning?.reasoning ?? parsedContent.reasoning,
        };
  const displayContent = parsedMessage.content;
  const reasoning = parsedMessage.reasoning?.trim() || null;
  const sources = isUser ? [] : message.sources || [];

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

  const sourceByMarker = new Map(sources.map((source) => [source.marker, source]));

  const renderContentWithSources = (content: string, citationSources: ChatSource[]) => {
    if (citationSources.length === 0) {
      return content;
    }

    return content.split(/(\[\d+\])/g).map((part, index) => {
      const source = sourceByMarker.get(part);
      if (!source?.url) {
        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
      }

      return (
        <a
          key={`${part}-${index}`}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          title={source.title}
          className="mx-0.5 rounded-sm font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-700 dark:text-sky-300 dark:decoration-sky-500/60 dark:hover:text-sky-200"
        >
          {part}
        </a>
      );
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
                {renderContentWithSources(displayContent, sources)}
              </div>
            )}

            {!isUser && sources.length > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-2 dark:border-slate-700">
                <div className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                  Nguồn tham khảo
                </div>
                <div className="space-y-1">
                  {sources.map((source) => (
                    <a
                      key={`${source.marker}-${source.url || source.title}`}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      title={source.title}
                      className={`flex items-start gap-1.5 rounded px-1 py-0.5 text-xs leading-snug transition-colors ${
                        source.url
                          ? 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-sky-300 dark:hover:bg-sky-950/40 dark:hover:text-sky-200'
                          : 'pointer-events-none text-gray-500 dark:text-slate-400'
                      }`}
                    >
                      <span className="mt-px flex-shrink-0 font-medium">{source.marker}</span>
                      <span className="min-w-0 flex-1 break-words">{source.title}</span>
                      {source.url && <ExternalLink size={12} className="mt-0.5 flex-shrink-0" />}
                    </a>
                  ))}
                </div>
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
