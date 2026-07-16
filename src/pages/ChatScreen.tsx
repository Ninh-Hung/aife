/**
 * ChatScreen Page
 * Main chat interface for conversing with an AI Agent via WebSocket
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Agent, ChatMessage, ChatSource } from '../types';
import { useAgents } from '../contexts/AgentsContext';
import { useNotification } from '../hooks/useNotification';
import { useChatAgent, type ChatExecutionMode } from '../hooks/useChatAgent';
import { ChatConversation } from '../components/chat/ChatConversation';
import { AgentInfoPanel } from '../components/chat/AgentInfoPanel';
import { useSidebarConversations } from '../components/layout/useSidebarConversations';
import { CircularProgress } from '@mui/material';
import { getChatSession, listChatMessages, getAgent } from '../services/api';
import { parseAgentResponse } from '../utils/agentResponse';

const DEFAULT_SESSION_TITLES = new Set(['new chat', 'chat with ai assistant']);
const FIRST_RESPONSE_TITLE_SYNC_DELAYS_MS = [0, 700, 1200, 1800, 2600, 3600];
const CHAT_EXECUTION_MODES = new Set<ChatExecutionMode>(['cheap', 'normal', 'premium']);

const normalizeInitialExecutionMode = (mode: unknown): ChatExecutionMode =>
  typeof mode === 'string' && CHAT_EXECUTION_MODES.has(mode as ChatExecutionMode)
    ? (mode as ChatExecutionMode)
    : 'cheap';

const isDefaultConversationTitle = (title: string | null | undefined) => {
  const normalized = title?.trim().toLowerCase() ?? '';
  return (
    !normalized || DEFAULT_SESSION_TITLES.has(normalized) || normalized.startsWith('chat with ')
  );
};

const getMessageDedupeKey = (message: ChatMessage) =>
  `${message.role}\u0000${message.content.trim().replace(/\s+/g, ' ')}`;

const removePersistedMessagesDuplicatedByLiveMessages = (
  persistedMessages: ChatMessage[],
  liveMessages: ChatMessage[]
) => {
  const liveMessageCounts = new Map<string, number>();
  for (const message of liveMessages) {
    const key = getMessageDedupeKey(message);
    liveMessageCounts.set(key, (liveMessageCounts.get(key) ?? 0) + 1);
  }

  const dedupedReversed: ChatMessage[] = [];
  for (let index = persistedMessages.length - 1; index >= 0; index -= 1) {
    const message = persistedMessages[index];
    const key = getMessageDedupeKey(message);
    const matchingLiveCount = liveMessageCounts.get(key) ?? 0;

    if (matchingLiveCount > 0) {
      liveMessageCounts.set(key, matchingLiveCount - 1);
      continue;
    }

    dedupedReversed.push(message);
  }

  return dedupedReversed.reverse();
};

const hasRenderableMessageContent = (message: ChatMessage) => {
  if (message.role === 'user') {
    return message.content.trim().length > 0;
  }

  return parseAgentResponse(message.content).content.trim().length > 0;
};

export const ChatScreen: React.FC = () => {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { agents } = useAgents();
  const { error: showError } = useNotification();
  const { sessions, addOrUpdateConversation } = useSidebarConversations();
  const initialSendRef = useRef<string | null>(null);
  const lastSyncedAgentMessageRef = useRef<string | null>(null);
  const lastAppliedConversationTitleRef = useRef<string | null>(null);
  const messageLoadRequestRef = useRef(0);
  const initialState = location.state as {
    initialMessage?: string;
    initialFile?: File | null;
    initialMode?: ChatExecutionMode;
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
  const [executionMode, setExecutionMode] = useState<ChatExecutionMode>(() =>
    normalizeInitialExecutionMode(initialState?.initialMode)
  );

  const {
    messages: agentMessages,
    sendMessage: agentSendMessage,
    isConnected,
    isConnecting,
    chatStatus,
  } = useChatAgent({
    conversationId: activeSessionId || '',
    agentPublicId: agent?.publicId || '',
    sessionId: activeSessionInternalId,
    mode: executionMode,
    capability: 'chat',
    enabled: !!agent && !!activeSessionId && activeSessionInternalId !== null,
  });

  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const isActiveRouteSession = Boolean(routeSessionId && activeSessionId === routeSessionId);
  const allMessages = useMemo(() => {
    if (!isActiveRouteSession || !initialMessagesLoaded) {
      return [];
    }

    if (agentMessages.length === 0) {
      return initialMessages;
    }

    const dedupedInitialMessages = removePersistedMessagesDuplicatedByLiveMessages(
      initialMessages,
      agentMessages
    );

    return [...dedupedInitialMessages, ...agentMessages];
  }, [agentMessages, initialMessages, initialMessagesLoaded, isActiveRouteSession]);
  const visibleMessages = useMemo(
    () =>
      allMessages.filter((message) => {
        if (message.role !== 'agent') {
          return true;
        }

        if (hasRenderableMessageContent(message)) {
          return true;
        }

        return !(message.status === 'sending' || chatStatus !== 'ready' || isAwaitingResponse);
      }),
    [allMessages, chatStatus, isAwaitingResponse]
  );
  const latestVisibleMessage = visibleMessages[visibleMessages.length - 1];
  let lastUserMessageIndex = -1;
  for (let index = allMessages.length - 1; index >= 0; index -= 1) {
    if (allMessages[index].role === 'user') {
      lastUserMessageIndex = index;
      break;
    }
  }
  const responseMessagesAfterLastUser =
    lastUserMessageIndex >= 0 ? allMessages.slice(lastUserMessageIndex + 1) : allMessages;
  const latestResponseAgentMessage = responseMessagesAfterLastUser
    .filter((message) => message.role === 'agent')
    .slice(-1)[0];
  const latestResponseHasRenderableContent =
    latestResponseAgentMessage !== undefined &&
    hasRenderableMessageContent(latestResponseAgentMessage);
  const hasPendingAgentPlaceholder = responseMessagesAfterLastUser.some(
    (message) =>
      message.role === 'agent' &&
      message.status === 'sending' &&
      !hasRenderableMessageContent(message)
  );
  const isResponseInFlight =
    isAwaitingResponse || chatStatus === 'submitted' || chatStatus === 'streaming';
  const shouldShowThinkingIndicator =
    (hasPendingAgentPlaceholder || isResponseInFlight) &&
    !latestResponseHasRenderableContent &&
    latestVisibleMessage?.role !== 'agent';

  useEffect(() => {
    const latestAgentMessage = agentMessages[agentMessages.length - 1];
    if (
      !latestAgentMessage ||
      latestAgentMessage.role !== 'agent' ||
      !activeSessionId ||
      chatStatus !== 'ready'
    ) {
      return;
    }

    setIsAwaitingResponse(false);

    const currentSession = sessions.find((session) => session.id === activeSessionId);
    const conversationTitle = latestAgentMessage.conversationTitle?.trim();
    const userMessageCount = allMessages.filter((message) => message.role === 'user').length;
    const agentResponseCount = allMessages.filter(
      (message) =>
        message.role === 'agent' &&
        (message.content.trim().length > 0 || Boolean(message.reasoning?.trim()))
    ).length;
    const shouldSyncFirstResponseTitle = userMessageCount <= 1 && agentResponseCount <= 1;
    let didApplyConversationTitle = false;

    if (conversationTitle) {
      const titleKey = `${activeSessionId}\u0000${conversationTitle}`;

      if (
        lastAppliedConversationTitleRef.current !== titleKey &&
        currentSession &&
        isDefaultConversationTitle(currentSession.title)
      ) {
        lastAppliedConversationTitleRef.current = titleKey;
        addOrUpdateConversation({
          ...currentSession,
          title: conversationTitle,
          updatedAt: new Date(),
        });
        didApplyConversationTitle = true;
      }
    }

    if (
      didApplyConversationTitle ||
      (currentSession && !isDefaultConversationTitle(currentSession.title))
    ) {
      return;
    }

    if (!shouldSyncFirstResponseTitle) {
      return;
    }

    if (lastSyncedAgentMessageRef.current === latestAgentMessage.id) {
      return;
    }
    lastSyncedAgentMessageRef.current = latestAgentMessage.id;

    let cancelled = false;
    void (async () => {
      for (const delayMs of FIRST_RESPONSE_TITLE_SYNC_DELAYS_MS) {
        if (cancelled) {
          return;
        }

        if (delayMs > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, delayMs));
        }

        if (cancelled) {
          return;
        }

        try {
          const response = await getChatSession(activeSessionId);
          if (!response.success || !response.data || cancelled) {
            continue;
          }

          if (isDefaultConversationTitle(response.data.title)) {
            continue;
          }

          addOrUpdateConversation(response.data);
          return;
        } catch {
          // Session title sync is non-critical; a later sidebar refresh will pick it up.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, addOrUpdateConversation, agentMessages, allMessages, chatStatus, sessions]);

  // Reset thinking indicator when switching sessions
  useEffect(() => {
    setIsAwaitingResponse(false);
    lastSyncedAgentMessageRef.current = null;
    lastAppliedConversationTitleRef.current = null;
  }, [activeSessionId]);

  useEffect(() => {
    if (!routeSessionId || routeSessionId === activeSessionId) {
      return;
    }

    messageLoadRequestRef.current += 1;
    setInitialMessages([]);
    setInitialMessagesLoaded(false);
    setIsAwaitingResponse(false);
  }, [activeSessionId, routeSessionId]);

  // ============================================
  // Initialize Agent & Sessions
  // ============================================

  useEffect(() => {
    let cancelled = false;

    const initializeChatScreen = async () => {
      setIsInitializing(true);

      if (!routeSessionId) {
        showError('Chat session ID is required');
        navigate('/new-chat');
        return;
      }

      const sessionResponse = await getChatSession(routeSessionId);
      if (cancelled) {
        return;
      }

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

      if (!currentSession.agentPublicId) {
        showError('Chat session is missing agent ID');
        navigate('/new-chat');
        return;
      }

      let resolvedAgent: Agent | null = null;
      const contextAgent = agents.find((item) => item.publicId === currentSession.agentPublicId);
      const agentResponse = contextAgent ? null : await getAgent(currentSession.agentPublicId);
      if (cancelled) {
        return;
      }

      const loadedAgent =
        contextAgent || (agentResponse?.success && agentResponse.data ? agentResponse.data : null);

      if (loadedAgent) {
        resolvedAgent = {
          ...loadedAgent,
          id: loadedAgent.id || loadedAgent.publicId,
        };
      }

      if (!resolvedAgent) {
        resolvedAgent = {
          id: currentSession.agentPublicId,
          publicId: currentSession.agentPublicId,
          name: currentSession.agentName || 'AI Assistant',
          description: 'Chat assistant',
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
    return () => {
      cancelled = true;
    };
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

  const extractReasoningFromRawPayload = useCallback(
    (rawPayload: string | Record<string, unknown> | null | undefined): string | null => {
      if (!rawPayload) return null;

      try {
        const payload =
          typeof rawPayload === 'string'
            ? (JSON.parse(rawPayload) as Record<string, unknown>)
            : rawPayload;
        const reasoning = payload.reasoning;
        return typeof reasoning === 'string' && reasoning.trim() ? reasoning : null;
      } catch {
        return null;
      }
    },
    []
  );

  const normalizeMessageStatus = useCallback((status: unknown): ChatMessage['status'] => {
    if (typeof status !== 'string') return 'sent';

    switch (status.toUpperCase()) {
      case 'PENDING':
      case 'STREAMING':
        return 'sending';
      case 'FAILED':
        return 'failed';
      default:
        return 'sent';
    }
  }, []);

  const loadInitialMessages = useCallback(
    async (sessionId: string, options?: { resetLoaded?: boolean }) => {
      const requestId = ++messageLoadRequestRef.current;

      if (options?.resetLoaded !== false) {
        setInitialMessages([]);
        setInitialMessagesLoaded(false);
      }
      const response = await listChatMessages(sessionId);

      if (requestId !== messageLoadRequestRef.current) {
        return;
      }

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
            reasoning?: string | null;
            sources?: ChatSource[];
            rawPayload?: string | Record<string, unknown> | null;
          };
          const status = normalizeMessageStatus(msg.status);

          return {
            id: msg.publicId || msg.id || `${msg.role}-${Date.now()}`,
            sessionId: msg.sessionId || sessionId,
            role: msg.role === 'user' ? 'user' : 'agent',
            content: msg.content,
            reasoning: msg.reasoning || extractReasoningFromRawPayload(msg.rawPayload),
            sources: msg.sources || extractSourcesFromRawPayload(msg.rawPayload),
            timestamp: new Date(msg.timestamp || msg.createdAt || Date.now()),
            status,
          };
        });
        setInitialMessages(formattedMessages);
        setInitialMessagesLoaded(true);
      } else {
        setInitialMessages([]);
        setInitialMessagesLoaded(true);
      }
    },
    [extractReasoningFromRawPayload, extractSourcesFromRawPayload, normalizeMessageStatus]
  );

  // Load initial messages when active session changes
  useEffect(() => {
    if (activeSessionId) {
      loadInitialMessages(activeSessionId);
    }
  }, [activeSessionId, loadInitialMessages]);

  useEffect(() => {
    if (!activeSessionId) return;

    const hasPendingPersistedResponse = initialMessages.some(
      (message) => message.role === 'agent' && message.status === 'sending'
    );
    if (!hasPendingPersistedResponse) return;

    const intervalId = window.setInterval(() => {
      void loadInitialMessages(activeSessionId, { resetLoaded: false });
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [activeSessionId, initialMessages, loadInitialMessages]);

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
    if (!initialMessage || !isConnected || !activeSessionId) {
      return;
    }

    const initialSendKey = `${activeSessionId}\u0000${initialMessage}`;
    if (initialSendRef.current === initialSendKey) {
      return;
    }

    initialSendRef.current = initialSendKey;
    void handleSendMessage(initialMessage, initialFile ? [initialFile] : undefined);
    navigate(location.pathname, { replace: true, state: null });
  }, [
    activeSessionId,
    handleSendMessage,
    initialFile,
    initialMessage,
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
  if (isInitializing || !isActiveRouteSession || !initialMessagesLoaded) {
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
          messages={visibleMessages}
          isLoading={shouldShowThinkingIndicator}
          isInputDisabled={isConnecting || shouldShowThinkingIndicator}
          onSendMessage={handleSendMessage}
          executionMode={executionMode}
          onExecutionModeChange={setExecutionMode}
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
