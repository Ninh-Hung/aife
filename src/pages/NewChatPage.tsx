/**
 * NewChatPage
 * Authenticated "start a new chat" screen — mirrors the landing page layout
 * but lives inside the main Layout (with sidebar).
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatInputScreen } from '../components/chat/ChatInputScreen';
import { useAgents } from '../contexts/AgentsContext';

const NewChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { agents } = useAgents();

  const handleSend = (message: string, file?: File) => {
    // Pick the default agent, otherwise fall back to the first available one
    const agent = agents.find((a) => a.isDefault) ?? agents[0];

    if (!agent) {
      // No agents configured — send the user to create one
      navigate('/agents');
      return;
    }

    // Navigate to the chat screen with the initial message pre-seeded via state
    navigate(`/chat/${agent.publicId}`, {
      state: { initialMessage: message, initialFile: file ?? null },
    });
  };

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-[#0A1628]">
      <ChatInputScreen
        heading="What can I help you with?"
        placeholder="Ask me anything..."
        onSend={handleSend}
      />
    </div>
  );
};

export default NewChatPage;
