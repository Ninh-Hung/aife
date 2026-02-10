/**
 * Custom WebSocket hook for ChatAgent
 * Direct WebSocket connection without agents/react package
 */

import { useState, useEffect, useRef, useCallback } from 'react';

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

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useChatAgentWebSocket({
  agentPublicId,
  sessionId,
  backendUrl = 'ws://localhost:8787',
  enabled = true,
}: UseChatAgentOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isSessionSet, setIsSessionSet] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionSetRef = useRef(false);
  const connectionIdRef = useRef(0); // Track connection instances

  // Build WebSocket URL
  // Note: agents package expects class name in kebab-case, not binding name
  // ChatAgent class -> "chat-agent" in URL
  const getWebSocketUrl = useCallback(() => {
    const wsUrl = backendUrl.replace(/^http/, 'ws');
    return `${wsUrl}/agents/chat-agent/${agentPublicId}`;
  }, [backendUrl, agentPublicId]);

  // Send message to agent
  const sendMessage = useCallback(
    async (content: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
      }

      if (!isSessionSet) {
        throw new Error('Session not set');
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      console.log('[WebSocket] Sending user message:', userMessage);

      // Add to messages immediately (optimistic update)
      setMessages((prev) => {
        console.log('[WebSocket] Current messages before adding user message:', prev.length);
        return [...prev, userMessage];
      });

      // Send to agent
      wsRef.current.send(
        JSON.stringify({
          type: 'chat',
          message: content,
        })
      );
    },
    [isSessionSet]
  );

  // Set session
  const setSessionOnAgent = useCallback(
    async (ws: WebSocket, sid: number) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('[WebSocket] Cannot set session - WS not ready. ReadyState:', ws?.readyState);
        return;
      }

      const rpcMessage = {
        type: 'rpc',
        method: 'setSession',
        params: [sid],
      };
      console.log('[WebSocket] ✓ Sending setSession RPC:', rpcMessage);
      ws.send(JSON.stringify(rpcMessage));
      console.log('[WebSocket] ✓ setSession RPC sent successfully');
    },
    []
  );

  // Connect to WebSocket
  useEffect(() => {
    if (!enabled || !agentPublicId || !sessionId) {
      setStatus('disconnected');
      return;
    }

    // Close existing connection if any (prevent duplicates)
    if (wsRef.current) {
      console.log('[WebSocket] Closing existing connection before creating new one');
      wsRef.current.close();
      wsRef.current = null;
    }

    const connect = () => {
      try {
        connectionIdRef.current += 1;
        const connId = connectionIdRef.current;
        const wsUrl = getWebSocketUrl();
        console.log(`[WebSocket#${connId}] Connecting to:`, wsUrl);
        console.log(`[WebSocket#${connId}] Session ID:`, sessionId);
        setStatus('connecting');

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        console.log(`[WebSocket#${connId}] New WebSocket instance created`);

        ws.onopen = () => {
          console.log(`[WebSocket#${connId}] Connected!`);
          setStatus('connected');

          // Set session after connection
          if (sessionId && !sessionSetRef.current) {
            console.log(`[WebSocket#${connId}] Calling setSessionOnAgent with sessionId:`, sessionId);
            setSessionOnAgent(ws, sessionId);
            // Don't mark as set yet - wait for RPC response
            console.log(`[WebSocket#${connId}] Waiting for RPC response to confirm session...`);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log(`[WebSocket#${connId}] Received message:`, data);

            // Handle RPC responses
            if (data.type === 'rpc_response') {
              console.log(`[WebSocket#${connId}] ✓ RPC response received:`, data);
              if (data.success) {
                console.log(`[WebSocket#${connId}] ✓ Session confirmed by server!`);
                sessionSetRef.current = true;
                setIsSessionSet(true);
              } else {
                console.error(`[WebSocket#${connId}] ✗ Session setting failed!`);
              }
              return;
            }

            // Handle errors
            if (data.type === 'error') {
              console.error(`[WebSocket#${connId}] Error from server:`, data.message);
              return;
            }

            // Handle chat message response
            if (data.type === 'chat') {
              // Structured response
              const assistantMessage: ChatMessage = {
                id: data.id || `msg-${Date.now()}-assistant`,
                role: 'assistant',
                content: data.content || data.message,
                timestamp: new Date(data.timestamp || Date.now()),
              };
              console.log(`[WebSocket#${connId}] Adding assistant message:`, assistantMessage);
              setMessages((prev) => {
                console.log(`[WebSocket#${connId}] Current messages count:`, prev.length);
                return [...prev, assistantMessage];
              });
            }
          } catch (error) {
            console.error(`[WebSocket#${connId}] Error parsing message:`, error);
          }
        };

        ws.onerror = (error) => {
          console.error(`[WebSocket#${connId}] Error:`, error);
          setStatus('error');
        };

        ws.onclose = () => {
          console.log(`[WebSocket#${connId}] Closed`);
          setStatus('disconnected');
          sessionSetRef.current = false;
          setIsSessionSet(false);

          // Auto-reconnect after 3 seconds
          if (enabled && agentPublicId && sessionId) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`[WebSocket#${connId}] Attempting to reconnect...`);
              connect();
            }, 3000);
          }
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        setStatus('error');
      }
    };

    connect();

    // Cleanup
    return () => {
      console.log('[WebSocket] Cleanup triggered');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        console.log('[WebSocket] Closing existing connection');
        wsRef.current.close();
        wsRef.current = null;
      }
      sessionSetRef.current = false;
      setIsSessionSet(false);
    };
  }, [enabled, agentPublicId, sessionId, getWebSocketUrl, setSessionOnAgent]);

  // Reset session flag when sessionId changes
  useEffect(() => {
    sessionSetRef.current = false;
    setIsSessionSet(false);
    setMessages([]); // Clear messages when switching sessions
  }, [sessionId]);

  return {
    messages,
    sendMessage,
    status,
    isConnected: status === 'connected' && isSessionSet,
    isConnecting: status === 'connecting' || (status === 'connected' && !isSessionSet),
    error: status === 'error' ? 'WebSocket connection error' : undefined,
  };
}
