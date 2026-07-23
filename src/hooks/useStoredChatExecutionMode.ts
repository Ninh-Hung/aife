import { useCallback, useEffect, useState } from 'react';
import {
  CHAT_EXECUTION_MODE_VALUES,
  DEFAULT_CHAT_EXECUTION_MODE,
  LEGACY_CHAT_EXECUTION_MODE_ALIASES,
  type ChatExecutionMode,
} from '../common/chatExecutionMode';

const STORAGE_KEY = 'appaihelp-execution-mode';
const CHAT_EXECUTION_MODES = new Set<ChatExecutionMode>(CHAT_EXECUTION_MODE_VALUES);

const isChatExecutionMode = (mode: unknown): mode is ChatExecutionMode =>
  typeof mode === 'string' && CHAT_EXECUTION_MODES.has(mode as ChatExecutionMode);

export const normalizeChatExecutionMode = (mode: unknown): ChatExecutionMode => {
  if (isChatExecutionMode(mode)) {
    return mode;
  }

  if (typeof mode === 'string') {
    return LEGACY_CHAT_EXECUTION_MODE_ALIASES[mode] ?? DEFAULT_CHAT_EXECUTION_MODE;
  }

  return DEFAULT_CHAT_EXECUTION_MODE;
};

export const getStoredChatExecutionMode = (): ChatExecutionMode => {
  if (typeof window === 'undefined') {
    return DEFAULT_CHAT_EXECUTION_MODE;
  }

  try {
    return normalizeChatExecutionMode(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_CHAT_EXECUTION_MODE;
  }
};

export const setStoredChatExecutionMode = (mode: unknown): ChatExecutionMode => {
  const normalizedMode = normalizeChatExecutionMode(mode);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, normalizedMode);
    } catch {
      // Ignore storage failures so chat still works in restricted browser contexts.
    }
  }

  return normalizedMode;
};

export const useStoredChatExecutionMode = (initialMode?: unknown) => {
  const [executionMode, setExecutionModeState] = useState<ChatExecutionMode>(() =>
    initialMode === undefined
      ? getStoredChatExecutionMode()
      : normalizeChatExecutionMode(initialMode)
  );

  useEffect(() => {
    if (initialMode === undefined) {
      return;
    }

    setExecutionModeState(setStoredChatExecutionMode(normalizeChatExecutionMode(initialMode)));
  }, [initialMode]);

  const setExecutionMode = useCallback((mode: ChatExecutionMode) => {
    setExecutionModeState(setStoredChatExecutionMode(mode));
  }, []);

  return [executionMode, setExecutionMode] as const;
};
