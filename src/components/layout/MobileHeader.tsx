/**
 * Mobile Header Component
 * Features: Hamburger Menu Icon, Logo, User Avatar
 * Displays on screens < lg (1024px)
 */

import React from 'react';
import { Box, IconButton, Avatar, Typography } from '@mui/material';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User } from '../../types';

// ============================================
// Props Interface
// ============================================

interface MobileHeaderProps {
  user: User;
  onMenuClick: () => void;
}

// ============================================
// MobileHeader Component
// ============================================

export const MobileHeader: React.FC<MobileHeaderProps> = ({ user, onMenuClick }) => {
  const displayName = user.fullName || user.userName;
  const avatarInitial = (displayName || user.email || 'U').charAt(0).toUpperCase();

  return (
    <Box className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-800 lg:hidden">
      {/* Left Section: Hamburger Menu */}
      <IconButton
        onClick={onMenuClick}
        className="text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
        sx={{ minWidth: 44, minHeight: 44 }} // Touch target optimization
      >
        <Menu size={24} />
      </IconButton>

      {/* Center Section: Logo */}
      <Link to="/new-chat" className="flex items-center gap-2 no-underline">
        <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
        <Typography
          variant="h6"
          className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text font-bold text-transparent dark:from-blue-400 dark:to-cyan-400"
        >
          appaihelp
        </Typography>
      </Link>

      {/* Right Section: User Avatar */}
      <Avatar
        src={user.avatar}
        alt={displayName}
        className="bg-gradient-to-br from-indigo-500 to-pink-500"
        sx={{ width: 36, height: 36 }}
      >
        {avatarInitial}
      </Avatar>
    </Box>
  );
};
