import { useCallback, useMemo } from 'react';
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

const REALTIME_VOICE_UNAVAILABLE_MESSAGE =
  'Voice call is temporarily unavailable. Please try again later.';
const MICROPHONE_ACCESS_DENIED_MESSAGE = 'Microphone access was denied.';
const AUDIO_OUTPUT_UNAVAILABLE_MESSAGE =
  'Audio output is unavailable. Check your speaker or browser audio settings.';

function getErrorMessage(error: unknown): string | null {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return null;
}

export function getRealtimeVoicePublicErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return MICROPHONE_ACCESS_DENIED_MESSAGE;
  }

  const message = getErrorMessage(error);
  if (message && /microphone|permission|notallowed/i.test(message)) {
    return MICROPHONE_ACCESS_DENIED_MESSAGE;
  }

  if (message && /audio output|output device|speaker/i.test(message)) {
    return AUDIO_OUTPUT_UNAVAILABLE_MESSAGE;
  }

  return REALTIME_VOICE_UNAVAILABLE_MESSAGE;
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

    const message =
      typeof payload.message === 'string'
        ? payload.message
        : typeof payload.error === 'string'
          ? payload.error
          : 'Realtime voice failed';

    return getRealtimeVoicePublicErrorMessage(message);
  }, [voice.lastCustomMessage]);

  const outputDeviceError = voice.outputDeviceError
    ? getRealtimeVoicePublicErrorMessage(voice.outputDeviceError)
    : null;
  const error =
    serverError ||
    (voice.error ? getRealtimeVoicePublicErrorMessage(voice.error) : null) ||
    outputDeviceError;
  const startCall = useCallback(async () => {
    try {
      await voice.startCall();
    } catch (error) {
      throw new Error(getRealtimeVoicePublicErrorMessage(error));
    }
  }, [voice]);

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
    outputDeviceError,
    lastCustomMessage: voice.lastCustomMessage,
    startCall,
    endCall: voice.endCall,
    toggleMute: voice.toggleMute,
  };
}
