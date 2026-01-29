/**
 * ChatScreen Page
 * Main chat interface for conversing with an AI Agent
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Agent, ChatSession, ChatMessage } from '../types';
import { useAgents } from '../contexts/AgentsContext';
import { useNotification } from '../hooks/useNotification';
import { ChatSessionsList } from '../components/chat/ChatSessionsList';
import { ChatConversation } from '../components/chat/ChatConversation';
import { AgentInfoPanel } from '../components/chat/AgentInfoPanel';
import { CircularProgress } from '@mui/material';

export const ChatScreen: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { agents } = useAgents();
  const { error: showError } = useNotification();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

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

      // Find the agent
      const foundAgent = agents.find((a) => a.id === agentId);
      if (!foundAgent) {
        showError('Agent not found');
        navigate('/agents');
        return;
      }

      setAgent(foundAgent);

      // TODO: Fetch existing chat sessions from API
      // For now, we'll check if there are any existing sessions
      const existingSessions: ChatSession[] = []; // await fetchChatSessions(agentId);

      if (existingSessions.length === 0) {
        // Auto-create a new session if none exist
        const newSession = createNewSession(foundAgent.id);
        setSessions([newSession]);
        setActiveSessionId(newSession.id);
      } else {
        setSessions(existingSessions);
        setActiveSessionId(existingSessions[0].id);
      }

      setIsInitializing(false);
    };

    initializeChatScreen();
  }, [agentId, agents, navigate, showError]);

  // Load messages when active session changes
  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    }
  }, [activeSessionId]);

  // ============================================
  // Helper Functions
  // ============================================

  const createNewSession = (agentId: string): ChatSession => {
    const now = new Date();
    return {
      id: `session-${Date.now()}`,
      agentId,
      title: `Chat #${sessions.length + 1}`,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };
  };

  const loadMessages = async (_sessionId: string) => {
    // TODO: Fetch messages from API
    // For now, initialize with empty array
    setMessages([]);
  };

  // ============================================
  // Handlers
  // ============================================

  const handleNewChat = () => {
    if (!agent) return;

    const newSession = createNewSession(agent.id);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeSessionId || !agent) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sessionId: activeSessionId,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sent',
    };

    // Add user message to UI
    setMessages((prev) => [...prev, userMessage]);

    // Update session last message
    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              lastMessage: content,
              lastMessageAt: new Date(),
              title: session.title === `Chat #${sessions.length}` && prev.indexOf(session) === 0
                ? content.substring(0, 30) + (content.length > 30 ? '...' : '')
                : session.title,
            }
          : session
      )
    );

    // Show loading
    setIsLoading(true);

    try {
      // TODO: Call API to send message and get agent response
      // const response = await sendChatMessage(activeSessionId, content);

      // Simulate agent response for now
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const agentMessage: ChatMessage = {
        id: `msg-${Date.now()}-agent`,
        sessionId: activeSessionId,
        role: 'agent',
        content: `Hello! I'm ${agent.name}. I received your message: "${content}". This is a simulated response. API integration is pending.`,
        timestamp: new Date(),
        status: 'sent',
      };

      setMessages((prev) => [...prev, agentMessage]);

      // Update session last message with agent response
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                lastMessage: agentMessage.content,
                lastMessageAt: new Date(),
              }
            : session
        )
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleInfo = () => {
    setIsInfoPanelVisible((prev) => !prev);
  };

  // ============================================
  // Render
  // ============================================

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <CircularProgress size={40} className="mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Loading chat...</p>
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
        messages={messages}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        onToggleInfo={handleToggleInfo}
      />

      {/* Right Panel - Agent Info (collapsible) */}
      <AgentInfoPanel
        agent={agent}
        isVisible={isInfoPanelVisible}
        onClose={handleToggleInfo}
      />
    </div>
  );
};
