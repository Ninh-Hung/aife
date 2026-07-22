/**
 * Agent Management Page
 * Main hub for managing AI agents
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bot } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAgents } from '../contexts/AgentsContext';
import { AgentCard } from '../components/agents/AgentCard';
import { AgentDrawer } from '../components/agents/AgentDrawer';
import { useSidebarConversations } from '../components/layout/useSidebarConversations';
import { Agent, CreateAgentInput } from '../types';
import { useNotification } from '../hooks/useNotification';
import { createChatSession, getCurrentSubscription } from '../services/api';

const isAnonymousLimitResponse = (response: { errorCode?: string; error?: string }) =>
  response.errorCode === 'ANONYMOUS_LIMIT_EXCEEDED' ||
  response.error === 'ANONYMOUS_LIMIT_EXCEEDED';

type AgentLimitModalState = {
  open: boolean;
  reason: 'subscription' | 'limit';
  packageName?: string;
  maxAgents?: number;
  currentAgents: number;
};

// ============================================
// Empty State Component
// ============================================

const EmptyState: React.FC<{ onCreateAgent: () => void; createDisabled?: boolean }> = ({
  onCreateAgent,
  createDisabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/50">
        <Bot className="text-indigo-600 dark:text-indigo-400" size={40} />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-slate-100">
        {t('agents.empty.title')}
      </h3>
      <p className="mb-6 max-w-md text-center text-gray-600 dark:text-slate-400">
        {t('agents.empty.description')}
      </p>
      <Button
        variant="contained"
        onClick={onCreateAgent}
        disabled={createDisabled}
        startIcon={<Plus size={18} />}
        className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
      >
        {t('agents.empty.createFirst')}
      </Button>
    </div>
  );
};

// ============================================
// Agent Management Page Component
// ============================================

export const AgentManagement: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    setDefaultAgent,
  } = useAgents();
  const { success, error: showError } = useNotification();
  const { addOrUpdateConversation } = useSidebarConversations();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isCheckingAgentLimit, setIsCheckingAgentLimit] = useState(false);
  const [agentLimitModal, setAgentLimitModal] = useState<AgentLimitModalState>({
    open: false,
    reason: 'limit',
    currentAgents: 0,
  });

  const userCreatedAgentCount = agents.filter((a) => !a.ownerType || a.ownerType === 'USER').length;

  // ============================================
  // Handlers
  // ============================================

  const handleCreateNew = async () => {
    if (isCheckingAgentLimit) {
      return;
    }

    setIsCheckingAgentLimit(true);

    try {
      const subscriptionResponse = await getCurrentSubscription();

      if (!subscriptionResponse.success) {
        showError(subscriptionResponse.error || t('agents.errors.subscriptionCheckFailed'));
        return;
      }

      const subscription = subscriptionResponse.data;

      if (!subscription?.package) {
        setAgentLimitModal({
          open: true,
          reason: 'subscription',
          currentAgents: userCreatedAgentCount,
        });
        return;
      }

      const { maxAgents, name } = subscription.package;

      if (userCreatedAgentCount >= maxAgents) {
        setAgentLimitModal({
          open: true,
          reason: 'limit',
          packageName: name,
          maxAgents,
          currentAgents: userCreatedAgentCount,
        });
        return;
      }

      setSelectedAgent(null);
      setIsDrawerOpen(true);
    } catch (err) {
      showError(err instanceof Error ? err.message : t('agents.errors.subscriptionCheckFailed'));
    } finally {
      setIsCheckingAgentLimit(false);
    }
  };

  const handleEdit = (agent: Agent) => {
    if (agent.ownerType && agent.ownerType !== 'USER') {
      showError(t('agents.errors.editOwnOnly'));
      return;
    }
    setSelectedAgent(agent);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (agentId: string) => {
    try {
      const agent = agents.find((item) => item.publicId === agentId);
      if (agent?.ownerType && agent.ownerType !== 'USER') {
        showError(t('agents.errors.deleteOwnOnly'));
        return;
      }
      await deleteAgent(agentId);
      await fetchAgents();
      success(t('agents.messages.deleted'));
    } catch (err) {
      showError(err instanceof Error ? err.message : t('agents.errors.deleteFailed'));
    }
  };

  const handleChat = async (agent: Agent) => {
    const response = await createChatSession(
      agent.publicId,
      t('agents.chatSessionTitle', { name: agent.name })
    );
    if (response.success && response.data) {
      addOrUpdateConversation(response.data);
      navigate(`/chat/${response.data.id}`);
    } else if (isAnonymousLimitResponse(response)) {
      return;
    } else {
      showError(response.error || t('agents.errors.createChatFailed'));
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedAgent(null);
  };

  const handleCloseAgentLimitModal = () => {
    setAgentLimitModal((prev) => ({ ...prev, open: false }));
  };

  const handleViewPlans = () => {
    handleCloseAgentLimitModal();
    navigate('/subscription');
  };

  const handleSaveAgent = async (input: CreateAgentInput) => {
    // AgentDrawer handles the error display and drawer closing
    await createAgent(input);
    await fetchAgents();
  };

  const handleUpdateAgent = async (id: string, input: Partial<CreateAgentInput>) => {
    // AgentDrawer handles the error display and drawer closing
    await updateAgent(id, input);
    await fetchAgents();
  };

  const handleSetDefault = async (publicId: string) => {
    try {
      const agent = agents.find((item) => item.publicId === publicId);
      if (agent?.ownerType && agent.ownerType !== 'USER') {
        showError(t('agents.errors.defaultOwnOnly'));
        return;
      }
      await setDefaultAgent(publicId);
      success(t('agents.messages.defaultUpdated'));
    } catch (err) {
      showError(err instanceof Error ? err.message : t('agents.errors.setDefaultFailed'));
    }
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
              {t('agents.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{t('agents.subtitle')}</p>
          </div>
          <Button
            variant="contained"
            onClick={handleCreateNew}
            disabled={isCheckingAgentLimit}
            startIcon={<Plus size={20} />}
            className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5,
            }}
          >
            {t('agents.createNew')}
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400"></div>
              <p className="text-sm text-gray-600 dark:text-slate-400">{t('agents.loading')}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Agent Grid or Empty State */}
        {!loading && !error && agents.length === 0 && (
          <EmptyState onCreateAgent={handleCreateNew} createDisabled={isCheckingAgentLimit} />
        )}

        {!loading && !error && agents.length > 0 && (
          <>
            {/* Stats Summary */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  {t('agents.stats.totalAgents')}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {agents.length}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  {t('agents.stats.customAgents')}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {agents.filter((a) => !a.ownerType || a.ownerType === 'USER').length}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  {t('agents.stats.totalKnowledge')}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {agents.reduce(
                    (sum, a) => sum + (a.knowledgeCount ?? a.knowledgeIds?.length ?? 0),
                    0
                  )}
                </p>
              </div>
            </div>

            {/* Agent Cards Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onChat={handleChat}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          </>
        )}

        {/* Agent Drawer */}
        <AgentDrawer
          open={isDrawerOpen}
          onClose={handleCloseDrawer}
          onSave={handleSaveAgent}
          agent={selectedAgent}
          onUpdate={handleUpdateAgent}
        />

        <Dialog
          open={agentLimitModal.open}
          onClose={handleCloseAgentLimitModal}
          fullWidth
          maxWidth="xs"
          PaperProps={{ sx: { borderRadius: '12px' } }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>
            {agentLimitModal.reason === 'subscription'
              ? t('agents.limit.subscriptionRequiredTitle')
              : t('agents.limit.reachedTitle')}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
              {agentLimitModal.reason === 'subscription'
                ? t('agents.limit.subscriptionRequiredMessage')
                : t('agents.limit.reachedMessage', {
                    packageName: agentLimitModal.packageName,
                    maxAgents: agentLimitModal.maxAgents,
                    currentAgents: agentLimitModal.currentAgents,
                  })}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseAgentLimitModal} size="small">
              {t('common.close')}
            </Button>
            <Button onClick={handleViewPlans} variant="contained" size="small">
              {t('agents.limit.viewPlans')}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};
