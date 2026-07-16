/**
 * Main Application Entry Point
 * Integrates all providers, routing, and core features
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { ApiKeyManagement } from './pages/ApiKeyManagement';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { AgentManagement } from './pages/AgentManagement';
import { ChatScreen } from './pages/ChatScreen';
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
} from 'lucide-react';
import { CreateAgentInput } from './types';
import { useQuotaErrorHandler } from './hooks/useQuotaErrorHandler';
import { UpgradeModal } from './components/subscription';

// ============================================
// Root Route: redirects authenticated users to /new-chat
// ============================================

const RootRoute: React.FC = () => {
  const { isAuthenticated, isAnonymous, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-teal-500 border-r-transparent"></div>
          <p className="text-gray-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !isAnonymous) {
    return <Navigate to="/new-chat" replace />;
  }

  return <LandingPage />;
};

// ============================================
// Main App Component (with contexts)
// ============================================

const AppContent: React.FC = () => {
  const { agents, createAgent } = useAgents();
  const { user } = useAuth();
  const [isAgentDrawerOpen, setIsAgentDrawerOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    agents.find((a) => a.isDefault)?.id || agents[0]?.id || ''
  );
  const location = useLocation();
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

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  const handleSaveAgent = async (input: CreateAgentInput) => {
    await createAgent(input);
  };

  // Determine header content based on route
  const getHeader = () => {
    switch (location.pathname) {
      case '/translate':
        return (
          <Header
            title="AI Translation"
            subtitle="Powered by Advanced Neural Networks"
            icon={<Bot className="text-white" size={24} />}
            agents={agents}
            selectedAgentId={selectedAgentId}
            onAgentChange={handleAgentChange}
          />
        );
      case '/dashboard':
        return (
          <Header
            title="Dashboard"
            subtitle="Overview of your activity"
            icon={<LayoutDashboard className="text-white" size={24} />}
          />
        );
      case '/agents':
        return (
          <Header
            title="My Agents"
            subtitle="Manage your AI agents"
            icon={<Users className="text-white" size={24} />}
          />
        );
      case '/subscription':
        return (
          <Header
            title="Subscription"
            subtitle="Manage your plan and billing"
            icon={<CreditCard className="text-white" size={24} />}
          />
        );
      case '/code':
        return (
          <Header
            title="Generate Code"
            subtitle="AI-powered code generation"
            icon={<Code className="text-white" size={24} />}
          />
        );
      case '/image':
        return (
          <Header
            title="Generate Picture"
            subtitle="AI image creation"
            icon={<ImageIcon className="text-white" size={24} />}
          />
        );
      case '/api-keys':
        return (
          <Header
            title="API Keys"
            subtitle="Manage your API authentication tokens"
            icon={<KeyRound className="text-white" size={24} />}
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
                  <Route path="/chat/:sessionId" element={<ChatScreen />} />
                  <Route path="/subscription" element={<SubscriptionPage />} />
                  <Route
                    path="/code"
                    element={
                      <div className="p-8 text-gray-900 dark:text-slate-100">
                        Generate Code - Coming Soon
                      </div>
                    }
                  />
                  <Route
                    path="/image"
                    element={
                      <div className="p-8 text-gray-900 dark:text-slate-100">
                        Generate Picture - Coming Soon
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
