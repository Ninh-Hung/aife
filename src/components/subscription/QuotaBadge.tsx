/**
 * QuotaBadge Component
 *
 * Displays user's quota usage with visual progress indicator
 */

import React from 'react';
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';
import { Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface QuotaBadgeProps {
  variant?: 'compact' | 'detailed';
  className?: string;
}

const QuotaBadge: React.FC<QuotaBadgeProps> = ({ variant = 'compact', className = '' }) => {
  const { quota, subscription } = useAuth();

  if (!quota) {
    return null;
  }

  const { remainingTokens, quotaLimit, percentageUsed } = quota;

  // Determine color based on usage
  const getColor = () => {
    if (percentageUsed >= 90) return 'error';
    if (percentageUsed >= 70) return 'warning';
    return 'primary';
  };

  const color = getColor();

  // Format number with commas
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (variant === 'compact') {
    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="caption" display="block">
              {remainingTokens.toLocaleString()} / {quotaLimit.toLocaleString()} tokens
            </Typography>
            <Typography variant="caption" display="block">
              {subscription?.packageName || 'Free'} Plan
            </Typography>
          </Box>
        }
      >
        <Box className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 ${className}`}>
          <Zap className="w-4 h-4 text-yellow-500" />
          <Typography variant="body2" className="font-medium">
            {formatNumber(remainingTokens)}
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  // Detailed variant
  return (
    <Box className={`p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${className}`}>
      <Box className="flex items-center justify-between mb-2">
        <Box className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <Typography variant="body2" className="font-semibold">
            Token Quota
          </Typography>
        </Box>
        <Typography variant="caption" className="text-gray-500 dark:text-gray-400">
          {subscription?.packageName || 'Free'} Plan
        </Typography>
      </Box>

      <Box className="mb-2">
        <LinearProgress
          variant="determinate"
          value={100 - percentageUsed}
          color={color}
          className="h-2 rounded-full"
        />
      </Box>

      <Box className="flex justify-between items-center">
        <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
          {formatNumber(remainingTokens)} / {formatNumber(quotaLimit)} remaining
        </Typography>
        <Typography
          variant="caption"
          className={`font-semibold ${
            percentageUsed >= 90
              ? 'text-red-600 dark:text-red-400'
              : percentageUsed >= 70
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-green-600 dark:text-green-400'
          }`}
        >
          {(100 - percentageUsed).toFixed(1)}% left
        </Typography>
      </Box>

      {percentageUsed >= 90 && (
        <Typography variant="caption" className="mt-2 block text-red-600 dark:text-red-400">
          Running low on tokens. Consider upgrading your plan.
        </Typography>
      )}
    </Box>
  );
};

export default QuotaBadge;
