import { useAgent } from 'agents/react';
import { useAgentChat } from '@cloudflare/ai-chat/react';
import type { UIMessage } from 'ai';
import { useCallback, useMemo, useState } from 'react';

interface UseChatAgentOptions {
  agentPublicId: string;
  sessionId: number | null;
  backendUrl?: string;
  mode?: 'cheap' | 'normal' | 'premium' | 'fast' | 'smart' | 'expensive';
  enabled?: boolean;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'failed';
}

export function useChatAgent({
  agentPublicId,
  sessionId,
  backendUrl = 'http://localhost:8787',
  mode = 'normal',
  enabled = true,
}: UseChatAgentOptions) {
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const shouldConnect = enabled && Boolean(agentPublicId) && Boolean(sessionId);

  const agent = useAgent({
    agent: 'AgentDO',
    host: backendUrl,
    name: agentPublicId,
    onOpen: () => setIsSocketOpen(true),
    onClose: () => setIsSocketOpen(false),
    onError: () => setIsSocketOpen(false),
  });

  const {
    messages: agentMessages,
    sendMessage: agentSendMessage,
    addToolOutput,
    clearHistory,
    status: chatStatus,
    stop,
  } = useAgentChat<unknown, UIMessage>({
    agent,
    getInitialMessages: async () => [],
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

  const messages: ChatMessage[] = useMemo(() => {
    if (!shouldConnect) return [];

    return (agentMessages || [])
      .map((msg) => ({
        id: msg.id || `${msg.role}-${Date.now()}`,
        sessionId: String(sessionId ?? ''),
        role: msg.role === 'user' ? 'user' as const : 'agent' as const,
        content: extractText(msg),
        timestamp: new Date(),
        status: chatStatus === 'submitted' && msg.role === 'user' ? 'sending' as const : 'sent' as const,
      }))
      .filter((msg) => msg.content.trim().length > 0);
  }, [agentMessages, chatStatus, extractText, sessionId, shouldConnect]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!shouldConnect || !isSocketOpen) {
        throw new Error('Agent connection is not ready');
      }

      await agentSendMessage({
        role: 'user',
        metadata: {
          agentPublicId,
          sessionId,
          mode,
        },
        parts: [{ type: 'text', text: content }],
      });
    },
    [agentPublicId, agentSendMessage, isSocketOpen, mode, sessionId, shouldConnect]
  );

  return {
    messages,
    sendMessage: shouldConnect ? sendMessage : async () => {},
    status: shouldConnect && isSocketOpen ? 'connected' : 'disconnected',
    isConnected: shouldConnect && isSocketOpen,
    isConnecting: shouldConnect && !isSocketOpen,
    error: undefined,
    addToolResult: addToolOutput,
    clearHistory,
    stop,
    chatStatus,
  };
}
