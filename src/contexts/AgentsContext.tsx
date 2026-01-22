/**
 * Agents Context
 * Manages AI agents state and operations
 * Refactored to support capability-driven, data-driven architecture
 */

import React, { createContext, useContext, useState } from 'react';
import { Agent, CreateAgentInput } from '../types';

// ============================================
// Context Interface
// ============================================

interface AgentsContextValue {
  agents: Agent[];
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

const defaultAgents: Agent[] = [
  {
    id: 'agent-001',
    name: 'Professional Translator',
    description: 'Expert translator with cultural awareness and context-sensitive translation capabilities',
    capabilityIds: [1], // Assuming Translation capability has ID 1
    characteristicIds: [1, 2], // Professional tone, accurate
    knowledgeIds: [],
    ownerType: 'USER',
    userId: 'user-001',
    isDefault: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    // Mock populated capabilities for display
    capabilities: [
      {
        publicId: '1',
        code: 'translation',
        name: 'Translation',
        description: 'Translate text between multiple languages',
      },
    ],
  },
  {
    id: 'agent-002',
    name: 'Creative Writer',
    description: 'Creative content generation with artistic flair and engaging storytelling',
    capabilityIds: [2], // Assuming Content Generation capability has ID 2
    characteristicIds: [3], // Creative, engaging
    knowledgeIds: [1], // Writing style guide
    ownerType: 'USER',
    userId: 'user-001',
    isDefault: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    // Mock populated capabilities for display
    capabilities: [
      {
        publicId: '2',
        code: 'content_generation',
        name: 'Content Generation',
        description: 'Generate creative and engaging content',
      },
    ],
  },
];

// ============================================
// Agents Provider Component
// ============================================

interface AgentsProviderProps {
  children: React.ReactNode;
}

export const AgentsProvider: React.FC<AgentsProviderProps> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);

  // ============================================
  // Agent Operations
  // ============================================

  const createAgent = async (input: CreateAgentInput): Promise<Agent> => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: input.name,
      description: input.description,
      capabilityIds: input.capabilityIds,
      characteristicIds: input.characteristicIds,
      knowledgeIds: input.knowledgeIds,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      userId: 'user-001', // Should come from auth context in production
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setAgents((prev) => [...prev, newAgent]);
    return newAgent;
  };

  const updateAgent = async (id: string, input: Partial<CreateAgentInput>): Promise<void> => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === id
          ? {
              ...agent,
              ...input,
              updatedAt: new Date(),
            }
          : agent
      )
    );
  };

  const deleteAgent = async (id: string): Promise<void> => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    setAgents((prev) => prev.filter((agent) => agent.id !== id));
  };

  const contextValue: AgentsContextValue = {
    agents,
    createAgent,
    updateAgent,
    deleteAgent,
  };

  return <AgentsContext.Provider value={contextValue}>{children}</AgentsContext.Provider>;
};
