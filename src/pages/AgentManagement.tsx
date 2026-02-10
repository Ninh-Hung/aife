/**
 * Agent Management Page
 * Main hub for managing AI agents
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bot } from 'lucide-react';
import { Button } from '@mui/material';
import { useAgents } from '../contexts/AgentsContext';
import { AgentCard } from '../components/agents/AgentCard';
import { AgentDrawer } from '../components/agents/AgentDrawer';
import { Agent, CreateAgentInput } from '../types';
import { useNotification } from '../hooks/useNotification';

// ============================================
// Empty State Component
// ============================================

const EmptyState: React.FC<{ onCreateAgent: () => void }> = ({ onCreateAgent }) => {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/50">
        <Bot className="text-indigo-600 dark:text-indigo-400" size={40} />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-slate-100">
        No agents found
      </h3>
      <p className="mb-6 max-w-md text-center text-gray-600 dark:text-slate-400">
        Get started by creating your first AI agent. Customize its behavior, creativity level, and
        personality to suit your needs.
      </p>
      <Button
        variant="contained"
        onClick={onCreateAgent}
        startIcon={<Plus size={18} />}
        className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
      >
        Create Your First Agent
      </Button>
    </div>
  );
};

// ============================================
// Agent Management Page Component
// ============================================

export const AgentManagement: React.FC = () => {
  const navigate = useNavigate();
  const { agents, loading, error, createAgent, updateAgent, deleteAgent } = useAgents();
  const { success, error: showError } = useNotification();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // ============================================
  // Handlers
  // ============================================

  const handleCreateNew = () => {
    setSelectedAgent(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (agentId: string) => {
    try {
      await deleteAgent(agentId);
      success('Agent deleted successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete agent');
    }
  };

  const handleChat = (agent: Agent) => {
    // Use publicId for Durable Object instance identification
    navigate(`/chat/${agent.publicId}`);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedAgent(null);
  };

  const handleSaveAgent = async (input: CreateAgentInput) => {
    // AgentDrawer handles the error display and drawer closing
    // Just pass through to createAgent
    await createAgent(input);
  };

  const handleUpdateAgent = async (id: string, input: Partial<CreateAgentInput>) => {
    // AgentDrawer handles the error display and drawer closing
    // Just pass through to updateAgent
    await updateAgent(id, input);
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">My Agents</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Create and manage your custom AI personas for different tasks
            </p>
          </div>
          <Button
            variant="contained"
            onClick={handleCreateNew}
            startIcon={<Plus size={20} />}
            className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5,
            }}
          >
            Create New Agent
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400"></div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Loading agents...</p>
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
          <EmptyState onCreateAgent={handleCreateNew} />
        )}

        {!loading && !error && agents.length > 0 && (
          <>
            {/* Stats Summary */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Total Agents
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {agents.length}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Custom Agents
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {agents.filter((a) => !a.isDefault).length}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Total Capabilities
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {agents.reduce((sum, a) => sum + (a.capabilityCount ?? a.capabilityIds?.length ?? 0), 0)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Total Knowledge
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {agents.reduce((sum, a) => sum + (a.knowledgeCount ?? a.knowledgeIds?.length ?? 0), 0)}
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
      </div>
    </div>
  );
};
