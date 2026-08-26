/**
 * TrialBanner Component
 *
 * Displays trial expiration warning banner
 */

import React from 'react';
import { Alert, AlertTitle, Button } from '@mui/material';
import { Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface TrialBannerProps {
  className?: string;
  onUpgrade?: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ className = '', onUpgrade }) => {
  const { subscription } = useAuth();
  const navigate = useNavigate();

  if (!subscription || !subscription.isTrialing) {
    return null;
  }

  const { trialDaysRemaining } = subscription;

  // Only show banner when trial is expiring soon (3 days or less)
  if (trialDaysRemaining === null || trialDaysRemaining > 3) {
    return null;
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/subscription');
    }
  };

  // Determine severity based on days remaining
  const getSeverity = () => {
    if (trialDaysRemaining === 0) return 'error';
    if (trialDaysRemaining === 1) return 'warning';
    return 'info';
  };

  const getMessage = () => {
    if (trialDaysRemaining === 0) {
      return 'Your trial expires today! Upgrade now to keep all features.';
    }
    if (trialDaysRemaining === 1) {
      return 'Your trial expires tomorrow. Upgrade to continue using all features.';
    }
    return `Your trial expires in ${trialDaysRemaining} days. Upgrade to unlock unlimited access.`;
  };

  return (
    <Alert
      severity={getSeverity()}
      className={`${className}`}
      icon={<Clock className="h-5 w-5" />}
      action={
        <Button
          size="small"
          variant="contained"
          color={getSeverity() === 'error' ? 'error' : 'primary'}
          onClick={handleUpgrade}
          endIcon={<ArrowRight className="h-4 w-4" />}
          className="whitespace-nowrap"
        >
          Upgrade Now
        </Button>
      }
    >
      <AlertTitle className="font-semibold">Trial Ending Soon</AlertTitle>
      {getMessage()}
    </Alert>
  );
};

export default TrialBanner;
