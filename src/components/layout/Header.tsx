/**
 * Full-Width Header Component
 * Features: Logo, Page Title, Agent Selector
 */

import React from 'react';
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
import QuotaBadge from '../subscription/QuotaBadge';
import { useAuth } from '../../contexts/AuthContext';

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
  const { isAuthenticated } = useAuth();

  const handleAgentChange = (event: SelectChangeEvent<string>) => {
    onAgentChange?.(event.target.value);
  };

  return (
    <Box className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-800 md:px-6 lg:px-8">
      {/* Left Section: Page Title */}
      <Box className="flex items-center gap-2 md:gap-3">
        {icon && (
          <Box className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
            {icon}
          </Box>
        )}
        <Box className="min-w-0">
          <Typography
            variant="h6"
            className="truncate font-bold text-gray-900 dark:text-white"
            sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              className="hidden text-gray-500 dark:text-slate-400 sm:block"
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Right Section: Quota Badge + Agent Selector */}
      <Box className="flex items-center gap-3">
        {/* Show quota badge for authenticated users */}
        {isAuthenticated && <QuotaBadge variant="compact" />}

        {/* Agent Selector (if applicable) */}
        {agents && agents.length > 0 && selectedAgentId && onAgentChange && (
          <FormControl size="small" className="min-w-[140px] md:min-w-[200px]">
            <Select
              value={selectedAgentId}
              onChange={handleAgentChange}
              className="bg-gray-50 text-gray-900 dark:bg-slate-700 dark:text-white"
              displayEmpty
              sx={{
                minHeight: 44, // Touch target optimization
              }}
              renderValue={(value) => {
                const agent = agents.find((a) => a.id === value);
                return (
                  <Box className="flex items-center gap-2">
                    <Bot size={16} className="text-blue-500 dark:text-blue-400" />
                    <span className="truncate text-sm md:text-base">
                      {agent?.name || 'Translation Agent'}
                    </span>
                  </Box>
                );
              }}
            >
              {agents.map((agent) => (
                <MenuItem
                  key={agent.id}
                  value={agent.id}
                  sx={{ minHeight: 44 }} // Touch target optimization
                >
                  <Box className="flex items-center gap-2">
                    <Bot size={16} className="text-blue-500 dark:text-blue-400" />
                    <span>{agent.name}</span>
                    {agent.isDefault && <Chip label="Default" size="small" color="primary" />}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
    </Box>
  );
};
