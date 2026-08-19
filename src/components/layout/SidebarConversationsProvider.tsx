import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNotification } from '../../hooks/useNotification';
import {
  useChatRealtimeEvents,
  type ConversationTitleUpdatedEvent,
} from '../../hooks/useChatRealtimeEvents';
import { listChatSessions, updateChatSession } from '../../services/api';
import type { ChatSession } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarConversationsContext } from './sidebarConversationsContext';

const toTimestamp = (value: Date | string | null | undefined) => {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getConversationActivityTimestamp = (session: ChatSession) =>
  toTimestamp(session.lastMessageAt) ||
  toTimestamp(session.createdAt) ||
  toTimestamp(session.updatedAt);

const sortConversationsByActivity = (sessions: ChatSession[]) =>
  [...sessions].sort((a, b) => {
    const activityDiff = getConversationActivityTimestamp(b) - getConversationActivityTimestamp(a);
    if (activityDiff !== 0) return activityDiff;

    return a.id.localeCompare(b.id);
  });

export const SidebarConversationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { error: showError } = useNotification();
  const { isAuthenticated, isAnonymous, isLoading: authLoading } = useAuth();
  const showErrorRef = useRef(showError);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated || isAnonymous) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await listChatSessions();

      if (response.success && response.data) {
        setSessions(
          sortConversationsByActivity(
            response.data.filter((session) => !session.status || session.status === 'ACTIVE')
          )
        );
      } else {
        showErrorRef.current(response.error || 'Failed to load chat sessions');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAnonymous]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || isAnonymous) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    void refreshConversations();
  }, [authLoading, isAuthenticated, isAnonymous, refreshConversations]);

  const addOrUpdateConversation = useCallback((session: ChatSession) => {
    if (session.status && session.status !== 'ACTIVE') {
      setSessions((prev) => prev.filter((item) => item.id !== session.id));
      return;
    }

    setSessions((prev) => {
      const existing = prev.find((item) => item.id === session.id);
      const nextSession = existing ? { ...existing, ...session } : session;
      return sortConversationsByActivity([
        nextSession,
        ...prev.filter((item) => item.id !== session.id),
      ]);
    });
  }, []);

  const applyConversationTitleUpdate = useCallback(
    (event: ConversationTitleUpdatedEvent) => {
      const title = event.data.title.trim();
      if (!title) {
        return;
      }

      setSessions((prev) => {
        const found = prev.some((session) => session.id === event.data.sessionPublicId);
        if (!found) {
          window.setTimeout(() => void refreshConversations(), 0);
          return prev;
        }

        const next = prev.map((session) => {
          if (session.id !== event.data.sessionPublicId) {
            return session;
          }

          return {
            ...session,
            title,
            status: event.data.status as ChatSession['status'],
            updatedAt: new Date(event.data.updatedAt),
            lastMessageAt: event.data.lastMessageAt
              ? new Date(event.data.lastMessageAt)
              : session.lastMessageAt,
            agentPublicId: event.data.agentPublicId || session.agentPublicId,
            agentName: event.data.agentName || session.agentName,
          };
        });

        return found ? sortConversationsByActivity(next) : prev;
      });
    },
    [refreshConversations]
  );

  useChatRealtimeEvents({
    enabled: isAuthenticated && !isAnonymous,
    onConversationTitleUpdated: applyConversationTitleUpdate,
  });

  const renameConversation = useCallback(async (sessionId: string, newTitle: string) => {
    const response = await updateChatSession(sessionId, { title: newTitle });

    if (response.success) {
      setSessions((prev) =>
        sortConversationsByActivity(
          prev.map((session) =>
            session.id === sessionId
              ? { ...session, title: newTitle, updatedAt: new Date() }
              : session
          )
        )
      );
      return true;
    }

    showErrorRef.current(response.error || 'Failed to rename chat session');
    return false;
  }, []);

  const archiveConversation = useCallback(async (sessionId: string) => {
    const response = await updateChatSession(sessionId, { status: 'ARCHIVED' });

    if (response.success) {
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      return true;
    }

    showErrorRef.current(response.error || 'Failed to archive chat session');
    return false;
  }, []);

  const deleteConversation = useCallback(async (sessionId: string) => {
    const response = await updateChatSession(sessionId, { status: 'DELETED' });

    if (response.success) {
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      return true;
    }

    showErrorRef.current(response.error || 'Failed to delete chat session');
    return false;
  }, []);

  const value = useMemo(
    () => ({
      sessions,
      isLoading,
      refreshConversations,
      addOrUpdateConversation,
      renameConversation,
      archiveConversation,
      deleteConversation,
    }),
    [
      addOrUpdateConversation,
      archiveConversation,
      deleteConversation,
      isLoading,
      refreshConversations,
      renameConversation,
      sessions,
    ]
  );

  return (
    <SidebarConversationsContext.Provider value={value}>
      {children}
    </SidebarConversationsContext.Provider>
  );
};
