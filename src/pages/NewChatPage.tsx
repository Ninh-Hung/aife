/**
 * NewChatPage
 * Authenticated "start a new chat" screen — mirrors the landing page layout
 * but lives inside the main Layout (with sidebar).
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatInputScreen } from '../components/chat/ChatInputScreen';
import { MatrixRainBackground } from '../components/common/MatrixRainBackground';
import { useAgents } from '../contexts/AgentsContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { useStoredChatExecutionMode } from '../hooks/useStoredChatExecutionMode';
import { useSidebarConversations } from '../components/layout/useSidebarConversations';
import { createChatSession, listAgents } from '../services/api';
import type { Agent, ChatSession } from '../types';
import type { ChatExecutionMode } from '../hooks/useChatAgent';

const isAnonymousLimitResponse = (response: { errorCode?: string; error?: string }) =>
  response.errorCode === 'ANONYMOUS_LIMIT_EXCEEDED' ||
  response.error === 'ANONYMOUS_LIMIT_EXCEEDED';

const NewChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { agents, loading } = useAgents();
  const { isAnonymous } = useAuth();
  const { error: showError } = useNotification();
  const { addOrUpdateConversation } = useSidebarConversations();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [executionMode, setExecutionMode] = useStoredChatExecutionMode();

  const resolveAgent = async (selectedAgent?: Agent | null): Promise<Agent | null> => {
    if (selectedAgent && agents.some((agent) => agent.publicId === selectedAgent.publicId)) {
      return selectedAgent;
    }

    // Pick the default agent, otherwise fall back to the first available one
    const contextAgent = agents.find((a) => a.isDefault) ?? agents[0];
    if (contextAgent) {
      return contextAgent;
    }

    const response = await listAgents();
    if (!response.success || !response.data) {
      return null;
    }

    return response.data.find((a) => a.isDefault) ?? response.data[0] ?? null;
  };

  const handleSend = async (
    message: string,
    files?: File[],
    selectedAgent?: Agent | null,
    mode: ChatExecutionMode = executionMode
  ) => {
    if (!message.trim() || isStartingChat || loading) return;

    const file = files?.[0] ?? null;
    setExecutionMode(mode);
    setIsStartingChat(true);
    try {
      const agent = await resolveAgent(selectedAgent);

      if (!agent) {
        const sessionResponse = await createChatSession(null, 'New Chat');

        if (!sessionResponse.success || !sessionResponse.data) {
          if (isAnonymousLimitResponse(sessionResponse)) {
            return;
          }
          throw new Error(sessionResponse.error || 'Failed to create chat session');
        }

        addOrUpdateConversation(sessionResponse.data);

        navigate(`/chat/${sessionResponse.data.id}`, {
          state: { initialMessage: message, initialFile: file ?? null, initialMode: mode },
        });
        return;
      }

      const sessionResponse = await createChatSession(agent.publicId, `Chat with ${agent.name}`);

      if (!sessionResponse.success || !sessionResponse.data) {
        if (isAnonymousLimitResponse(sessionResponse)) {
          return;
        }
        throw new Error(sessionResponse.error || 'Failed to create chat session');
      }

      const session = sessionResponse.data as ChatSession & {
        publicId?: string;
      };
      const sessionId = session.publicId;

      if (!sessionId) {
        throw new Error('Created chat session is missing publicId');
      }

      addOrUpdateConversation(session);

      // Navigate inside the protected layout so the global sidebar stays mounted.
      navigate(`/chat/${sessionId}`, {
        state: { initialMessage: message, initialFile: file ?? null, initialMode: mode },
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to start chat');
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleStartRealtimeVoice = async (
    selectedAgent?: Agent | null,
    mode: ChatExecutionMode = executionMode
  ) => {
    if (isStartingChat || loading) return;

    setExecutionMode(mode);
    setIsStartingChat(true);
    try {
      const agent = await resolveAgent(selectedAgent);
      const sessionResponse = agent
        ? await createChatSession(agent.publicId, `Chat with ${agent.name}`)
        : await createChatSession(null, 'New Chat');

      if (!sessionResponse.success || !sessionResponse.data) {
        if (isAnonymousLimitResponse(sessionResponse)) {
          return;
        }
        throw new Error(sessionResponse.error || 'Failed to create chat session');
      }

      const session = sessionResponse.data as ChatSession & {
        publicId?: string;
      };
      const sessionId = session.publicId;

      if (!sessionId) {
        throw new Error('Created chat session is missing publicId');
      }

      addOrUpdateConversation(session);

      navigate(`/chat/${sessionId}`, {
        state: { initialMode: mode, initialStartRealtimeVoice: true },
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to start realtime voice chat');
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div className="dark relative flex h-full min-h-screen items-center justify-center overflow-hidden bg-[#07111f] px-4 text-white">
      <MatrixRainBackground />
      <div className="relative z-10 w-full">
        <ChatInputScreen
          onSend={handleSend}
          isSubmitting={isStartingChat || loading}
          executionMode={executionMode}
          onExecutionModeChange={setExecutionMode}
          voiceInputEnabled={!isAnonymous}
          onStartRealtimeVoice={isAnonymous ? undefined : handleStartRealtimeVoice}
          multipleAttachments={false}
        />
      </div>
    </div>
  );
};

export default NewChatPage;
