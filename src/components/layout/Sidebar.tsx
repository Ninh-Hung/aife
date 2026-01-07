/**
 * Main Sidebar Component
 * Features: Logo, Navigation, Services, Dark Mode Toggle, User Profile
 */

import React from 'react';
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
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { User } from '../../types';

// ============================================
// Props Interface
// ============================================

interface SidebarProps {
  user: User;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// ============================================
// Navigation Configuration
// ============================================

const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { id: 'agents', label: 'My Agents', path: '/agents', Icon: Users },
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

export const Sidebar: React.FC<SidebarProps> = ({ user, isCollapsed, onToggleCollapse }) => {
  const location = useLocation();
  const { mode, toggleTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box
      className={`flex h-[calc(100vh-64px)] flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-800 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      sx={{
        position: 'fixed',
        left: 0,
        top: 64,
        zIndex: 1200,
      }}
    >
      {/* Toggle Button */}
      <Box className="flex items-center justify-end border-b border-gray-200 p-2 dark:border-slate-700">
        <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            className="text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </IconButton>
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
              <Tooltip title={isCollapsed ? label : ''} placement="right" arrow>
                <ListItemButton
                  component={Link}
                  to={path}
                  className={`rounded-lg transition-all ${
                    isActive(path)
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  sx={{
                    py: 1.5,
                    px: isCollapsed ? 1 : 2,
                  }}
                >
                  <ListItemIcon
                    className={
                      isActive(path)
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-500 dark:text-slate-400'
                    }
                    sx={{ minWidth: isCollapsed ? 'auto' : 40 }}
                  >
                    <Icon size={20} />
                  </ListItemIcon>
                  {!isCollapsed && (
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
              <Tooltip title={isCollapsed ? label : ''} placement="right" arrow>
                <ListItemButton
                  component={Link}
                  to={path}
                  className={`rounded-lg transition-all ${
                    isActive(path)
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  sx={{
                    py: 1.5,
                    px: isCollapsed ? 1 : 2,
                  }}
                >
                  <ListItemIcon
                    className={
                      isActive(path)
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-500 dark:text-slate-400'
                    }
                    sx={{ minWidth: isCollapsed ? 'auto' : 40 }}
                  >
                    <Icon size={20} />
                  </ListItemIcon>
                  {!isCollapsed && (
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
          className={`flex items-center py-3 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-6'}`}
        >
          {!isCollapsed && (
            <Typography variant="body2" className="font-medium text-gray-700 dark:text-slate-300">
              {mode === 'light' ? 'Light Mode' : 'Dark Mode'}
            </Typography>
          )}
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton
              onClick={toggleTheme}
              className="text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
              size="small"
            >
              {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* User Profile Widget */}
        <Box className={`bg-gray-50 py-4 dark:bg-slate-900/50 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {isCollapsed ? (
            <Tooltip title={`${user.name} (${user.subscription})`} placement="right" arrow>
              <Box className="flex justify-center">
                <Avatar
                  src={user.avatar}
                  alt={user.name}
                  className="bg-gradient-to-br from-indigo-500 to-pink-500"
                  sx={{ width: 32, height: 32 }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              </Box>
            </Tooltip>
          ) : (
            <>
              <Box className="flex items-center gap-3">
                <Avatar
                  src={user.avatar}
                  alt={user.name}
                  className="bg-gradient-to-br from-indigo-500 to-pink-500"
                  sx={{ width: 40, height: 40 }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box className="min-w-0 flex-1">
                  <Typography
                    variant="body2"
                    className="truncate font-semibold text-gray-900 dark:text-slate-100"
                  >
                    {user.name}
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
              <Box className="mt-2">
                <Typography
                  variant="caption"
                  className={`inline-block rounded-full px-2 py-0.5 font-semibold ${
                    user.subscription === 'enterprise'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : user.subscription === 'pro'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {user.subscription.charAt(0).toUpperCase() + user.subscription.slice(1)} Plan
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};
