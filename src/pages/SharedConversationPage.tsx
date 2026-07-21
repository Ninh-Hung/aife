import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, CircularProgress } from '@mui/material';
import { ArrowLeft, CopyPlus, LogIn, MessageSquare, Share2 } from 'lucide-react';
import type { ChatMessage, SharedConversation } from '../types';
import { forkPublicChatShare, getPublicChatShare } from '../services/api';
import { MessageBubble } from '../components/chat/MessageBubble';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';

const toChatMessage = (message: SharedConversation['messages'][number]): ChatMessage => ({
  id: message.publicId,
  sessionId: '',
  role: message.role,
  content: message.content,
  sources: message.sources,
  attachments: message.attachments,
  timestamp: new Date(message.createdAt),
  status: 'sent',
});

export const SharedConversationPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { user, isAnonymous, isLoading: authLoading } = useAuth();
  const { error: showError, success } = useNotification();
  const [share, setShare] = useState<SharedConversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isForking, setIsForking] = useState(false);
  const messages = useMemo(() => share?.messages.map(toChatMessage) || [], [share]);
  const canContinue = Boolean(user && !isAnonymous);

  useEffect(() => {
    if (!shareToken) {
      setLoadError('Shared conversation not found');
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    void getPublicChatShare(shareToken)
      .then((response) => {
        if (cancelled) return;

        if (!response.success || !response.data) {
          setLoadError(response.error || 'Shared conversation is no longer available');
          return;
        }

        setShare(response.data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  const handleContinue = async () => {
    if (!shareToken || !canContinue) return;

    setIsForking(true);
    try {
      const response = await forkPublicChatShare(shareToken);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to continue shared conversation');
      }

      success('Conversation copied to your account');
      navigate(`/chat/${response.data.id}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to continue shared conversation');
    } finally {
      setIsForking(false);
    }
  };

  const handleSignIn = () => {
    navigate('/', { state: { authMode: 'login', returnTo: window.location.pathname } });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
              <Share2 size={14} />
              Shared conversation
            </div>
            <h1 className="truncate text-lg font-semibold">{share?.title || 'Conversation'}</h1>
          </div>
          {!authLoading && canContinue && (
            <Button
              variant="contained"
              size="small"
              startIcon={isForking ? <CircularProgress size={14} /> : <CopyPlus size={16} />}
              onClick={() => void handleContinue()}
              disabled={isForking || isLoading || Boolean(loadError)}
            >
              Continue
            </Button>
          )}
          {!authLoading && !canContinue && !loadError && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<LogIn size={16} />}
              onClick={handleSignIn}
            >
              Sign in
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {isLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <CircularProgress size={28} />
          </div>
        ) : loadError ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Alert severity="warning" className="w-full max-w-xl">
              {loadError}
            </Alert>
          </div>
        ) : (
          <>
            {!authLoading && !canContinue && (
              <Alert severity="info" className="mb-5">
                Anonymous viewers can only read this shared conversation. Sign in to continue it in
                your own account.
              </Alert>
            )}
            <div className="rounded-md border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {messages.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-8 text-center">
                  <MessageSquare size={36} className="text-gray-400 dark:text-slate-500" />
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    This shared conversation has no visible messages.
                  </p>
                </div>
              ) : (
                <div className="px-4 py-5">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      agentName="Shared assistant"
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
