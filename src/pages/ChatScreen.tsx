/**
 * ChatScreen Page
 * Main chat interface for conversing with an AI Agent via WebSocket
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

  // WebSocket connection to ChatAgent Durable Object
  // Uses raw WebSocket with custom protocol for setSession RPC and chat messages
  const {
    messages: wsMessages,
    sendMessage: wsSendMessage,
    status: wsStatus,
    isConnected,
    isConnecting,
  } = useChatAgentWebSocket({
    agentPublicId: agentId || '', // agentId from URL is the publicId
    sessionId: activeSessionInternalId,
    backendUrl: 'http://localhost:8787',
    enabled: !!agentId && !!activeSessionInternalId,
  });

  // Combine initial messages with WebSocket messages
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const allMessages = initialMessagesLoaded ? [...initialMessages, ...wsMessages] : initialMessages;

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

      setAgent(foundAgent);

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
          // Auto-create a new session if none exist
          const createResponse = await createChatSession(foundAgent.publicId, `Chat with ${foundAgent.name}`);
          if (createResponse.success && createResponse.data) {
            const newSession = {
              ...createResponse.data,
              id: createResponse.data.publicId,
              internalId: createResponse.data.id, // Store internal ID
            };
            setSessions([newSession]);
            setActiveSessionId(newSession.id);
            setActiveSessionInternalId(newSession.internalId);
          } else {
            showError(createResponse.error || 'Failed to create chat session');
          }
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

        // Update session metadata (last message, title)
        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSessionId
              ? {
                  ...session,
                  lastMessage: content.substring(0, 50),
                  lastMessageAt: new Date(),
                  title: session.title.startsWith('Chat with')
                    ? content.substring(0, 30) + (content.length > 30 ? '...' : '')
                    : session.title,
                }
              : session
          )
        );
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to send message');
      }
    },
    [isConnected, activeSessionId, wsSendMessage, showError]
  );

  const handleToggleInfo = () => {
    setIsInfoPanelVisible((prev) => !prev);
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
      />

      {/* Center - Chat Conversation */}
      <ChatConversation
        agent={agent}
        messages={allMessages}
        isLoading={isConnecting}
        onSendMessage={handleSendMessage}
        onToggleInfo={handleToggleInfo}
      />

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
