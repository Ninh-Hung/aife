import { useAgent } from 'agents/react';
import { useAgentChat } from '@cloudflare/ai-chat/react';
import type { FileUIPart, UIMessage } from 'ai';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseChatAgentOptions {
  conversationId: string;
  agentPublicId: string;
  sessionId: number | null;
  mode?: 'cheap' | 'normal' | 'premium' | 'fast' | 'smart' | 'expensive';
  capability?: 'chat' | 'image_to_text' | 'text_to_image' | 'translation';
  enabled?: boolean;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'agent';
  content: string;
  reasoning?: string | null;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'failed';
}

function fileToUIPart(file: File): Promise<FileUIPart> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        type: 'file',
        mediaType: file.type || 'application/octet-stream',
        url: reader.result as string,
      });
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

export function useChatAgent({
  conversationId,
  agentPublicId,
  sessionId,
  mode = 'normal',
  capability = 'chat',
  enabled = true,
}: UseChatAgentOptions) {
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const shouldConnect =
    enabled && Boolean(conversationId) && Boolean(agentPublicId) && sessionId !== null;
  const serverUrl = import.meta.env.VITE_SERVER_URL || '';
  const agentHost = normalizeAgentHost(serverUrl);
  const agentName = 'AgentDO';

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
    experimental_throttle: 100,
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
          if (part.type === 'file') return part.url ? '[Attachment]' : '';
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

  const messages: ChatMessage[] = useMemo(() => {
    if (!shouldConnect) return [];

    return (agentMessages || [])
      .map((msg) => {
        const content = extractText(msg);
        const reasoning = extractReasoning(msg);

        return {
          id: msg.id || `${msg.role}-${Date.now()}`,
          sessionId: String(sessionId ?? ''),
          role: msg.role === 'user' ? ('user' as const) : ('agent' as const),
          content,
          reasoning,
          timestamp: new Date(),
          status:
            chatStatus === 'submitted' && msg.role === 'user'
              ? ('sending' as const)
              : ('sent' as const),
        };
      })
      .filter((msg) => msg.content.trim().length > 0 || Boolean(msg.reasoning?.trim()));
  }, [agentMessages, chatStatus, extractReasoning, extractText, sessionId, shouldConnect]);

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

      await agentSendMessage({
        text: trimmed,
        files: fileParts.length > 0 ? fileParts : undefined,
        metadata: {
          agentPublicId,
          sessionId,
          mode,
          capability,
        },
      });
    },
    [agent.ready, agentPublicId, agentSendMessage, capability, mode, sessionId, shouldConnect]
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
