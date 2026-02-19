/**
 * Main Sidebar Component
 * Features: Logo, Navigation, Services, Dark Mode Toggle, User Profile
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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
  Code,
  Image as ImageIcon,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Settings,
  LogOut,
  KeyRound,
  SquarePen,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';

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

const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { id: 'agents', label: 'My Agents', path: '/agents', Icon: Users },
  { id: 'api-keys', label: 'API Keys', path: '/api-keys', Icon: KeyRound },
  { id: 'subscription', label: 'Subscription', path: '/subscription', Icon: CreditCard },
];

const serviceNavItems = [
  {
    id: 'translate',
    label: 'Multi-language Translate',
    path: '/translate',
    Icon: Languages,
  },
  {
    id: 'code',
    label: 'Generate Code',
    path: '/code',
    Icon: Code,
  },
  {
    id: 'image',
    label: 'Generate Picture',
    path: '/image',
    Icon: ImageIcon,
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
  const { mode, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePersonalDetail = () => {
    handleMenuClose();
    // TODO: Navigate to personal detail page or open modal
    console.log('Navigate to personal detail');
  };

  const handleUserSettings = () => {
    handleMenuClose();
    // TODO: Navigate to settings page or open modal
    console.log('Navigate to user settings');
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      // Call logout function from AuthContext
      // This will: 1) call POST /auth/logout, 2) clear local state, 3) redirect to "/"
      await logout();
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
          <Link to="/dashboard" className="no-underline" onClick={handleNavigation}>
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

      {/* Main Navigation */}
      <Box className="flex-1 overflow-y-auto py-4">
        <List className="px-3">
          {!isCollapsed && (
            <Typography
              variant="caption"
              className="px-4 py-2 font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Main
            </Typography>
          )}
          {mainNavItems.map(({ id, label, path, Icon }) => (
            <ListItem key={id} disablePadding className="mb-1">
              <Tooltip title={isCollapsed && !isMobileDrawer ? label : ''} placement="right" arrow>
                <ListItemButton
                  component={Link}
                  to={path}
                  onClick={handleNavigation}
                  className={`rounded-lg transition-all ${
                    isActive(path)
                      ? 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  } ${isCollapsed && !isMobileDrawer ? 'justify-center' : ''}`}
                  sx={{
                    py: 1.5,
                    px: isCollapsed && !isMobileDrawer ? 1 : 2,
                    minHeight: 44, // Touch target optimization
                  }}
                >
                  <ListItemIcon
                    className={
                      isActive(path)
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-500 dark:text-slate-400'
                    }
                    sx={{ minWidth: isCollapsed && !isMobileDrawer ? 'auto' : 40 }}
                  >
                    <Icon size={20} />
                  </ListItemIcon>
                  {(!isCollapsed || isMobileDrawer) && (
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: isActive(path) ? 600 : 500,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>

        <Divider className="mx-3 my-4" />

        {/* Services Navigation */}
        <List className="px-3">
          {!isCollapsed && (
            <Typography
              variant="caption"
              className="px-4 py-2 font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Services
            </Typography>
          )}
          {serviceNavItems.map(({ id, label, path, Icon }) => (
            <ListItem key={id} disablePadding className="mb-1">
              <Tooltip title={isCollapsed && !isMobileDrawer ? label : ''} placement="right" arrow>
                <ListItemButton
                  component={Link}
                  to={path}
                  onClick={handleNavigation}
                  className={`rounded-lg transition-all ${
                    isActive(path)
                      ? 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  } ${isCollapsed && !isMobileDrawer ? 'justify-center' : ''}`}
                  sx={{
                    py: 1.5,
                    px: isCollapsed && !isMobileDrawer ? 1 : 2,
                    minHeight: 44, // Touch target optimization
                  }}
                >
                  <ListItemIcon
                    className={
                      isActive(path)
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-500 dark:text-slate-400'
                    }
                    sx={{ minWidth: isCollapsed && !isMobileDrawer ? 'auto' : 40 }}
                  >
                    <Icon size={20} />
                  </ListItemIcon>
                  {(!isCollapsed || isMobileDrawer) && (
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: isActive(path) ? 600 : 500,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>
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
                      user.subscription === 'enterprise'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : user.subscription === 'pro'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {user.subscription.charAt(0).toUpperCase() + user.subscription.slice(1)} Plan
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
          <MenuItem
            onClick={handlePersonalDetail}
            className="gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <UserCircle size={18} className="text-gray-500 dark:text-slate-400" />
            <Typography variant="body2">Personal Detail</Typography>
          </MenuItem>
          <MenuItem
            onClick={handleUserSettings}
            className="gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Settings size={18} className="text-gray-500 dark:text-slate-400" />
            <Typography variant="body2">User Settings</Typography>
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
