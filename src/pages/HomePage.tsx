/**
 * Home Page - AppAIHelp.com
 * Main chat-centric home screen for unauthenticated users.
 * Mirrors the clean aesthetic of ChatGPT / Claude home screens.
 * Supports anonymous chat - users can start chatting without signing in.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SignInModal } from '../components/auth/SignInModal';
import { ChatInputScreen } from '../components/chat/ChatInputScreen';
import { MatrixRainBackground } from '../components/common/MatrixRainBackground';
import { getRandomChatSuggestions } from '../components/chat/chatInputContent';
import { createChatSession } from '../services/api';
import { useAgents } from '../contexts/AgentsContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
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
// Main Home Page Component
// ============================================

const HomePage: React.FC = () => {
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
  const { ensureAnonymousSession } = useAuth();
  const { error: showError } = useNotification();
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
    files?: File[],
    _agent?: unknown,
    mode: ChatExecutionMode = executionMode
  ) => {
    if (!message.trim()) return;

    const image = files?.[0] ?? null;
    setExecutionMode(mode);
    try {
      const activeUser = await ensureAnonymousSession();
      const isGuest =
        activeUser.authProvider === 'ANONYMOUS' ||
        activeUser.email.endsWith('@anonymous.appaihelp.local') ||
        activeUser.userName.startsWith('anon_');

      // Get default agent or first available agent
      const defaultAgent = isGuest ? null : (agents.find((a) => a.isDefault) ?? agents[0]);

      const sessionResponse = await createChatSession(
        defaultAgent ? defaultAgent.publicId || defaultAgent.id : null,
        'New Chat'
      );

      if (!sessionResponse.success || !sessionResponse.data) {
        console.error('Failed to create session:', sessionResponse.error);
        if (isAnonymousLimitResponse(sessionResponse)) {
          return;
        }

        showError(sessionResponse.error || 'Failed to start guest chat. Please try again.');
        return;
      }

      // Navigate to chat screen. ChatScreen sends the first message through AgentDO.
      navigate(`/chat/${sessionResponse.data.id}`, {
        state: { initialMessage: message, initialFile: image ?? null, initialMode: mode },
      });
    } catch (error) {
      console.error('Error starting anonymous chat:', error);
      if (isAnonymousLimitError(error)) {
        return;
      }

      showError(
        error instanceof Error ? error.message : 'Failed to start guest chat. Please try again.'
      );
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#07111f] text-white">
      <MatrixRainBackground />

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="relative z-10 flex flex-shrink-0 items-center justify-between px-6 py-4">
        {/* Logo + App name */}
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-base font-semibold text-white">AppAIHelp</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openSignInModal}
            className="rounded-lg border border-slate-600 px-4 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-400 hover:text-white"
          >
            Sign in
          </button>
          <Link
            to="/landing"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            Overview
          </Link>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 items-center justify-center pb-16 pt-4">
        <ChatInputScreen
          onSend={handleSend}
          suggestions={suggestions}
          executionMode={executionMode}
          onExecutionModeChange={setExecutionMode}
          multipleAttachments={false}
        />
      </main>

      <p className="relative z-10 px-6 pb-4 text-center text-xs italic text-slate-400">
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

export default HomePage;
