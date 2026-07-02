/**
 * Main Layout Component
 * Combines Header and Sidebar with main content area
 * Responsive: Desktop sidebar / Mobile drawer
 */

import React, { useState } from 'react';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { useAuth } from '../../contexts/AuthContext';
import TrialBanner from '../subscription/TrialBanner';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg')); // < 1024px
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleMobileMenuOpen = () => {
    setIsMobileDrawerOpen(true);
  };

  const handleMobileMenuClose = () => {
    setIsMobileDrawerOpen(false);
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
      {/* Desktop: Fixed Full-Height Sidebar (hidden on mobile) */}
      {!isMobile && (
        <Sidebar
          user={user}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      )}

      {/* Mobile: Drawer Navigation */}
      {isMobile && (
        <>
          <MobileHeader user={user} onMenuClick={handleMobileMenuOpen} />
          <Drawer
            anchor="left"
            open={isMobileDrawerOpen}
            onClose={handleMobileMenuClose}
            ModalProps={{
              keepMounted: true, // Better mobile performance
            }}
            PaperProps={{
              className: 'w-64',
            }}
          >
            <Sidebar
              user={user}
              isCollapsed={false}
              onToggleCollapse={() => {}} // No-op for drawer
              isMobileDrawer={true}
              onNavigate={handleMobileMenuClose}
            />
          </Drawer>
        </>
      )}

      {/* Main Content Area - Positioned to the right of sidebar (desktop) or full width (mobile) */}
      <Box
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${
          isMobile ? 'pt-16' : isSidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {/* Header - Sticky at top of content area (desktop only, mobile has MobileHeader) */}
        {!isMobile && header}

        {/* Trial Banner - Shows when trial is expiring soon */}
        <Box className="p-4">
          <TrialBanner />
        </Box>

        {/* Page Content */}
        <Box className="flex-1">{children}</Box>
      </Box>
    </Box>
  );
};
