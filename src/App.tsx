/**
 * Main Application Entry Point
 * Integrates all providers, routing, and core features
 */

import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AgentsProvider, useAgents } from './contexts/AgentsContext';
import { NotificationProvider } from './components/notifications/NotificationProvider';
import { Layout } from './components/layout/Layout';
import { Header } from './components/layout/Header';
import { TranslationPage } from './features/translate/TranslationPage';
import { AgentDrawer } from './components/agents/AgentDrawer';
import LandingPage from './pages/LandingPage';
import { EmailVerificationPending } from './pages/EmailVerificationPending';
import { EmailVerification } from './pages/EmailVerification';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { ApiKeyManagement } from './pages/ApiKeyManagement';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { AgentManagement } from './pages/AgentManagement';
import { KnowledgeManagement } from './pages/KnowledgeManagement';
import { SettingsPage } from './pages/SettingsPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { ChatScreen } from './pages/ChatScreen';
import { SharedConversationPage } from './pages/SharedConversationPage';
import NewChatPage from './pages/NewChatPage';
import { NotFoundPage } from './pages/NotFoundPage';
import {
  Bot,
  LayoutDashboard,
  Users,
  CreditCard,
  Code,
  Image as ImageIcon,
  KeyRound,
  BookOpen,
  Settings,
  MessageCircleWarning,
} from 'lucide-react';
import { CreateAgentInput } from './types';
import { useQuotaErrorHandler } from './hooks/useQuotaErrorHandler';
import { UpgradeModal } from './components/subscription';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { FeedbackDialog } from './components/feedback/FeedbackDialog';
import { mergeAnonymousSession } from './services/api';
import { ANONYMOUS_PENDING_MERGE_SESSION_STORAGE_KEY } from './contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// ============================================
// Root Route: redirects authenticated users to /new-chat
// ============================================

const RootRoute: React.FC = () => {
  const { isAuthenticated, isAnonymous, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-teal-500 border-r-transparent"></div>
          <p className="text-gray-600 dark:text-slate-400">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !isAnonymous) {
    return <Navigate to="/new-chat" replace />;
  }

  return <LandingPage />;
};

const ChatScreenRoute: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <ChatScreen key={sessionId ?? 'missing-session'} />;
};

// ============================================
// Main App Component (with contexts)
// ============================================

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { agents, createAgent } = useAgents();
  const { user, isAnonymous } = useAuth();
  const [isAgentDrawerOpen, setIsAgentDrawerOpen] = useState(false);
  const [pendingMergeSessionId, setPendingMergeSessionId] = useState<string | null>(null);
  const [isMergingAnonymousSession, setIsMergingAnonymousSession] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    agents.find((a) => a.isDefault)?.id || agents[0]?.id || ''
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { errorState, closeModal } = useQuotaErrorHandler();

  useEffect(() => {
    const defaultAgentId = agents.find((agent) => agent.isDefault)?.id || agents[0]?.id || '';

    setSelectedAgentId((currentAgentId) => {
      if (currentAgentId && agents.some((agent) => agent.id === currentAgentId)) {
        return currentAgentId;
      }

      return defaultAgentId;
    });
  }, [agents, user?.publicId]);

  const handleCreateAgent = () => {
    setIsAgentDrawerOpen(true);
  };

  const handleCloseAgentDrawer = () => {
    setIsAgentDrawerOpen(false);
  };

  const handleSaveAgent = async (input: CreateAgentInput) => {
    await createAgent(input);
  };

  useEffect(() => {
    const handlePendingMerge = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId?: string }>).detail;
      if (detail?.sessionId) {
        setPendingMergeSessionId(detail.sessionId);
      }
    };

    window.addEventListener('anonymous:merge-pending', handlePendingMerge);
    return () => {
      window.removeEventListener('anonymous:merge-pending', handlePendingMerge);
    };
  }, []);

  useEffect(() => {
    if (!user || isAnonymous) {
      return;
    }

    const storedSessionId = window.sessionStorage.getItem(
      ANONYMOUS_PENDING_MERGE_SESSION_STORAGE_KEY
    );
    if (storedSessionId) {
      setPendingMergeSessionId(storedSessionId);
    }
  }, [isAnonymous, user]);

  const handleSkipAnonymousMerge = () => {
    window.sessionStorage.removeItem(ANONYMOUS_PENDING_MERGE_SESSION_STORAGE_KEY);
    setPendingMergeSessionId(null);
  };

  const handleConfirmAnonymousMerge = async () => {
    if (!pendingMergeSessionId) return;

    setIsMergingAnonymousSession(true);
    try {
      const response = await mergeAnonymousSession(pendingMergeSessionId);
      if (!response.success || !response.data) {
        throw new Error(response.error || t('anonymousMerge.error'));
      }

      window.sessionStorage.removeItem(ANONYMOUS_PENDING_MERGE_SESSION_STORAGE_KEY);
      setPendingMergeSessionId(null);
      navigate(`/chat/${response.data.id}`, { replace: true });
    } catch (error) {
      console.error(t('anonymousMerge.error'), error);
    } finally {
      setIsMergingAnonymousSession(false);
    }
  };

  if (
    user &&
    isAnonymous &&
    location.pathname !== '/' &&
    !location.pathname.startsWith('/chat/') &&
    !location.pathname.startsWith('/share/') &&
    location.pathname !== '/email-sent' &&
    location.pathname !== '/verify-email' &&
    location.pathname !== '/auth/callback'
  ) {
    return <Navigate to="/" replace />;
  }

  // Determine header content based on route
  const getHeader = () => {
    switch (location.pathname) {
      case '/translate':
        return (
          <Header
            title={t('header.translate.title')}
            subtitle={t('header.translate.subtitle')}
            icon={<Bot className="text-white" size={24} />}
          />
        );
      case '/dashboard':
        return (
          <Header
            title={t('header.dashboard.title')}
            subtitle={t('header.dashboard.subtitle')}
            icon={<LayoutDashboard className="text-white" size={24} />}
          />
        );
      case '/agents':
        return (
          <Header
            title={t('header.agents.title')}
            subtitle={t('header.agents.subtitle')}
            icon={<Users className="text-white" size={24} />}
          />
        );
      case '/knowledge':
        return (
          <Header
            title={t('header.knowledge.title')}
            subtitle={t('header.knowledge.subtitle')}
            icon={<BookOpen className="text-white" size={24} />}
          />
        );
      case '/subscription':
        return (
          <Header
            title={t('header.subscription.title')}
            subtitle={t('header.subscription.subtitle')}
            icon={<CreditCard className="text-white" size={24} />}
          />
        );
      case '/code':
        return (
          <Header
            title={t('header.code.title')}
            subtitle={t('header.code.subtitle')}
            icon={<Code className="text-white" size={24} />}
          />
        );
      case '/image':
        return (
          <Header
            title={t('header.image.title')}
            subtitle={t('header.image.subtitle')}
            icon={<ImageIcon className="text-white" size={24} />}
          />
        );
      case '/api-keys':
        return (
          <Header
            title={t('header.apiKeys.title')}
            subtitle={t('header.apiKeys.subtitle')}
            icon={<KeyRound className="text-white" size={24} />}
          />
        );
      case '/settings':
        return (
          <Header
            title={t('settings.title')}
            subtitle={t('settings.subtitle')}
            icon={<Settings className="text-white" size={24} />}
          />
        );
      case '/feedback':
        return (
          <Header
            title={t('header.feedback.title')}
            subtitle={t('header.feedback.subtitle')}
            icon={<MessageCircleWarning className="text-white" size={24} />}
          />
        );
      default:
        // Check if it's a chat route (starts with /chat/)
        if (location.pathname.startsWith('/chat/')) {
          return null; // ChatScreen has its own header
        }
        return null;
    }
  };

  return (
    <>
      <Routes>
        {/* Root: redirects authenticated users to /new-chat, shows landing page otherwise */}
        <Route path="/" element={<RootRoute />} />

        {/* Email Verification Pending - shown after registration (no layout, not protected) */}
        <Route path="/email-sent" element={<EmailVerificationPending />} />

        {/* Email Verification Handler - processes token from email link (no layout, not protected) */}
        <Route path="/verify-email" element={<EmailVerification />} />

        {/* OAuth callback - hydrates auth state after backend sets refresh cookie */}
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />

        {/* Public shared conversation snapshot - no private layout */}
        <Route path="/share/:shareToken" element={<SharedConversationPage />} />

        {/* App routes with layout - Protected */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout header={getHeader()}>
                <Routes>
                  {/* Translation Service */}
                  <Route
                    path="/translate"
                    element={
                      <TranslationPage
                        agents={agents}
                        onCreateAgent={handleCreateAgent}
                        selectedAgentId={selectedAgentId}
                      />
                    }
                  />

                  {/* New Chat */}
                  <Route path="/new-chat" element={<NewChatPage />} />

                  {/* Dashboard Page */}
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* API Key Management */}
                  <Route path="/api-keys" element={<ApiKeyManagement />} />

                  <Route path="/agents" element={<AgentManagement />} />
                  <Route path="/knowledge" element={<KnowledgeManagement />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/chat/:sessionId" element={<ChatScreenRoute />} />
                  <Route path="/subscription" element={<SubscriptionPage />} />
                  <Route
                    path="/code"
                    element={
                      <div className="p-8 text-gray-900 dark:text-slate-100">
                        {t('header.code.title')} - {t('common.comingSoon')}
                      </div>
                    }
                  />
                  <Route
                    path="/image"
                    element={
                      <div className="p-8 text-gray-900 dark:text-slate-100">
                        {t('header.image.title')} - {t('common.comingSoon')}
                      </div>
                    }
                  />

                  {/* 404 Not Found */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>

                {/* Agent Drawer - Global component */}
                <AgentDrawer
                  open={isAgentDrawerOpen}
                  onClose={handleCloseAgentDrawer}
                  onSave={handleSaveAgent}
                />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Global Upgrade Modal - Triggered by quota errors */}
      <UpgradeModal
        open={errorState.isOpen}
        onClose={closeModal}
        title={errorState.title}
        message={errorState.message}
        upgradeUrl={errorState.upgradeUrl}
        remainingTokens={errorState.remainingTokens}
        quotaLimit={errorState.quotaLimit}
        isAnonymousLimit={errorState.isAnonymousLimit}
      />
      <ConfirmDialog
        open={Boolean(pendingMergeSessionId) && Boolean(user) && !isAnonymous}
        title={t('anonymousMerge.title')}
        message={t('anonymousMerge.message')}
        confirmText={t('anonymousMerge.confirm')}
        cancelText={t('anonymousMerge.cancel')}
        loading={isMergingAnonymousSession}
        onClose={handleSkipAnonymousMerge}
        onConfirm={() => void handleConfirmAnonymousMerge()}
      />
      <FeedbackDialog />
    </>
  );
};

// ============================================
// Root App Component (with all providers)
// ============================================

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <AgentsProvider>
              <AppContent />
            </AgentsProvider>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
