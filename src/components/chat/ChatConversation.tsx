/**
 * ChatConversation Component
 * Center area showing chat messages and input
 */

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Bot, Info, LogIn, MessageSquare } from 'lucide-react';
import { IconButton, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Agent, ChatMessage } from '../../types';
import { MessageBubble } from './MessageBubble';
import { ChatInputScreen } from './ChatInputScreen';
import { AvatarMedia } from './AvatarMedia';
import type { ChatExecutionMode } from '../../hooks/useChatAgent';
import type { RealtimeVoiceAgentState } from '../../hooks/useRealtimeVoiceAgent';
import { AI_AGENT_WARNING_MESSAGE_KEY } from '../../common/constants';

interface ChatConversationProps {
  agent: Agent;
  messages: ChatMessage[];
  isLoading: boolean;
  isGenerating?: boolean;
  isInputDisabled?: boolean;
  onSendMessage: (content: string, files?: File[]) => void;
  onCancelResponse?: () => void;
  executionMode: ChatExecutionMode;
  onExecutionModeChange: (mode: ChatExecutionMode) => void;
  voiceInputEnabled?: boolean;
  voiceAgent?: RealtimeVoiceAgentState;
  onToggleInfo: () => void;
  showSignInButton?: boolean;
  onSignIn?: () => void;
  /** Current user's avatar URL */
  userAvatar?: string;
  /** Current user's avatar type */
  userAvatarType?: 'image' | 'video';
  sessionLimitWarning?: {
    level: 'near_limit' | 'limit_reached' | string;
    message: string;
  } | null;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  agent,
  messages,
  isLoading,
  isGenerating,
  isInputDisabled,
  onSendMessage,
  onCancelResponse,
  executionMode,
  onExecutionModeChange,
  voiceInputEnabled = true,
  voiceAgent,
  onToggleInfo,
  showSignInButton,
  onSignIn,
  userAvatar,
  userAvatarType,
  sessionLimitWarning,
}) => {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReportMessage = (message: ChatMessage) => {
    const messageIndex = messages.findIndex((item) => item.id === message.id);
    const previousUserMessage = [...messages.slice(0, messageIndex)]
      .reverse()
      .find((item) => item.role === 'user');

    window.dispatchEvent(
      new CustomEvent('feedback:open', {
        detail: {
          type: 'ABUSE_REPORT',
          title: t('feedback.chat.reportAiResponseTitle'),
          targetType: 'CHAT_MESSAGE',
          sourceContext: 'CHAT_MESSAGE_ACTION',
          conversationId: message.sessionId,
          messageId: message.id,
          chatconverd: agent.publicId || agent.id,
          reportedMessageSnapshot: message.content,
          previousUserMessageSnapshot: previousUserMessage?.content,
        },
      })
    );
  };

  const thinkingIndicator = (
    <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 dark:bg-slate-800">
      <CircularProgress size={16} className="text-gray-600 dark:text-slate-400" />
      <span className="text-sm text-gray-600 dark:text-slate-400">{t('chat.thinking')}</span>
    </div>
  );

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:h-[100dvh]">
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

        <div className="flex flex-shrink-0 items-center gap-2">
          {showSignInButton && (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-medium text-white transition-colors hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800"
            >
              <LogIn size={16} />
              <span>{t('common.signIn')}</span>
            </button>
          )}

          {/* Toggle Info Button */}
          <IconButton
            onClick={onToggleInfo}
            size="small"
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Info size={20} />
          </IconButton>
        </div>
      </div>

      {sessionLimitWarning && (
        <div
          role="status"
          className={`flex flex-shrink-0 items-center gap-2 border-b px-4 py-2 text-sm ${
            sessionLimitWarning.level === 'limit_reached'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
          }`}
        >
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span className="min-w-0 flex-1 truncate">{sessionLimitWarning.message}</span>
        </div>
      )}

      {/* Messages Area - Flex 1, Scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900">
        {messages.length === 0 ? (
          // Empty State - Centered in available space
          <div className="flex h-full items-center justify-center p-8">
            {isLoading ? (
              thinkingIndicator
            ) : (
              <div className="text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                  <MessageSquare size={32} className="text-gray-400 dark:text-slate-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Start a conversation
                </h3>
                <p className="max-w-md text-sm text-gray-600 dark:text-slate-400">
                  Send a message to start chatting with {agent.name}. Your conversation will be
                  saved for future reference.
                </p>
              </div>
            )}
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
                onReport={handleReportMessage}
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
                {thinkingIndicator}
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input - Fixed at Bottom */}
      <div className="sticky bottom-0 z-20 flex-shrink-0">
        <ChatInputScreen
          onSend={(content, files) => onSendMessage(content, files)}
          onCancel={onCancelResponse}
          isSubmitting={isInputDisabled ?? false}
          isGenerating={isGenerating ?? isLoading}
          placeholder={`Message ${agent.name}...`}
          executionMode={executionMode}
          onExecutionModeChange={onExecutionModeChange}
          voiceInputEnabled={voiceInputEnabled}
          voiceAgent={voiceAgent}
          showHeading={false}
          showAgentSelector={false}
          compact
          warningText={t(AI_AGENT_WARNING_MESSAGE_KEY)}
        />
      </div>
    </div>
  );
};
