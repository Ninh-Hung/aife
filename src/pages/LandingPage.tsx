/**
 * Landing Page - AppAIHelp.com
 * Minimal chat-centric layout for unauthenticated users.
 * Mirrors the clean aesthetic of ChatGPT / Claude home screens.
 * Supports anonymous chat - users can start chatting without signing in.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { SignInModal } from '../components/auth/SignInModal';
import { ChatInputScreen } from '../components/chat/ChatInputScreen';
import { getRandomChatSuggestions } from '../components/chat/chatInputContent';
import { createChatSession } from '../services/api';
import { useAgents } from '../contexts/AgentsContext';
import { useStoredChatExecutionMode } from '../hooks/useStoredChatExecutionMode';
import { isAnonymousLimitError } from '../utils/error-handler';
import type { ChatExecutionMode } from '../hooks/useChatAgent';
import { AI_AGENT_WARNING_MESSAGE_KEY } from '../common/constants';

const SUGGESTION_ROTATION_MS = 6400;

const isAnonymousLimitResponse = (response: { error?: string; errorCode?: string }) =>
  response.errorCode === 'ANONYMOUS_LIMIT_EXCEEDED' ||
  response.error === 'ANONYMOUS_LIMIT_EXCEEDED' ||
  response.error === 'Anonymous session limit exceeded' ||
  response.error === 'Anonymous message limit exceeded' ||
  response.error?.toLowerCase().startsWith('guest ');

// ============================================
// Main Landing Page Component
// ============================================

const LandingPage: React.FC = () => {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const locationState = location.state as {
    authMode?: 'signin' | 'signup';
    authError?: string;
  } | null;
  const authMode = locationState?.authMode;
  const authError = locationState?.authError ?? null;
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(Boolean(authMode));
  const navigate = useNavigate();
  const { agents } = useAgents();
  const [executionMode, setExecutionMode] = useStoredChatExecutionMode();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const [suggestions, setSuggestions] = useState(() => getRandomChatSuggestions(currentLanguage));

  const openSignInModal = () => {
    navigate('/', { replace: true, state: null });
    setIsSignInModalOpen(true);
  };

  const closeSignInModal = () => {
    navigate('/', { replace: true, state: null });
    setIsSignInModalOpen(false);
  };

  useEffect(() => {
    if (authMode) {
      setIsSignInModalOpen(true);
    }
  }, [authMode]);

  useEffect(() => {
    setSuggestions((currentSuggestions) =>
      getRandomChatSuggestions(currentLanguage, 4, currentSuggestions)
    );

    const intervalId = window.setInterval(() => {
      setSuggestions((currentSuggestions) =>
        getRandomChatSuggestions(currentLanguage, 4, currentSuggestions)
      );
    }, SUGGESTION_ROTATION_MS);

    return () => window.clearInterval(intervalId);
  }, [currentLanguage]);

  // Handle anonymous chat - create session and send first message
  const handleSend = async (
    message: string,
    _image?: File,
    _agent?: unknown,
    mode: ChatExecutionMode = executionMode
  ) => {
    if (!message.trim()) return;

    setExecutionMode(mode);
    try {
      // Get default agent or first available agent
      const defaultAgent = agents.find((a) => a.isDefault) ?? agents[0];

      // Anonymous visitors already have a token-backed User from AuthContext.
      const sessionResponse = await createChatSession(
        defaultAgent ? defaultAgent.publicId || defaultAgent.id : null,
        'New Chat'
      );

      if (!sessionResponse.success || !sessionResponse.data) {
        console.error('Failed to create session:', sessionResponse.error);
        if (isAnonymousLimitResponse(sessionResponse)) {
          return;
        }

        openSignInModal();
        return;
      }

      // Navigate to chat screen. ChatScreen sends the first message through AgentDO.
      navigate(`/chat/${sessionResponse.data.id}`, {
        state: { initialMessage: message, initialMode: mode },
      });
    } catch (error) {
      console.error('Error starting anonymous chat:', error);
      if (isAnonymousLimitError(error)) {
        return;
      }

      openSignInModal();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0A1628] text-white">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex flex-shrink-0 items-center justify-between px-6 py-4">
        {/* Logo + App name */}
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-base font-semibold text-white">AppAIHelp</span>
        </div>

        {/* Sign In button */}
        <button
          onClick={openSignInModal}
          className="rounded-lg border border-slate-600 px-4 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-400 hover:text-white"
        >
          Sign in
        </button>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center pb-16 pt-4">
        <ChatInputScreen
          onSend={handleSend}
          suggestions={suggestions}
          executionMode={executionMode}
          onExecutionModeChange={setExecutionMode}
        />
      </main>

      <p className="px-6 pb-4 text-center text-xs italic text-slate-400">
        {t(AI_AGENT_WARNING_MESSAGE_KEY)}
      </p>

      {/* ── Sign In Modal ───────────────────────────────────── */}
      <SignInModal
        isOpen={isSignInModalOpen}
        initialMode={authMode === 'signup' ? 'signup' : 'signin'}
        initialError={authError}
        onClose={closeSignInModal}
      />
    </div>
  );
};

export default LandingPage;
