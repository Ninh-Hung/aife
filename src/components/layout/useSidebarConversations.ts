import { useContext } from 'react';
import { SidebarConversationsContext } from './sidebarConversationsContext';

export const useSidebarConversations = () => {
  const context = useContext(SidebarConversationsContext);

  if (!context) {
    throw new Error('useSidebarConversations must be used within SidebarConversationsProvider');
  }

  return context;
};
