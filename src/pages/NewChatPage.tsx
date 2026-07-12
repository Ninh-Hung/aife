/**
 * NewChatPage
 * Authenticated "start a new chat" screen — mirrors the landing page layout
 * but lives inside the main Layout (with sidebar).
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatInputScreen } from '../components/chat/ChatInputScreen';
import { useAgents } from '../contexts/AgentsContext';
import { useNotification } from '../hooks/useNotification';
import { createChatSession, listAgents } from '../services/api';
import type { Agent, ChatSession } from '../types';

const NewChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { agents, loading } = useAgents();
  const { error: showError } = useNotification();
  const [isStartingChat, setIsStartingChat] = useState(false);

  const resolveAgent = async (selectedAgent?: Agent | null): Promise<Agent | null> => {
    if (selectedAgent) {
      return selectedAgent;
    }

    // Pick the default agent, otherwise fall back to the first available one
    const contextAgent = agents.find((a) => a.isDefault) ?? agents[0];
    if (contextAgent) {
      return contextAgent;
    }

    const response = await listAgents();
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to load agents');
    }

    return response.data.find((a) => a.isDefault) ?? response.data[0] ?? null;
  };

  const handleSend = async (message: string, file?: File, selectedAgent?: Agent | null) => {
    if (!message.trim() || isStartingChat || loading) return;

    setIsStartingChat(true);
    try {
      const agent = await resolveAgent(selectedAgent);

      if (!agent) {
        const sessionResponse = await createChatSession(null, 'New Chat', { temporary: true });

        if (!sessionResponse.success || !sessionResponse.data) {
          throw new Error(sessionResponse.error || 'Failed to create chat session');
        }

        navigate(`/chat/${sessionResponse.data.id}`, {
          state: { initialMessage: message, initialFile: file ?? null },
        });
        return;
      }

      const sessionResponse = await createChatSession(agent.publicId, `Chat with ${agent.name}`);

      if (!sessionResponse.success || !sessionResponse.data) {
        throw new Error(sessionResponse.error || 'Failed to create chat session');
      }

      const session = sessionResponse.data as ChatSession & {
        publicId?: string;
      };
      const sessionId = session.publicId;

      if (!sessionId) {
        throw new Error('Created chat session is missing publicId');
      }

      // Navigate inside the protected layout so the global sidebar stays mounted.
      navigate(`/chat/${sessionId}`, {
        state: { initialMessage: message, initialFile: file ?? null },
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to start chat');
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-[#0A1628]">
      <ChatInputScreen
        heading="What can I help you with?"
        placeholder="Ask me anything..."
        onSend={handleSend}
        isSubmitting={isStartingChat || loading}
      />
    </div>
  );
};

export default NewChatPage;
