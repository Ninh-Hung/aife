/**
 * Main Sidebar Component
 * Features: Logo, Navigation, Services, Dark Mode Toggle, User Profile
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  ListItemButton,
  Avatar,
  Divider,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Languages,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  KeyRound,
  SquarePen,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';
import { ChatSessionsList } from '../chat/ChatSessionsList';
import { useSidebarConversations } from './useSidebarConversations';

// ============================================
// Props Interface
// ============================================

interface SidebarProps {
  user: User;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileDrawer?: boolean; // If true, render as drawer content (no fixed positioning)
  onNavigate?: () => void; // Callback when navigation item is clicked (for closing drawer)
}

// ============================================
// Navigation Configuration
// ============================================

const profileMenuItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { id: 'agents', label: 'My Agents', path: '/agents', Icon: Users },
  { id: 'api-keys', label: 'API Keys', path: '/api-keys', Icon: KeyRound },
  { id: 'subscription', label: 'Subscription', path: '/subscription', Icon: CreditCard },
  {
    id: 'translate',
    label: 'Multilanguage',
    path: '/translate',
    Icon: Languages,
  },
];

// ============================================
// Sidebar Component
// ============================================

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  isCollapsed,
  onToggleCollapse,
  isMobileDrawer = false,
  onNavigate,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { sessions, isLoading, renameConversation, archiveConversation, deleteConversation } =
    useSidebarConversations();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);
  const activeSessionId = location.pathname.startsWith('/chat/')
    ? location.pathname.split('/chat/')[1]?.split('/')[0]
    : undefined;

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    navigate(`/chat/${sessionId}`);
    handleNavigation();
  };

  const handleNewChat = () => {
    navigate('/new-chat');
    handleNavigation();
  };

  const handleArchive = async (sessionId: string) => {
    const wasActive = activeSessionId === sessionId;
    const success = await archiveConversation(sessionId);

    if (success && wasActive) {
      navigate('/new-chat');
      handleNavigation();
    }
  };

  const handleDelete = async (sessionId: string) => {
    const wasActive = activeSessionId === sessionId;
    const success = await deleteConversation(sessionId);

    if (success && wasActive) {
      navigate('/new-chat');
      handleNavigation();
    }
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMenuNavigation = () => {
    handleMenuClose();
    handleNavigation();
  };

  const handleUserSettings = () => {
    handleMenuClose();
    handleNavigation();
    // TODO: Navigate to settings page or open modal
    console.log('Navigate to user settings');
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      // Call logout function from AuthContext
      // This will call POST /auth/logout and clear local state.
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      // Error is already handled in AuthContext logout function
      console.error('Logout handler error:', error);
    }
  };

  return (
    <Box
      className={`flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-800 ${
        isMobileDrawer ? 'w-64' : isCollapsed ? 'w-16' : 'w-64'
      } ${!isMobileDrawer ? 'fixed left-0 top-0' : ''}`}
    >
      {/* Logo Section */}
      <Box
        className={`flex items-center border-b border-gray-200 dark:border-slate-700 ${
          isCollapsed && !isMobileDrawer ? 'justify-center px-2 py-4' : 'justify-between px-6 py-4'
        }`}
      >
        {(!isCollapsed || isMobileDrawer) && (
          <Link to="/new-chat" className="no-underline" onClick={handleNavigation}>
            <Typography
              variant="h6"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text font-bold text-transparent dark:from-blue-400 dark:to-cyan-400"
            >
              appaihelp
            </Typography>
          </Link>
        )}
        {/* Hide collapse button in mobile drawer mode */}
        {!isMobileDrawer && (
          <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <IconButton
              onClick={onToggleCollapse}
              size="small"
              className="text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* New Chat Button */}
      <Box className={`px-3 pt-3 ${isCollapsed && !isMobileDrawer ? 'flex justify-center' : ''}`}>
        <Tooltip title={isCollapsed && !isMobileDrawer ? 'New Chat' : ''} placement="right" arrow>
          <ListItemButton
            component={Link}
            to="/new-chat"
            onClick={handleNavigation}
            className={`rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-600 transition-all hover:border-blue-500/70 hover:bg-blue-500/20 dark:border-blue-400/30 dark:text-blue-400 dark:hover:border-blue-400/60 dark:hover:bg-blue-500/20 ${
              isCollapsed && !isMobileDrawer ? 'justify-center' : 'gap-2'
            }`}
            sx={{
              py: 1,
              px: isCollapsed && !isMobileDrawer ? 1 : 2,
              minHeight: 40,
            }}
          >
            <SquarePen size={17} className="shrink-0" />
            {(!isCollapsed || isMobileDrawer) && (
              <Typography variant="body2" className="font-semibold">
                New Chat
              </Typography>
            )}
          </ListItemButton>
        </Tooltip>
      </Box>

      {/* Conversations */}
      <Box className="flex-1 overflow-y-auto py-4">
        {(!isCollapsed || isMobileDrawer) && (
          <>
            <Divider className="mx-3 mb-4" />
            <Typography
              variant="caption"
              className="px-7 py-2 font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Conversations
            </Typography>
            <Box className="mt-2">
              <ChatSessionsList
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSessionSelect={handleSessionSelect}
                onNewChat={handleNewChat}
                onRename={renameConversation}
                onArchive={handleArchive}
                onDelete={handleDelete}
                embedded
                isLoading={isLoading}
              />
            </Box>
          </>
        )}
      </Box>

      {/* Bottom Section: Dark Mode Toggle + User Profile */}
      <Box className="border-t border-gray-200 dark:border-slate-700">
        {/* Dark Mode Toggle */}
        <Box
          className={`flex items-center py-3 ${isCollapsed && !isMobileDrawer ? 'justify-center px-2' : 'justify-between px-6'}`}
        >
          {(!isCollapsed || isMobileDrawer) && (
            <Typography variant="body2" className="font-medium text-gray-700 dark:text-slate-300">
              {mode === 'light' ? 'Light Mode' : 'Dark Mode'}
            </Typography>
          )}
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton
              onClick={toggleTheme}
              className="text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
              size="small"
              sx={{ minWidth: 44, minHeight: 44 }} // Touch target optimization
            >
              {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* User Profile Widget */}
        <Box
          className={`cursor-pointer bg-gray-50 py-4 transition-colors hover:bg-gray-100 dark:bg-slate-900/50 dark:hover:bg-slate-900/70 ${isCollapsed && !isMobileDrawer ? 'px-2' : 'px-4'}`}
          onClick={handleProfileClick}
          sx={{ minHeight: 44 }} // Touch target optimization
        >
          {isCollapsed && !isMobileDrawer ? (
            <Tooltip
              title={`${user.userName} (${user.subscription || 'free'})`}
              placement="right"
              arrow
            >
              <Box className="flex justify-center">
                <Avatar
                  src={user.avatar}
                  alt={user.userName}
                  className="bg-gradient-to-br from-indigo-500 to-pink-500"
                  sx={{ width: 32, height: 32 }}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </Avatar>
              </Box>
            </Tooltip>
          ) : (
            <>
              <Box className="flex items-center gap-3">
                <Avatar
                  src={user.avatar}
                  alt={user.userName}
                  className="bg-gradient-to-br from-indigo-500 to-pink-500"
                  sx={{ width: 40, height: 40 }}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </Avatar>
                <Box className="min-w-0 flex-1">
                  <Typography
                    variant="body2"
                    className="truncate font-semibold text-gray-900 dark:text-slate-100"
                  >
                    {user.userName}
                  </Typography>
                  <Typography
                    variant="caption"
                    className="block truncate text-gray-500 dark:text-slate-400"
                  >
                    {user.email}
                  </Typography>
                </Box>
              </Box>
              {/* Subscription Badge */}
              {user.subscription && (
                <Box className="mt-2">
                  <Typography
                    variant="caption"
                    className={`inline-block rounded-full px-2 py-0.5 font-semibold ${
                      user.subscription.packageCode === 'ENTERPRISE'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : user.subscription.packageCode === 'PRO'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : user.subscription.isTrialing
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {user.subscription.packageName}
                    {user.subscription.isTrialing && ' (Trial)'}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* User Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={isMenuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: isCollapsed ? 'left' : 'right',
          }}
          slotProps={{
            paper: {
              className: 'mt-2 min-w-[200px] rounded-lg shadow-lg',
            },
          }}
        >
          {profileMenuItems.map(({ id, label, path, Icon }) => (
            <MenuItem
              key={id}
              component={Link}
              to={path}
              onClick={handleMenuNavigation}
              selected={isActive(path)}
              className="gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Icon size={18} className="text-gray-500 dark:text-slate-400" />
              <Typography variant="body2">{label}</Typography>
            </MenuItem>
          ))}
          <MenuItem
            onClick={handleUserSettings}
            className="gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Settings size={18} className="text-gray-500 dark:text-slate-400" />
            <Typography variant="body2">Settings</Typography>
          </MenuItem>
          <Divider className="my-1" />
          <MenuItem
            onClick={handleLogout}
            className="gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut size={18} />
            <Typography variant="body2">Logout</Typography>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};
