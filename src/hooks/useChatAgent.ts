import { useAgent } from 'agents/react';
import { useAgentChat } from '@cloudflare/ai-chat/react';
import type { FileUIPart, UIMessage } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnonymousLimitError, ChatMessage, ChatSource } from '../types';
import { getStoredAppLocale } from '../i18n/types';

export type ChatExecutionMode = 'cheap' | 'normal' | 'expensive';

interface UseChatAgentOptions {
  conversationId: string;
  agentPublicId: string;
  sessionId: number | null;
  mode?: ChatExecutionMode | 'fast' | 'smart' | 'premium';
  capability?: 'chat' | 'image_to_text' | 'text_to_image' | 'translation';
  enabled?: boolean;
}

function fileToUIPart(file: File): Promise<FileUIPart> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        type: 'file',
        mediaType: file.type || 'application/octet-stream',
        url: reader.result as string,
        filename: file.name,
        size: file.size,
      } as FileUIPart & { filename: string; size: number });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function agentReadyWithTimeout(agentReady: Promise<void>, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('Agent connection timed out'));
    }, timeoutMs);

    agentReady
      .then(() => resolve())
      .catch(reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

function normalizeAgentHost(serverUrl: string): string | undefined {
  if (!serverUrl) return undefined;

  try {
    return new URL(serverUrl).host;
  } catch {
    return serverUrl
      .replace(/^https?:\/\//, '')
      .replace(/^wss?:\/\//, '')
      .replace(/\/$/, '');
  }
}

function isAbortOrCancelMessage(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  return (
    normalized === 'the operation was aborted' ||
    normalized === 'response generation was cancelled.'
  );
}

function isAnonymousLimitMetadata(metadata: unknown): metadata is AnonymousLimitError {
  if (!metadata || typeof metadata !== 'object') return false;

  const error = (metadata as { error?: unknown }).error;
  return (
    error === 'ANONYMOUS_LIMIT_EXCEEDED' ||
    error === 'Anonymous session limit exceeded' ||
    error === 'Anonymous message limit exceeded'
  );
}

export function useChatAgent({
  conversationId,
  agentPublicId,
  sessionId,
  mode = 'normal',
  capability,
  enabled = true,
}: UseChatAgentOptions) {
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const lastAnonymousLimitEventRef = useRef<string | null>(null);
  const shouldConnect =
    enabled && Boolean(conversationId) && Boolean(agentPublicId) && sessionId !== null;
  const serverUrl = import.meta.env.VITE_SERVER_URL || '';
  const agentHost = normalizeAgentHost(serverUrl);
  const agentName = 'AgentDO';

  useEffect(() => {
    setIsSocketOpen(false);
  }, [agentPublicId, conversationId, sessionId]);

  const agent = useAgent({
    agent: agentName,
    name: conversationId,
    enabled: shouldConnect,
    onOpen: () => {
      setIsSocketOpen(true);
      if (import.meta.env.DEV) {
        console.log('[useChatAgent] socket open', {
          agent: agentName,
          conversationId,
          agentPublicId,
          sessionId,
        });
      }
    },
    onClose: (event) => {
      setIsSocketOpen(false);
      if (import.meta.env.DEV) {
        console.log('[useChatAgent] socket closed', {
          agent: agentName,
          conversationId,
          agentPublicId,
          sessionId,
          code: event.code,
          reason: event.reason,
        });
      }
    },
    onError: (event) => {
      setIsSocketOpen(false);
      if (import.meta.env.DEV) {
        console.error('[useChatAgent] socket error', {
          agent: agentName,
          conversationId,
          agentPublicId,
          sessionId,
          event,
        });
      }
    },
    onIdentity: (name, agentType) => {
      if (import.meta.env.DEV) {
        console.log('[useChatAgent] socket identified', {
          agent: agentType,
          name,
          sessionId,
        });
      }
    },
    ...(agentHost ? { host: agentHost } : {}),
  });

  useEffect(() => {
    if (!import.meta.env.DEV || !shouldConnect) return;

    console.log('[useChatAgent] connecting', {
      agent: agentName,
      routeAgent: 'agentdo',
      conversationId,
      agentPublicId,
      sessionId,
      host: agentHost || window.location.host,
      route: `/agents/agent-d-o/${conversationId}`,
    });
  }, [agentHost, agentPublicId, conversationId, sessionId, shouldConnect]);

  const {
    messages: agentMessages,
    sendMessage: agentSendMessage,
    addToolOutput,
    clearHistory,
    status: chatStatus,
    stop,
  } = useAgentChat<unknown, UIMessage>({
    agent,
    getInitialMessages: null,
    resume: false,
    experimental_throttle: 50,
  });

  const extractText = useCallback((message: UIMessage): string => {
    const raw = message as unknown as {
      content?: unknown;
      parts?: Array<{ type: string; text?: string; url?: string }>;
    };

    if (typeof raw.content === 'string') {
      return raw.content;
    }

    if (Array.isArray(raw.parts)) {
      return raw.parts
        .map((part) => {
          if (part.type === 'text') return part.text ?? '';
          if (part.type === 'file') return '';
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }

    return '';
  }, []);

  const extractReasoning = useCallback((message: UIMessage): string | null => {
    const raw = message as unknown as {
      parts?: Array<{ type: string; text?: string }>;
    };

    if (!Array.isArray(raw.parts)) return null;

    const reasoning = raw.parts
      .filter((part) => part.type === 'reasoning' && part.text?.trim())
      .map((part) => part.text?.trim() ?? '')
      .join('\n\n')
      .trim();

    return reasoning || null;
  }, []);

  const extractSources = useCallback((message: UIMessage): ChatSource[] => {
    const raw = message as unknown as {
      metadata?: {
        sources?: unknown;
      };
    };

    if (!Array.isArray(raw.metadata?.sources)) {
      return [];
    }

    return raw.metadata.sources
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
  }, []);

  const extractAttachments = useCallback((message: UIMessage): ChatMessage['attachments'] => {
    const raw = message as unknown as {
      parts?: Array<{
        type: string;
        mediaType?: string;
        url?: string;
        filename?: string;
        name?: string;
        size?: number;
      }>;
    };

    if (!Array.isArray(raw.parts)) {
      return [];
    }

    return raw.parts
      .filter((part) => part.type === 'file')
      .map((part, index) => ({
        publicId: `local-${message.id}-${index}`,
        fileName: part.filename || part.name || `attachment-${index + 1}`,
        mimeType: part.mediaType || 'application/octet-stream',
        fileSize: part.size || 0,
        fileUrl: part.url,
      }));
  }, []);

  const extractConversationTitle = useCallback((message: UIMessage): string | undefined => {
    const raw = message as unknown as {
      metadata?: {
        conversationTitle?: unknown;
      };
    };

    return typeof raw.metadata?.conversationTitle === 'string'
      ? raw.metadata.conversationTitle.trim() || undefined
      : undefined;
  }, []);

  const extractMessageSessionId = useCallback((message: UIMessage): number | null => {
    const raw = message as unknown as {
      metadata?: {
        sessionId?: unknown;
      };
    };

    return typeof raw.metadata?.sessionId === 'number' ? raw.metadata.sessionId : null;
  }, []);

  const extractMessageConversationId = useCallback((message: UIMessage): string | null => {
    const raw = message as unknown as {
      metadata?: {
        conversationId?: unknown;
      };
    };

    return typeof raw.metadata?.conversationId === 'string' ? raw.metadata.conversationId : null;
  }, []);

  const extractAnonymousLimit = useCallback(
    (message: UIMessage): AnonymousLimitError | undefined => {
      const metadata = (message as unknown as { metadata?: unknown }).metadata;
      return isAnonymousLimitMetadata(metadata) ? metadata : undefined;
    },
    []
  );

  const isCurrentConversationMessage = useCallback(
    (message: UIMessage): boolean => {
      const messageSessionId = extractMessageSessionId(message);
      const messageConversationId = extractMessageConversationId(message);
      return messageSessionId === sessionId && messageConversationId === conversationId;
    },
    [conversationId, extractMessageConversationId, extractMessageSessionId, sessionId]
  );

  useEffect(() => {
    if (!shouldConnect) {
      return;
    }

    const latestAnonymousLimitMessage = [...(agentMessages || [])].reverse().find((message) => {
      if (!isCurrentConversationMessage(message)) {
        return false;
      }

      const metadata = (message as unknown as { metadata?: unknown }).metadata;
      const content = extractText(message).trim().toLowerCase();
      return (
        isAnonymousLimitMetadata(metadata) ||
        /^guest .+ limit reached\.?$/i.test(content) ||
        content.includes('guest daily token limit reached')
      );
    });

    if (!latestAnonymousLimitMessage) {
      return;
    }

    const eventKey = latestAnonymousLimitMessage.id;
    if (!eventKey || lastAnonymousLimitEventRef.current === eventKey) {
      return;
    }

    lastAnonymousLimitEventRef.current = eventKey;
    const metadata = (latestAnonymousLimitMessage as unknown as { metadata?: unknown }).metadata;
    const detail = isAnonymousLimitMetadata(metadata)
      ? metadata
      : {
          error: 'ANONYMOUS_LIMIT_EXCEEDED',
          message: extractText(latestAnonymousLimitMessage),
          upgradeUrl: '/signup',
        };

    window.dispatchEvent(
      new CustomEvent('quota:anonymous-limit', {
        detail,
      })
    );
  }, [agentMessages, extractText, isCurrentConversationMessage, shouldConnect]);

  const messages: ChatMessage[] = useMemo(() => {
    if (!shouldConnect) return [];

    return (agentMessages || [])
      .filter((msg) => {
        return isCurrentConversationMessage(msg);
      })
      .map((msg) => {
        const content = extractText(msg);
        const reasoning = extractReasoning(msg);
        const sources = extractSources(msg);
        const attachments = extractAttachments(msg);
        const conversationTitle = extractConversationTitle(msg);
        const anonymousLimit = extractAnonymousLimit(msg);
        const createdAt = (msg as unknown as { createdAt?: string | Date }).createdAt;

        return {
          id: msg.id || `${msg.role}-${Date.now()}`,
          sessionId: String(sessionId ?? ''),
          role: msg.role === 'user' ? ('user' as const) : ('agent' as const),
          content,
          reasoning,
          sources,
          attachments,
          conversationTitle,
          anonymousLimit,
          timestamp: createdAt ? new Date(createdAt) : new Date(),
          status: 'sent' as const,
        };
      })
      .filter((msg) => {
        if (msg.role === 'agent' && isAbortOrCancelMessage(msg.content)) {
          return false;
        }

        return (
          msg.content.trim().length > 0 ||
          Boolean(msg.reasoning?.trim()) ||
          Boolean(msg.attachments?.length)
        );
      });
  }, [
    agentMessages,
    extractAnonymousLimit,
    extractConversationTitle,
    extractAttachments,
    isCurrentConversationMessage,
    extractReasoning,
    extractSources,
    extractText,
    shouldConnect,
  ]);

  const sendMessage = useCallback(
    async (content: string, files?: File[]) => {
      if (!shouldConnect) {
        throw new Error('Agent connection is not ready');
      }

      await agentReadyWithTimeout(agent.ready);

      const trimmed = content.trim();
      const fileParts = await Promise.all((files ?? []).map(fileToUIPart));

      if (!trimmed && fileParts.length === 0) {
        return;
      }

      void agentSendMessage({
        text: trimmed,
        files: fileParts.length > 0 ? fileParts : undefined,
        metadata: {
          agentPublicId,
          sessionId,
          conversationId,
          mode,
          locale: getStoredAppLocale(),
          ...(capability ? { capability } : {}),
        },
      }).catch((error) => {
        if (import.meta.env.DEV) {
          console.error('[useChatAgent] send message failed', error);
        }
      });
    },
    [
      agent.ready,
      agentPublicId,
      agentSendMessage,
      capability,
      conversationId,
      mode,
      sessionId,
      shouldConnect,
    ]
  );

  const isAgentConnected = shouldConnect && isSocketOpen && agent.identified;

  return {
    messages,
    sendMessage: shouldConnect ? sendMessage : async () => {},
    status: isAgentConnected ? 'connected' : 'disconnected',
    isConnected: isAgentConnected,
    isConnecting: shouldConnect && !isSocketOpen,
    error: undefined,
    addToolResult: addToolOutput,
    clearHistory,
    stop,
    chatStatus,
  };
}
