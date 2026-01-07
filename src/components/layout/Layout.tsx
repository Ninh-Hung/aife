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
    <Box className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Full-Width Header at Top */}
      {header}

      {/* Sidebar Below Header */}
      <Sidebar
        user={user}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Content Area - Adjust margin based on sidebar state */}
      <Box
        className={`pt-16 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}
      >
        {children}
      </Box>
    </Box>
  );
};
