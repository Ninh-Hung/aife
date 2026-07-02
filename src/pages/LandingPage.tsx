/**
 * Landing Page - AppAIHelp.com
 * Minimal chat-centric layout for unauthenticated users.
 * Mirrors the clean aesthetic of ChatGPT / Claude home screens.
 * Supports anonymous chat - users can start chatting without signing in.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { SignInModal } from '../components/auth/SignInModal';
import { ChatInputScreen } from '../components/chat/ChatInputScreen';
import { createChatSession, sendChatMessage } from '../services/api';
import { useAgents } from '../contexts/AgentsContext';

// ============================================
// Suggestion chips shown below the input
// ============================================

const SUGGESTIONS = [
  'Translate a paragraph',
  'Summarize an article',
  'Help me write an email',
  'Explain a concept',
];

// ============================================
// Main Landing Page Component
// ============================================

const LandingPage: React.FC = () => {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const navigate = useNavigate();
  const { agents } = useAgents();

  // Handle anonymous chat - create session and send first message
  const handleSend = async (message: string, _image?: File) => {
    if (!message.trim()) return;

    try {

      // Get default agent or first available agent
      const defaultAgent = agents.find((a) => a.isDefault) ?? agents[0];

      if (!defaultAgent) {
        console.error('No agents available');
        // Fallback to login if no agents available
        setIsSignInModalOpen(true);
        return;
      }

      // Create anonymous chat session
      const sessionResponse = await createChatSession(defaultAgent.id, 'New Chat');

      if (!sessionResponse.success || !sessionResponse.data) {
        console.error('Failed to create session:', sessionResponse.error);
        setIsSignInModalOpen(true);
        return;
      }

      const session = sessionResponse.data;
      // Backend returns publicId, frontend uses id
      const sessionId = (session as unknown as { publicId: string }).publicId || session.id;

      // Send the first message
      const messageResponse = await sendChatMessage(sessionId, message);

      if (!messageResponse.success) {
        console.error('Failed to send message:', messageResponse.error);
        return;
      }

      // Navigate to chat screen with the session
      navigate(`/chat/${defaultAgent.id}?session=${sessionId}`);
    } catch (error) {
      console.error('Error starting anonymous chat:', error);
      setIsSignInModalOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0A1628] text-white">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex flex-shrink-0 items-center justify-between px-6 py-4">
        {/* Logo + App name */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-semibold text-white">AppAIHelp.com</span>
        </div>

        {/* Sign In button */}
        <button
          onClick={() => setIsSignInModalOpen(true)}
          className="rounded-lg border border-slate-600 px-4 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-400 hover:text-white"
        >
          Sign in
        </button>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center pb-16 pt-4">
        <ChatInputScreen
          heading="What can I help you with?"
          placeholder="Ask me anything..."
          onSend={handleSend}
          suggestions={SUGGESTIONS}
        />
      </main>

      {/* ── Sign In Modal ───────────────────────────────────── */}
      <SignInModal isOpen={isSignInModalOpen} onClose={() => setIsSignInModalOpen(false)} />
    </div>
  );
};

export default LandingPage;
