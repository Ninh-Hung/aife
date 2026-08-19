import { useEffect, useRef } from 'react';
import { getAccessToken, refreshAccessToken } from '../lib/axios';

export type ConversationTitleUpdatedEvent = {
  type: 'conversation.title_updated';
  userId: number;
  data: {
    sessionId: number;
    sessionPublicId: string;
    title: string;
    status: string;
    updatedAt: string;
    lastMessageAt: string | null;
    agentPublicId: string | null;
    agentName: string | null;
  };
};

type RealtimeEvent = ConversationTitleUpdatedEvent;

type UseChatRealtimeEventsOptions = {
  enabled: boolean;
  onConversationTitleUpdated: (event: ConversationTitleUpdatedEvent) => void;
};

const buildRealtimeUrl = (token: string) => {
  const baseUrl =
    import.meta.env.VITE_SERVER_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL('/v1/chat/realtime/ws', baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url.toString();
};

const parseRealtimeEvent = (data: unknown): RealtimeEvent | null => {
  if (typeof data !== 'string' || data === 'pong') {
    return null;
  }

  try {
    const parsed = JSON.parse(data) as Partial<RealtimeEvent>;
    return parsed.type === 'conversation.title_updated'
      ? (parsed as ConversationTitleUpdatedEvent)
      : null;
  } catch {
    return null;
  }
};

export function useChatRealtimeEvents({
  enabled,
  onConversationTitleUpdated,
}: UseChatRealtimeEventsOptions) {
  const callbackRef = useRef(onConversationTitleUpdated);

  useEffect(() => {
    callbackRef.current = onConversationTitleUpdated;
  }, [onConversationTitleUpdated]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let stopped = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let pingTimer: number | undefined;

    const clearTimers = () => {
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
      if (pingTimer !== undefined) {
        window.clearInterval(pingTimer);
        pingTimer = undefined;
      }
    };

    const connect = async () => {
      try {
        const token = getAccessToken() || (await refreshAccessToken());
        if (stopped) return;

        socket = new WebSocket(buildRealtimeUrl(token));
        socket.onopen = () => {
          if (pingTimer !== undefined) {
            window.clearInterval(pingTimer);
          }
          pingTimer = window.setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send('ping');
            }
          }, 25000);
        };
        socket.onmessage = (event) => {
          const realtimeEvent = parseRealtimeEvent(event.data);
          if (realtimeEvent?.type === 'conversation.title_updated') {
            callbackRef.current(realtimeEvent);
          }
        };
        socket.onclose = () => {
          if (pingTimer !== undefined) {
            window.clearInterval(pingTimer);
            pingTimer = undefined;
          }
          if (!stopped) {
            reconnectTimer = window.setTimeout(connect, 2000);
          }
        };
        socket.onerror = () => {
          socket?.close();
        };
      } catch {
        if (!stopped) {
          reconnectTimer = window.setTimeout(connect, 5000);
        }
      }
    };

    void connect();

    return () => {
      stopped = true;
      clearTimers();
      socket?.close();
    };
  }, [enabled]);
}
