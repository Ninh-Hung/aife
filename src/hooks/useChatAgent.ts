/**
 * useChatAgent Hook
 * WebSocket connection to AgentDO Durable Object using Cloudflare Agents SDK
 * Provides real-time bidirectional communication for chat
 */

import { useAgent } from 'agents/react';
import { useAgentChat } from 'agents/ai-react';
import type { UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';

interface UseChatAgentOptions {
  agentPublicId: string;
  sessionId: number | null;
  backendUrl?: string;
  enabled?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useChatAgent({
  agentPublicId,
  sessionId,
  backendUrl = 'http://localhost:8787',
  enabled = true,
}: UseChatAgentOptions) {
  const [isSessionSet, setIsSessionSet] = useState(false);
  const sessionSetRef = useRef(false);

  // Only connect if we have a valid agent ID
  const shouldConnect = enabled && !!agentPublicId;

  // Create agent instance pointing to the Durable Object
  // The 'name' parameter is the agent's publicId (used as DO name)
  const agent = useAgent<any>({
    agent: "AgentDO", // Unified AgentDO class
    host: backendUrl,
    name: agentPublicId,
  });

  // Use Cloudflare's useAgentChat for chat functionality
  const {
    messages: agentMessages,
    sendMessage: agentSendMessage,
    addToolResult,
    clearHistory,
    status: chatStatus,
    stop,
  } = useAgentChat<unknown, UIMessage<{ createdAt: string }>>({
    agent: shouldConnect ? agent : undefined,
  });

  // Set session when agent is connected
  useEffect(() => {
    const setSession = async () => {
      if (
        agent.status === 'connected' &&
        sessionId &&
        !sessionSetRef.current &&
        shouldConnect
      ) {
        try {
          console.log('[useChatAgent] Setting session:', sessionId);
          // Call setSession RPC to tell agent which session to use
          await (agent as any).setSession(sessionId);
          sessionSetRef.current = true;
          setIsSessionSet(true);
          console.log('[useChatAgent] Session set successfully');
        } catch (error) {
          console.error('[useChatAgent] Error setting session:', error);
        }
      }
    };

    setSession();
  }, [agent.status, sessionId, shouldConnect, agent]);

  // Reset session flag when sessionId changes
  useEffect(() => {
    sessionSetRef.current = false;
    setIsSessionSet(false);
  }, [sessionId]);

  // Convert UIMessages to our ChatMessage format
  const messages: ChatMessage[] = shouldConnect
    ? (agentMessages || []).map((msg: any) => ({
        id: msg.id || `${msg.role}-${Date.now()}`,
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: typeof msg.content === 'string' ? msg.content : msg.content?.[0]?.text || '',
        timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
      }))
    : [];

  // Wrap sendMessage to handle our use case
  const sendMessage = async (content: string) => {
    if (!isSessionSet || !shouldConnect) {
      throw new Error('Session not set or agent not enabled');
    }
    await agentSendMessage({ role: 'user', content });
  };

  return {
    messages,
    sendMessage: shouldConnect ? sendMessage : async () => {},
    status: shouldConnect ? agent.status : 'disconnected',
    isConnected: shouldConnect && agent.status === 'connected' && isSessionSet,
    isConnecting: shouldConnect && (agent.status === 'connecting' || (agent.status === 'connected' && !isSessionSet)),
    error: shouldConnect ? agent.error : undefined,
    // Additional utilities from useAgentChat
    addToolResult,
    clearHistory,
    stop,
    chatStatus,
  };
}
