/**
 * Full-Width Header Component
 * Features: Logo, Page Title, Agent Selector
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Chip,
  Typography,
} from '@mui/material';
import { Bot } from 'lucide-react';
import { Agent } from '../../types';

// ============================================
// Props Interface
// ============================================

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  agents?: Agent[];
  selectedAgentId?: string;
  onAgentChange?: (agentId: string) => void;
}

// ============================================
// Header Component
// ============================================

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  icon,
  agents,
  selectedAgentId,
  onAgentChange,
}) => {
  const handleAgentChange = (event: SelectChangeEvent<string>) => {
    onAgentChange?.(event.target.value);
  };

  return (
    <Box
      className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8 dark:border-slate-700 dark:bg-slate-800"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
      }}
    >
      {/* Left Section: Logo */}
      <Box className="flex items-center gap-6">
        <Link to="/" className="no-underline">
          <Typography
            variant="h6"
            className="bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text font-bold text-transparent dark:from-indigo-400 dark:to-pink-400"
          >
            appaihelp.com
          </Typography>
        </Link>

        {/* Divider */}
        <Box className="h-8 w-px bg-gray-200 dark:bg-slate-700" />

        {/* Page Title */}
        <Box className="flex items-center gap-3">
          {icon && (
            <Box className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              {icon}
            </Box>
          )}
          <Box>
            <Typography variant="h6" className="font-bold text-gray-900 dark:text-white">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Right Section: Agent Selector (if applicable) */}
      {agents && agents.length > 0 && selectedAgentId && onAgentChange && (
        <FormControl size="small" className="min-w-[200px]">
          <Select
            value={selectedAgentId}
            onChange={handleAgentChange}
            className="bg-gray-50 text-gray-900 dark:bg-slate-700 dark:text-white"
            displayEmpty
            renderValue={(value) => {
              const agent = agents.find((a) => a.id === value);
              return (
                <Box className="flex items-center gap-2">
                  <Bot size={16} className="text-blue-600 dark:text-blue-400" />
                  <span>{agent?.name || 'Translation Agent'}</span>
                </Box>
              );
            }}
          >
            {agents.map((agent) => (
              <MenuItem key={agent.id} value={agent.id}>
                <Box className="flex items-center gap-2">
                  <Bot size={16} className="text-blue-600 dark:text-blue-400" />
                  <span>{agent.name}</span>
                  {agent.isDefault && <Chip label="Default" size="small" color="primary" />}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
};
