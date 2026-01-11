/**
 * Main Layout Component
 * Combines Header and Sidebar with main content area
 */

import React, { useState } from 'react';
import { Box } from '@mui/material';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

// ============================================
// Props Interface
// ============================================

interface LayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
}

// ============================================
// Layout Component
// ============================================

export const Layout: React.FC<LayoutProps> = ({ children, header }) => {
  const { user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (!user) {
    // In production, show login page or redirect
    return (
      <Box className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div>Please log in</div>
      </Box>
    );
  }

  return (
    <Box className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Fixed Full-Height Sidebar */}
      <Sidebar
        user={user}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Content Area - Positioned to the right of sidebar */}
      <Box
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {/* Header - Sticky at top of content area */}
        {header}

        {/* Page Content */}
        <Box className="flex-1">{children}</Box>
      </Box>
    </Box>
  );
};
