import { createContext } from 'react';
import type { ChatSession } from '../../types';

export interface SidebarConversationsContextValue {
  sessions: ChatSession[];
  isLoading: boolean;
  refreshConversations: () => Promise<void>;
  addOrUpdateConversation: (session: ChatSession) => void;
  renameConversation: (sessionId: string, newTitle: string) => Promise<boolean>;
  archiveConversation: (sessionId: string) => Promise<boolean>;
  deleteConversation: (sessionId: string) => Promise<boolean>;
}

export const SidebarConversationsContext = createContext<SidebarConversationsContextValue | null>(
  null
);
