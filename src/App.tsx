/**
 * Main Application Entry Point
 * Integrates all providers, routing, and core features
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AgentsProvider, useAgents } from './contexts/AgentsContext';
import { Layout } from './components/layout/Layout';
import { Header } from './components/layout/Header';
import { TranslationPage } from './features/translate/TranslationPage';
import { AgentDrawer } from './components/agents/AgentDrawer';
import LandingPage from './pages/LandingPage';
import { EmailVerificationPending } from './pages/EmailVerificationPending';
import { EmailVerification } from './pages/EmailVerification';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Bot, LayoutDashboard, Users, CreditCard, Code, Image as ImageIcon } from 'lucide-react';

// ============================================
// Main App Component (with contexts)
// ============================================

const AppContent: React.FC = () => {
  const { agents, createAgent } = useAgents();
  const [isAgentDrawerOpen, setIsAgentDrawerOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    agents.find((a) => a.isDefault)?.id || agents[0]?.id || ''
  );
  const location = useLocation();

  const handleCreateAgent = () => {
    setIsAgentDrawerOpen(true);
  };

  const handleCloseAgentDrawer = () => {
    setIsAgentDrawerOpen(false);
  };

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
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
      default:
        return null;
    }
  };

  return (
    <>
      <Routes>
        {/* Landing Page (no layout) */}
        <Route path="/" element={<LandingPage />} />

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

                  {/* Placeholder routes for other pages */}
                  <Route
                    path="/dashboard"
                    element={
                      <div className="p-8 text-gray-900 dark:text-slate-100">Dashboard - Coming Soon</div>
                    }
                  />
                  <Route
                    path="/agents"
                    element={
                      <div className="p-8 text-gray-900 dark:text-slate-100">My Agents - Coming Soon</div>
                    }
                  />
                  <Route
                    path="/subscription"
                    element={
                      <div className="p-8 text-gray-900 dark:text-slate-100">Subscription - Coming Soon</div>
                    }
                  />
                  <Route
                    path="/code"
                    element={
                      <div className="p-8 text-gray-900 dark:text-slate-100">Generate Code - Coming Soon</div>
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
                  <Route
                    path="*"
                    element={
                      <div className="p-8 text-gray-900 dark:text-slate-100">404 - Page Not Found</div>
                    }
                  />
                </Routes>

                {/* Agent Drawer - Global component */}
                <AgentDrawer
                  open={isAgentDrawerOpen}
                  onClose={handleCloseAgentDrawer}
                  onSave={createAgent}
                />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
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
          <AgentsProvider>
            <AppContent />
          </AgentsProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
