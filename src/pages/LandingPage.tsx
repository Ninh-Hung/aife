/**
 * Landing Page - AppAIHelp.com
 * Minimal chat-centric layout for unauthenticated users.
 * Mirrors the clean aesthetic of ChatGPT / Claude home screens.
 */

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SignInModal } from '../components/auth/SignInModal';
import { ChatInputScreen } from '../components/chat/ChatInputScreen';

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

  // Any interaction with the chat input opens the sign-in modal
  // (user must authenticate before sending messages)
  const handleSend = (_message: string, _image?: File) => {
    setIsSignInModalOpen(true);
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
