/**
 * ChatScreen Page
 * Main chat interface for conversing with an AI Agent via WebSocket
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Agent, ChatMessage, ChatSource } from '../types';
import { useAgents } from '../contexts/AgentsContext';
import { useNotification } from '../hooks/useNotification';
import { useChatAgent } from '../hooks/useChatAgent';
import { ChatConversation } from '../components/chat/ChatConversation';
import { AgentInfoPanel } from '../components/chat/AgentInfoPanel';
import { useSidebarConversations } from '../components/layout/useSidebarConversations';
import { CircularProgress } from '@mui/material';
import { getChatSession, listChatMessages, getAgent } from '../services/api';

const TEMP_CHAT_AGENT_PUBLIC_ID = '__temporary-agent__';

export const ChatScreen: React.FC = () => {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { agents } = useAgents();
  const { error: showError } = useNotification();
  const { sessions, addOrUpdateConversation } = useSidebarConversations();
  const initialSendRef = useRef(false);
  const lastSyncedAgentMessageRef = useRef<string | null>(null);
  const initialState = location.state as {
    initialMessage?: string;
    initialFile?: File | null;
  } | null;
  const initialMessage = initialState?.initialMessage;
  const initialFile = initialState?.initialFile ?? null;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionInternalId, setActiveSessionInternalId] = useState<number | null>(null);
  const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [executionMode] = useState<'cheap' | 'normal' | 'premium'>('normal');

  const {
    messages: agentMessages,
    sendMessage: agentSendMessage,
    isConnected,
    isConnecting,
  } = useChatAgent({
    conversationId: activeSessionId || '',
    agentPublicId: agent?.publicId || '',
    sessionId: activeSessionInternalId,
    mode: executionMode,
    capability: 'chat',
    enabled: !!agent && !!activeSessionId && activeSessionInternalId !== null,
  });

  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const allMessages = initialMessagesLoaded
    ? [...initialMessages, ...agentMessages]
    : initialMessages;
  const latestMessage = allMessages[allMessages.length - 1];
  const shouldShowThinkingIndicator = isAwaitingResponse && latestMessage?.role !== 'agent';

  useEffect(() => {
    const latestAgentMessage = agentMessages[agentMessages.length - 1];
    if (!latestAgentMessage || latestAgentMessage.role !== 'agent' || !activeSessionId) {
      return;
    }

    setIsAwaitingResponse(false);

    if (lastSyncedAgentMessageRef.current === latestAgentMessage.id) {
      return;
    }
    lastSyncedAgentMessageRef.current = latestAgentMessage.id;

    let cancelled = false;
    void getChatSession(activeSessionId)
      .then((response) => {
        if (!cancelled && response.success && response.data) {
          addOrUpdateConversation(response.data);
        }
      })
      .catch(() => {
        // Session title sync is non-critical; the next sidebar refresh will pick it up.
      });

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, addOrUpdateConversation, agentMessages]);

  // Reset thinking indicator when switching sessions
  useEffect(() => {
    setIsAwaitingResponse(false);
    initialSendRef.current = false;
    lastSyncedAgentMessageRef.current = null;
  }, [activeSessionId]);

  // ============================================
  // Initialize Agent & Sessions
  // ============================================

  useEffect(() => {
    const initializeChatScreen = async () => {
      setIsInitializing(true);

      if (!routeSessionId) {
        showError('Chat session ID is required');
        navigate('/new-chat');
        return;
      }

      const sessionResponse = await getChatSession(routeSessionId);
      if (!sessionResponse.success || !sessionResponse.data) {
        showError(sessionResponse.error || 'Chat session not found');
        navigate('/new-chat');
        return;
      }

      const currentSession = sessionResponse.data;
      if (typeof currentSession.internalId !== 'number') {
        showError('Chat session is missing internal ID');
        navigate('/new-chat');
        return;
      }

      let resolvedAgent: Agent | null = null;
      if (currentSession.agentPublicId) {
        const contextAgent = agents.find((item) => item.publicId === currentSession.agentPublicId);
        const agentResponse = contextAgent ? null : await getAgent(currentSession.agentPublicId);
        const loadedAgent =
          contextAgent ||
          (agentResponse?.success && agentResponse.data ? agentResponse.data : null);

        if (loadedAgent) {
          resolvedAgent = {
            ...loadedAgent,
            id: loadedAgent.id || loadedAgent.publicId,
          };
        }
      }

      if (!resolvedAgent) {
        resolvedAgent = {
          id: currentSession.agentPublicId || TEMP_CHAT_AGENT_PUBLIC_ID,
          publicId: currentSession.agentPublicId || TEMP_CHAT_AGENT_PUBLIC_ID,
          name: currentSession.agentName || 'AI Assistant',
          description: currentSession.agentPublicId ? 'Chat assistant' : 'Temporary chat assistant',
          avatarUrl: null,
          capabilityIds: [],
          characteristicIds: [],
          knowledgeIds: [],
          ownerType: 'USER',
          userId: '',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      setAgent(resolvedAgent);
      addOrUpdateConversation(currentSession);

      setActiveSessionId(currentSession.id);
      setActiveSessionInternalId(currentSession.internalId);
      setIsInitializing(false);
    };

    initializeChatScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSessionId, agents]);

  // ============================================
  // Helper Functions
  // ============================================

  const extractSourcesFromRawPayload = useCallback(
    (rawPayload: string | Record<string, unknown> | null | undefined): ChatSource[] => {
      if (!rawPayload) return [];

      try {
        const payload =
          typeof rawPayload === 'string'
            ? (JSON.parse(rawPayload) as Record<string, unknown>)
            : rawPayload;
        const sources = payload.sources;
        if (!Array.isArray(sources)) return [];

        return sources
          .map((source): ChatSource | null => {
            if (!source || typeof source !== 'object') return null;
            const item = source as Record<string, unknown>;
            if (typeof item.marker !== 'string' || typeof item.title !== 'string') return null;
            return {
              marker: item.marker,
              title: item.title,
              url: typeof item.url === 'string' ? item.url : undefined,
            };
          })
          .filter((source): source is ChatSource => Boolean(source));
      } catch {
        return [];
      }
    },
    []
  );

  const loadInitialMessages = useCallback(
    async (sessionId: string) => {
      setInitialMessagesLoaded(false);
      const response = await listChatMessages(sessionId);

      if (response.success && response.data) {
        // Convert backend message format to UI format
        const formattedMessages: ChatMessage[] = response.data.map((message) => {
          const msg = message as unknown as {
            publicId?: string;
            id?: string;
            sessionId?: string;
            role: string;
            content: string;
            timestamp?: string | Date;
            createdAt?: string | Date;
            status?: ChatMessage['status'];
            sources?: ChatSource[];
            rawPayload?: string | Record<string, unknown> | null;
          };

          return {
            id: msg.publicId || msg.id || `${msg.role}-${Date.now()}`,
            sessionId: msg.sessionId || sessionId,
            role: msg.role === 'user' ? 'user' : 'agent',
            content: msg.content,
            sources: msg.sources || extractSourcesFromRawPayload(msg.rawPayload),
            timestamp: new Date(msg.timestamp || msg.createdAt || Date.now()),
            status: msg.status || 'sent',
          };
        });
        setInitialMessages(formattedMessages);
        setInitialMessagesLoaded(true);
      } else {
        setInitialMessages([]);
        setInitialMessagesLoaded(true);
      }
    },
    [extractSourcesFromRawPayload]
  );

  // Load initial messages when active session changes
  useEffect(() => {
    if (activeSessionId) {
      loadInitialMessages(activeSessionId);
    }
  }, [activeSessionId, loadInitialMessages]);

  // ============================================
  // Handlers
  // ============================================

  const handleSendMessage = useCallback(
    async (content: string, files?: File[]) => {
      if (!content.trim() && (!files || files.length === 0)) {
        return;
      }

      if (!isConnected || !activeSessionId) {
        showError('Not connected to agent. Please wait...');
        return;
      }

      setIsAwaitingResponse(true);

      try {
        // Send message via WebSocket - agent handles everything
        await agentSendMessage(content, files);

        const currentSession = sessions.find((s) => s.id === activeSessionId);

        if (currentSession) {
          addOrUpdateConversation({
            ...currentSession,
            lastMessage: content.substring(0, 50),
            lastMessageAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (err) {
        setIsAwaitingResponse(false);
        showError(err instanceof Error ? err.message : 'Failed to send message');
      }
    },
    [isConnected, activeSessionId, agentSendMessage, showError, sessions, addOrUpdateConversation]
  );

  useEffect(() => {
    if (
      !initialMessage ||
      initialSendRef.current ||
      !isConnected ||
      !activeSessionId ||
      !initialMessagesLoaded
    ) {
      return;
    }

    initialSendRef.current = true;
    void handleSendMessage(initialMessage, initialFile ? [initialFile] : undefined);
    navigate(location.pathname, { replace: true, state: null });
  }, [
    activeSessionId,
    handleSendMessage,
    initialFile,
    initialMessage,
    initialMessagesLoaded,
    isConnected,
    location.pathname,
    navigate,
  ]);

  const handleToggleInfo = useCallback(() => {
    setIsInfoPanelVisible((prev) => !prev);
  }, []);

  // ============================================
  // Render
  // ============================================

  // Show loading while chat is initializing
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
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Center - Chat Conversation or Empty State */}
      {activeSessionId ? (
        <ChatConversation
          agent={agent}
          messages={allMessages}
          isLoading={shouldShowThinkingIndicator}
          isInputDisabled={isConnecting || shouldShowThinkingIndicator}
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
              Click <span className="font-medium text-blue-500">New Chat</span> to start a
              conversation with {agent.name}.
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
      <AgentInfoPanel agent={agent} isVisible={isInfoPanelVisible} onClose={handleToggleInfo} />
    </div>
  );
};
