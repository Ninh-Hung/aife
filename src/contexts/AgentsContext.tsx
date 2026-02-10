/**
 * Agents Context
 * Manages AI agents state and operations
 * Refactored to support capability-driven, data-driven architecture
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Agent, CreateAgentInput } from '../types';
import * as agentApi from '../services/api';

// ============================================
// Context Interface
// ============================================

interface AgentsContextValue {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  createAgent: (input: CreateAgentInput) => Promise<Agent>;
  updateAgent: (id: string, input: Partial<CreateAgentInput>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
}

// ============================================
// Context Creation
// ============================================

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined);

// ============================================
// Custom Hook
// ============================================

export const useAgents = (): AgentsContextValue => {
  const context = useContext(AgentsContext);
  if (!context) {
    throw new Error('useAgents must be used within AgentsProvider');
  }
  return context;
};

// ============================================
// Mock Default Agents (Updated Structure)
// ============================================

const defaultAgents: Agent[] = [];

// ============================================
// Agents Provider Component
// ============================================

interface AgentsProviderProps {
  children: React.ReactNode;
}

export const AgentsProvider: React.FC<AgentsProviderProps> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Fetch Agents
  // ============================================

  const fetchAgents = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await agentApi.listAgents();

      if (response.success && response.data) {
        setAgents(response.data);
      } else {
        // Use message field for user-friendly error, fallback to error field
        setError(response.message || response.error || 'Failed to load agents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Fetch agents on mount
  // ============================================

  useEffect(() => {
    fetchAgents();
  }, []);

  // ============================================
  // Agent Operations
  // ============================================

  const createAgent = async (input: CreateAgentInput): Promise<Agent> => {
    const response = await agentApi.createAgent(input);

    if (!response.success || !response.data) {
      // Use message field for user-friendly error, fallback to error field, then generic message
      throw new Error(response.message || response.error || 'Failed to create agent');
    }

    const newAgent = response.data;
    setAgents((prev) => [...prev, newAgent]);
    return newAgent;
  };

  const updateAgent = async (id: string, input: Partial<CreateAgentInput>): Promise<void> => {
    const response = await agentApi.updateAgent(id, input);

    if (!response.success) {
      // Use message field for user-friendly error, fallback to error field, then generic message
      throw new Error(response.message || response.error || 'Failed to update agent');
    }

    // Merge the submitted fields into the existing agent entry.
    // The backend update response only returns a slim { publicId, name, targetLangs } object,
    // not the full Agent shape. Merging preserves fields like avatarUrl that are not part of
    // the response payload so the card reflects changes immediately without a full refetch.
    setAgents((prev) =>
      prev.map((agent) => (agent.id === id ? { ...agent, ...input } : agent))
    );
  };

  const deleteAgent = async (id: string): Promise<void> => {
    const response = await agentApi.deleteAgent(id);

    if (!response.success) {
      // Use message field for user-friendly error, fallback to error field, then generic message
      throw new Error(response.message || response.error || 'Failed to delete agent');
    }

    setAgents((prev) => prev.filter((agent) => agent.id !== id));
  };

  const contextValue: AgentsContextValue = {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
  };

  return <AgentsContext.Provider value={contextValue}>{children}</AgentsContext.Provider>;
};
