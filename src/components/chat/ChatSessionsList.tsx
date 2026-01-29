/**
 * ChatSessionsList Component
 * Left sidebar showing list of chat sessions
 */

import React from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { Button } from '@mui/material';
import { ChatSession } from '../../types';

interface ChatSessionsListProps {
  sessions: ChatSession[];
  activeSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
}

export const ChatSessionsList: React.FC<ChatSessionsListProps> = ({
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewChat,
}) => {
  // Format last message time
  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    }
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    }
    if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-slate-700">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-slate-100">
          Chat Sessions
        </h2>
        <Button
          variant="contained"
          fullWidth
          startIcon={<Plus size={18} />}
          onClick={onNewChat}
          className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
        >
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare
              size={48}
              className="mb-3 text-gray-300 dark:text-slate-600"
            />
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No chat sessions yet
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Start a new chat to begin
            </p>
          </div>
        ) : (
          <div className="py-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={`w-full border-l-4 px-4 py-3 text-left transition-colors ${
                  activeSessionId === session.id
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-slate-700/70'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {/* Session Title */}
                <div className="mb-1 truncate font-medium text-gray-900 dark:text-slate-100">
                  {session.title}
                </div>

                {/* Last Message Preview */}
                {session.lastMessage && (
                  <div className="mb-1 truncate text-sm text-gray-600 dark:text-slate-400">
                    {session.lastMessage}
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-gray-500 dark:text-slate-500">
                  {formatTime(session.lastMessageAt)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
