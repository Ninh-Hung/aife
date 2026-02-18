/**
 * ChatScreen Page
 * Main chat interface for conversing with an AI Agent via WebSocket
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Agent, ChatSession, ChatMessage } from '../types';
import { useAgents } from '../contexts/AgentsContext';
import { useNotification } from '../hooks/useNotification';
import { useChatAgentWebSocket } from '../hooks/useChatAgentWebSocket';
import { ChatSessionsList } from '../components/chat/ChatSessionsList';
import { ChatConversation } from '../components/chat/ChatConversation';
import { AgentInfoPanel } from '../components/chat/AgentInfoPanel';
import { CircularProgress } from '@mui/material';
import {
  listChatSessions,
  createChatSession,
  listChatMessages,
  updateChatSession,
  getAgent,
} from '../services/api';

export const ChatScreen: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { agents, loading: agentsLoading } = useAgents();
  const { error: showError } = useNotification();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionInternalId, setActiveSessionInternalId] = useState<number | null>(null);
  const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);

  // WebSocket connection to ChatAgent Durable Object
  // Uses raw WebSocket with custom protocol for setSession RPC and chat messages
  const {
    messages: wsMessages,
    sendMessage: wsSendMessage,
    status: wsStatus,
    isConnected,
    isConnecting,
    autoCreatedSessionPublicId,
  } = useChatAgentWebSocket({
    agentPublicId: agentId || '', // agentId from URL is the publicId
    sessionId: activeSessionInternalId,
    backendUrl: 'http://localhost:8787',
    enabled: !!agentId && !!activeSessionInternalId,
  });

  // Combine initial messages with WebSocket messages
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const allMessages = initialMessagesLoaded ? [...initialMessages, ...wsMessages] : initialMessages;

  // Clear thinking indicator when the agent replies
  useEffect(() => {
    if (wsMessages.length > 0 && wsMessages[wsMessages.length - 1].role === 'assistant') {
      setIsAwaitingResponse(false);
    }
  }, [wsMessages]);

  // Reset thinking indicator when switching sessions
  useEffect(() => {
    setIsAwaitingResponse(false);
  }, [activeSessionId]);

  // ============================================
  // Initialize Agent & Sessions
  // ============================================

  useEffect(() => {
    const initializeChatScreen = async () => {
      if (!agentId) {
        showError('Agent ID is required');
        navigate('/agents');
        return;
      }

      // Wait for agents to finish loading
      if (agentsLoading) {
        return;
      }

      // Find the agent by publicId (agentId from URL is the publicId)
      const foundAgent = agents.find((a) => a.publicId === agentId);
      if (!foundAgent) {
        showError('Agent not found');
        navigate('/agents');
        return;
      }

      // Fetch full agent details (with populated capabilities, characteristics, knowledges)
      const fullAgentResponse = await getAgent(agentId);
      setAgent(fullAgentResponse.success && fullAgentResponse.data ? fullAgentResponse.data : foundAgent);

      // Fetch existing chat sessions from API using publicId
      const response = await listChatSessions(foundAgent.publicId);

      if (response.success && response.data) {
        // Map backend response to frontend format (publicId -> id)
        const existingSessions = response.data.map((session: any) => ({
          ...session,
          id: session.publicId,
          internalId: session.id, // Store internal ID for WebSocket
        }));

        if (existingSessions.length === 0) {
          // No sessions exist — wait for user to click "New Chat"
          setSessions([]);
        } else {
          setSessions(existingSessions);
          setActiveSessionId(existingSessions[0].id);
          setActiveSessionInternalId(existingSessions[0].internalId);
        }
      } else {
        showError(response.error || 'Failed to load chat sessions');
      }

      setIsInitializing(false);
    };

    initializeChatScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, agentsLoading, agents]);

  // Load initial messages when active session changes
  useEffect(() => {
    if (activeSessionId) {
      loadInitialMessages(activeSessionId);
    }
  }, [activeSessionId]);

  // When the Durable Object auto-creates a new session (e.g. its in-memory
  // sessionMap was cleared after hibernation), refresh the sidebar so the
  // new session becomes visible immediately without requiring a page reload.
  useEffect(() => {
    if (autoCreatedSessionPublicId) {
      refreshSessions();
    }
    // refreshSessions is not wrapped in useCallback so it changes every render;
    // we only want this effect to fire when autoCreatedSessionPublicId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreatedSessionPublicId]);

  // ============================================
  // Helper Functions
  // ============================================

  const loadInitialMessages = async (sessionId: string) => {
    setInitialMessagesLoaded(false);
    const response = await listChatMessages(sessionId);

    if (response.success && response.data) {
      // Convert backend message format to UI format
      const formattedMessages: ChatMessage[] = response.data.map((msg) => ({
        id: msg.publicId,
        sessionId: msg.sessionId || sessionId,
        role: msg.role === 'user' ? 'user' : 'agent',
        content: msg.content,
        timestamp: new Date(msg.timestamp || msg.createdAt),
        status: msg.status || 'sent',
      }));
      setInitialMessages(formattedMessages);
      setInitialMessagesLoaded(true);
    } else {
      setInitialMessages([]);
      setInitialMessagesLoaded(true);
    }
  };

  // ============================================
  // Handlers
  // ============================================

  const handleNewChat = async () => {
    if (!agent) return;

    const response = await createChatSession(agent.publicId, `Chat with ${agent.name}`);

    if (response.success && response.data) {
      const newSession = {
        ...response.data,
        id: response.data.publicId,
        internalId: response.data.id,
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setActiveSessionInternalId(newSession.internalId);
    } else {
      showError(response.error || 'Failed to create chat session');
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setActiveSessionInternalId((session as any).internalId);
    }
  };

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!isConnected || !activeSessionId) {
        showError('Not connected to agent. Please wait...');
        return;
      }

      try {
        // Send message via WebSocket - agent handles everything
        await wsSendMessage(content);
        setIsAwaitingResponse(true);

        // Compute new title before updating state so we can persist it
        const currentSession = sessions.find((s) => s.id === activeSessionId);
        const needsTitleUpdate = currentSession?.title.startsWith('Chat with') ?? false;
        const newTitle = needsTitleUpdate
          ? content.substring(0, 30) + (content.length > 30 ? '...' : '')
          : (currentSession?.title ?? '');

        // Persist title change to backend so it survives page reload
        if (needsTitleUpdate && newTitle) {
          updateChatSession(activeSessionId, { title: newTitle }).catch(() => {
            // Title update failure is non-critical; session and messages are unaffected
          });
        }

        // Update session metadata (last message, title) in local state
        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSessionId
              ? {
                  ...session,
                  lastMessage: content.substring(0, 50),
                  lastMessageAt: new Date(),
                  title: session.title.startsWith('Chat with') ? newTitle : session.title,
                }
              : session
          )
        );
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to send message');
      }
    },
    [isConnected, activeSessionId, wsSendMessage, showError, sessions]
  );

  const handleToggleInfo = () => {
    setIsInfoPanelVisible((prev) => !prev);
  };

  const refreshSessions = async () => {
    if (!agent) return;
    const response = await listChatSessions(agent.publicId);
    if (response.success && response.data) {
      const activeSessions = response.data
        .filter((s: any) => !s.status || s.status === 'ACTIVE' || s.status === 'active')
        .map((session: any) => ({
          ...session,
          id: session.publicId,
          internalId: session.id,
        }));
      setSessions(activeSessions);

      // If the deleted session was active, switch to the first remaining one
      if (activeSessions.length > 0 && !activeSessions.find((s: any) => s.id === activeSessionId)) {
        setActiveSessionId(activeSessions[0].id);
        setActiveSessionInternalId(activeSessions[0].internalId);
      } else if (activeSessions.length === 0) {
        setActiveSessionId(null);
        setActiveSessionInternalId(null);
      }
    }
  };

  const handleDelete = async (sessionId: string) => {
    const response = await updateChatSession(sessionId, { status: 'DELETED' });
    if (response.success) {
      await refreshSessions();
    } else {
      showError(response.error || 'Failed to delete chat session');
    }
  };

  // ============================================
  // Render
  // ============================================

  // Show loading while agents are loading or chat is initializing
  if (agentsLoading || isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <CircularProgress size={40} className="mb-4" />
          <p className="text-gray-600 dark:text-slate-400">
            {agentsLoading ? 'Loading agents...' : 'Loading chat...'}
          </p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <p className="text-gray-600 dark:text-slate-400">Agent not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Chat Sessions */}
      <ChatSessionsList
        sessions={sessions}
        activeSessionId={activeSessionId || undefined}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
      />

      {/* Center - Chat Conversation or Empty State */}
      {activeSessionId ? (
        <ChatConversation
          agent={agent}
          messages={allMessages}
          isLoading={isConnecting || isAwaitingResponse}
          onSendMessage={handleSendMessage}
          onToggleInfo={handleToggleInfo}
        />
      ) : (
        <div className="flex h-full flex-1 flex-col items-center justify-center bg-gray-50 dark:bg-slate-900">
          <div className="text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
              <MessageSquare size={32} className="text-gray-400 dark:text-slate-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
              No conversations yet
            </h3>
            <p className="max-w-md text-sm text-gray-600 dark:text-slate-400">
              Click <span className="font-medium text-blue-500">New Chat</span> to start a conversation with {agent.name}.
            </p>
          </div>
        </div>
      )}

      {/* WebSocket Status Indicator */}
      {!isConnected && activeSessionId && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-yellow-100 px-4 py-2 text-sm text-yellow-800 shadow-lg dark:bg-yellow-900 dark:text-yellow-200">
          {isConnecting ? 'Connecting to agent...' : 'Disconnected from agent'}
        </div>
      )}

      {/* Right Panel - Agent Info (collapsible) */}
      <AgentInfoPanel
        agent={agent}
        isVisible={isInfoPanelVisible}
        onClose={handleToggleInfo}
      />
    </div>
  );
};
