/**
 * Agents Context
 * Manages AI agents state and operations
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
// Mock Default Agents
// ============================================

const defaultAgents: Agent[] = [
  {
    id: 'agent-001',
    name: 'Professional Translator',
    role: 'Expert Translator',
    systemPrompt:
      'You are a professional translator with expertise in multiple languages. Provide accurate, context-aware translations while maintaining the tone and style of the original text. Ensure cultural appropriateness and natural phrasing in the target language.',
    creativityLevel: 30,
    userId: 'user-001',
    isDefault: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
  },
  {
    id: 'agent-002',
    name: 'Creative Translator',
    role: 'Creative Language Expert',
    systemPrompt:
      'You are a creative translator who excels at adapting content for different cultures. Focus on conveying the meaning and emotion of the original text while allowing for creative interpretations that resonate with the target audience.',
    creativityLevel: 75,
    userId: 'user-001',
    isDefault: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
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
      ...input,
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
