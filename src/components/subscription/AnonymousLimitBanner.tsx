/**
 * AnonymousLimitBanner Component
 *
 * Displays anonymous user session/message limits with call-to-action to register
 */

import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, Button, Box, LinearProgress } from '@mui/material';
import { UserPlus, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAnonymousStats } from '../../services/quota.service';
import type { AnonymousUserStats } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface AnonymousLimitBannerProps {
  className?: string;
  sessionId?: string;
}

const AnonymousLimitBanner: React.FC<AnonymousLimitBannerProps> = ({
  className = '',
  sessionId,
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AnonymousUserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const data = await getAnonymousStats();
        setStats(data);
      } catch (error) {
        console.error('[AnonymousLimitBanner] Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated]);

  // Don't show for authenticated users
  if (isAuthenticated || loading || !stats) {
    return null;
  }

  const { sessionsUsed, maxSessions } = stats;
  const sessionPercentage = (sessionsUsed / maxSessions) * 100;

  // Find current session message count if sessionId provided
  const currentSession = sessionId ? stats.sessions.find((s) => s.publicId === sessionId) : null;

  const messageCount = currentSession?.messageCount || 0;
  const maxMessagesPerSession = 10; // Should match backend config
  const messagePercentage = (messageCount / maxMessagesPerSession) * 100;

  // Only show when approaching limits (>= 50%)
  const shouldShowSessionWarning = sessionPercentage >= 50;
  const shouldShowMessageWarning = messagePercentage >= 50 && sessionId;

  if (!shouldShowSessionWarning && !shouldShowMessageWarning) {
    return null;
  }

  // Determine severity
  const getSeverity = () => {
    if (sessionPercentage >= 90 || messagePercentage >= 90) return 'warning';
    return 'info';
  };

  const getMessage = () => {
    if (shouldShowMessageWarning && messagePercentage >= 90) {
      return `You've used ${messageCount} of ${maxMessagesPerSession} messages in this session. Register for unlimited messages!`;
    }
    if (shouldShowSessionWarning && sessionPercentage >= 90) {
      return `You've used ${sessionsUsed} of ${maxSessions} free sessions. Sign up to continue chatting!`;
    }
    return `Limited to ${maxSessions} sessions and ${maxMessagesPerSession} messages per session. Register for unlimited access!`;
  };

  return (
    <Alert
      severity={getSeverity()}
      className={`${className}`}
      icon={<MessageCircle className="h-5 w-5" />}
      action={
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={() => navigate('/', { state: { authMode: 'signup' } })}
          startIcon={<UserPlus className="h-4 w-4" />}
          className="whitespace-nowrap"
        >
          Sign Up Free
        </Button>
      }
    >
      <AlertTitle className="font-semibold">Limited Guest Access</AlertTitle>
      <Box className="mb-2">{getMessage()}</Box>

      {/* Session usage progress */}
      {shouldShowSessionWarning && (
        <Box className="mb-2">
          <Box className="mb-1 flex items-center justify-between">
            <span className="text-xs">Sessions</span>
            <span className="text-xs font-semibold">
              {sessionsUsed}/{maxSessions}
            </span>
          </Box>
          <LinearProgress
            variant="determinate"
            value={sessionPercentage}
            color={sessionPercentage >= 90 ? 'warning' : 'primary'}
            className="h-1.5 rounded-full"
          />
        </Box>
      )}

      {/* Message usage progress */}
      {shouldShowMessageWarning && currentSession && (
        <Box>
          <Box className="mb-1 flex items-center justify-between">
            <span className="text-xs">Messages in this session</span>
            <span className="text-xs font-semibold">
              {messageCount}/{maxMessagesPerSession}
            </span>
          </Box>
          <LinearProgress
            variant="determinate"
            value={messagePercentage}
            color={messagePercentage >= 90 ? 'warning' : 'primary'}
            className="h-1.5 rounded-full"
          />
        </Box>
      )}
    </Alert>
  );
};

export default AnonymousLimitBanner;
