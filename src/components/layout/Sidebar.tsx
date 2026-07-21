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
  BookOpen,
  MessageCircleWarning,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';
import { ChatSessionsList } from '../chat/ChatSessionsList';
import { ShareConversationDialog } from '../chat/ShareConversationDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
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
  { id: 'dashboard', labelKey: 'sidebar.dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { id: 'agents', labelKey: 'sidebar.agents', path: '/agents', Icon: Users },
  { id: 'knowledge', labelKey: 'sidebar.knowledge', path: '/knowledge', Icon: BookOpen },
  { id: 'api-keys', labelKey: 'sidebar.apiKeys', path: '/api-keys', Icon: KeyRound },
  { id: 'subscription', labelKey: 'sidebar.subscription', path: '/subscription', Icon: CreditCard },
  {
    id: 'translate',
    labelKey: 'sidebar.multilanguage',
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
  const { t } = useTranslation();
  const { mode, toggleTheme } = useTheme();
  const { logout, isAnonymous } = useAuth();
  const { sessions, isLoading, renameConversation, archiveConversation, deleteConversation } =
    useSidebarConversations();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [shareSessionId, setShareSessionId] = useState<string | null>(null);
  const isMenuOpen = Boolean(anchorEl);
  const displayName = user.fullName || user.userName;
  const avatarInitial = (displayName || user.email || 'U').charAt(0).toUpperCase();
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

  const handleShare = (sessionId: string) => {
    setShareSessionId(sessionId);
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
    navigate('/settings');
  };

  const handleFeedback = () => {
    handleMenuClose();
    handleNavigation();
    navigate('/feedback');
  };

  const handleLogoutClick = () => {
    handleMenuClose();
    setIsLogoutDialogOpen(true);
  };

  const handleLogoutDialogClose = () => {
    if (!isLoggingOut) {
      setIsLogoutDialogOpen(false);
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Call logout function from AuthContext
      // This will call POST /auth/logout and clear local state.
      await logout();
      setIsLogoutDialogOpen(false);
      navigate('/', { replace: true });
    } catch (error) {
      // Error is already handled in AuthContext logout function
      console.error('Logout handler error:', error);
    } finally {
      setIsLoggingOut(false);
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
          <Link
            to={isAnonymous ? '/' : '/new-chat'}
            className="flex items-center gap-2 no-underline"
            onClick={handleNavigation}
          >
            <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
            <Typography
              variant="h6"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text font-bold text-transparent dark:from-blue-400 dark:to-cyan-400"
            >
              appaihelp
            </Typography>
          </Link>
        )}
        {isCollapsed && !isMobileDrawer && (
          <Link
            to={isAnonymous ? '/' : '/new-chat'}
            className="no-underline"
            onClick={handleNavigation}
          >
            <img src="/logo.svg" alt="AppAIHelp" className="h-8 w-8 rounded-lg" />
          </Link>
        )}
        {/* Hide collapse button in mobile drawer mode */}
        {!isMobileDrawer && (
          <Tooltip
            title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            placement="right"
          >
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

      {!isAnonymous && (
        <Box className={`px-3 pt-3 ${isCollapsed && !isMobileDrawer ? 'flex justify-center' : ''}`}>
          <Tooltip
            title={isCollapsed && !isMobileDrawer ? t('sidebar.newChat') : ''}
            placement="right"
            arrow
          >
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
                  {t('sidebar.newChat')}
                </Typography>
              )}
            </ListItemButton>
          </Tooltip>
        </Box>
      )}

      {/* Conversations */}
      <Box className="flex-1 overflow-y-auto py-4">
        {!isAnonymous && (!isCollapsed || isMobileDrawer) && (
          <>
            <Divider className="mx-3 mb-4" />
            <Typography
              variant="caption"
              className="px-7 py-2 font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              {t('sidebar.conversations')}
            </Typography>
            <Box className="mt-2">
              <ChatSessionsList
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSessionSelect={handleSessionSelect}
                onNewChat={handleNewChat}
                onShare={handleShare}
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
              {mode === 'light' ? t('theme.lightMode') : t('theme.darkMode')}
            </Typography>
          )}
          <Tooltip title={mode === 'light' ? t('theme.switchToDark') : t('theme.switchToLight')}>
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

        {!isAnonymous && (
          <Box
            className={`cursor-pointer bg-gray-50 py-4 transition-colors hover:bg-gray-100 dark:bg-slate-900/50 dark:hover:bg-slate-900/70 ${isCollapsed && !isMobileDrawer ? 'px-2' : 'px-4'}`}
            onClick={handleProfileClick}
            sx={{ minHeight: 44 }} // Touch target optimization
          >
            {isCollapsed && !isMobileDrawer ? (
              <Tooltip
                title={`${displayName} (${user.subscription || 'free'})`}
                placement="right"
                arrow
              >
                <Box className="flex justify-center">
                  <Avatar
                    src={user.avatar}
                    alt={displayName}
                    className="bg-gradient-to-br from-indigo-500 to-pink-500"
                    sx={{ width: 32, height: 32 }}
                  >
                    {avatarInitial}
                  </Avatar>
                </Box>
              </Tooltip>
            ) : (
              <>
                <Box className="flex items-center gap-3">
                  <Avatar
                    src={user.avatar}
                    alt={displayName}
                    className="bg-gradient-to-br from-indigo-500 to-pink-500"
                    sx={{ width: 40, height: 40 }}
                  >
                    {avatarInitial}
                  </Avatar>
                  <Box className="min-w-0 flex-1">
                    <Typography
                      variant="body2"
                      className="truncate font-semibold text-gray-900 dark:text-slate-100"
                    >
                      {displayName}
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
                      {user.subscription.isTrialing && ` (${t('common.trial')})`}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {/* User Profile Menu */}
        {!isAnonymous && (
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
            {profileMenuItems.map(({ id, labelKey, path, Icon }) => (
              <MenuItem
                key={id}
                component={Link}
                to={path}
                onClick={handleMenuNavigation}
                selected={isActive(path)}
                className="gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Icon size={18} className="text-gray-500 dark:text-slate-400" />
                <Typography variant="body2">{t(labelKey)}</Typography>
              </MenuItem>
            ))}
            <MenuItem
              onClick={handleUserSettings}
              className="gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Settings size={18} className="text-gray-500 dark:text-slate-400" />
              <Typography variant="body2">{t('common.settings')}</Typography>
            </MenuItem>
            <MenuItem
              onClick={handleFeedback}
              className="gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <MessageCircleWarning size={18} className="text-gray-500 dark:text-slate-400" />
              <Typography variant="body2">{t('sidebar.feedback')}</Typography>
            </MenuItem>
            <Divider className="my-1" />
            <MenuItem
              onClick={handleLogoutClick}
              className="gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut size={18} />
              <Typography variant="body2">{t('common.logout')}</Typography>
            </MenuItem>
          </Menu>
        )}
      </Box>
      <ConfirmDialog
        open={isLogoutDialogOpen}
        title={t('logoutConfirm.title')}
        message={t('logoutConfirm.message')}
        confirmText={t('common.logout')}
        cancelText={t('logoutConfirm.cancel')}
        confirmColor="error"
        loading={isLoggingOut}
        onClose={handleLogoutDialogClose}
        onConfirm={() => void handleConfirmLogout()}
      />
      <ShareConversationDialog
        open={Boolean(shareSessionId)}
        sessionId={shareSessionId}
        onClose={() => setShareSessionId(null)}
      />
    </Box>
  );
};
