import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { listChatSessions, updateChatSession } from '../../services/api';
import type { ChatSession } from '../../types';
import { SidebarConversationsContext } from './sidebarConversationsContext';

export const SidebarConversationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { error: showError } = useNotification();
  const showErrorRef = useRef(showError);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const refreshConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listChatSessions();

      if (response.success && response.data) {
        setSessions(
          response.data.filter((session) => !session.status || session.status === 'ACTIVE')
        );
      } else {
        showErrorRef.current(response.error || 'Failed to load chat sessions');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  const addOrUpdateConversation = useCallback((session: ChatSession) => {
    if (session.status && session.status !== 'ACTIVE') {
      setSessions((prev) => prev.filter((item) => item.id !== session.id));
      return;
    }

    setSessions((prev) => {
      const existing = prev.find((item) => item.id === session.id);
      const nextSession = existing ? { ...existing, ...session } : session;
      return [nextSession, ...prev.filter((item) => item.id !== session.id)];
    });
  }, []);

  const renameConversation = useCallback(async (sessionId: string, newTitle: string) => {
    const response = await updateChatSession(sessionId, { title: newTitle });

    if (response.success) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, title: newTitle, updatedAt: new Date() }
            : session
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
