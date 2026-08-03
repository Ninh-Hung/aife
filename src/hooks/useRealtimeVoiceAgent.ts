import { useMemo } from 'react';
import { useVoiceAgent } from '@cloudflare/voice/react';
import type { TranscriptMessage, VoiceStatus } from '@cloudflare/voice/react';
import { getStoredAppLocale } from '../i18n/types';
import { getAccessToken } from '../lib/axios';
import type { ChatExecutionMode } from './useChatAgent';

interface UseRealtimeVoiceAgentOptions {
  conversationId: string;
  agentPublicId: string;
  sessionId: number | null;
  mode: ChatExecutionMode;
  enabled?: boolean;
}

export interface RealtimeVoiceAgentState {
  enabled: boolean;
  available: boolean;
  connected: boolean;
  status: VoiceStatus;
  transcript: TranscriptMessage[];
  interimTranscript: string | null;
  audioLevel: number;
  isMuted: boolean;
  error: string | null;
  outputDeviceError: string | null;
  lastCustomMessage: unknown;
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
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

export function useRealtimeVoiceAgent({
  conversationId,
  agentPublicId,
  sessionId,
  mode,
  enabled = true,
}: UseRealtimeVoiceAgentOptions): RealtimeVoiceAgentState {
  const serverUrl = import.meta.env.VITE_SERVER_URL || '';
  const host = normalizeAgentHost(serverUrl);
  const token = getAccessToken();
  const shouldConnect =
    enabled &&
    Boolean(token) &&
    Boolean(conversationId) &&
    Boolean(agentPublicId) &&
    sessionId !== null;

  const query = useMemo(
    () => ({
      ...(token ? { token } : {}),
      mode,
      locale: getStoredAppLocale(),
    }),
    [mode, token]
  );

  const voice = useVoiceAgent({
    agent: 'VoiceAgentDO',
    name: conversationId || 'pending',
    enabled: shouldConnect,
    preferredFormat: 'mp3',
    silenceThreshold: 0.04,
    silenceDurationMs: 650,
    interruptThreshold: 0.05,
    interruptChunks: 2,
    maxTranscriptMessages: 200,
    query,
    ...(host ? { host } : {}),
  });

  const serverError = useMemo(() => {
    if (!voice.lastCustomMessage || typeof voice.lastCustomMessage !== 'object') {
      return null;
    }

    const payload = voice.lastCustomMessage as Record<string, unknown>;
    if (payload.type !== 'voice_error') {
      return null;
    }

    return typeof payload.message === 'string'
      ? payload.message
      : typeof payload.error === 'string'
        ? payload.error
        : 'Realtime voice failed';
  }, [voice.lastCustomMessage]);

  const error = serverError || voice.error || voice.outputDeviceError;

  return {
    enabled,
    available: shouldConnect,
    connected: voice.connected,
    status: voice.status,
    transcript: voice.transcript,
    interimTranscript: voice.interimTranscript,
    audioLevel: voice.audioLevel,
    isMuted: voice.isMuted,
    error,
    outputDeviceError: voice.outputDeviceError,
    lastCustomMessage: voice.lastCustomMessage,
    startCall: voice.startCall,
    endCall: voice.endCall,
    toggleMute: voice.toggleMute,
  };
}
