/**
 * UpgradeModal Component
 *
 * Modal shown when user hits quota/limit errors
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import { X, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  upgradeUrl?: string;
  remainingTokens?: number;
  quotaLimit?: number;
  isAnonymousLimit?: boolean;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  open,
  onClose,
  title,
  message,
  upgradeUrl = '/subscription',
  remainingTokens,
  quotaLimit,
  isAnonymousLimit = false,
}) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate(upgradeUrl === '/pricing' ? '/subscription' : upgradeUrl);
  };

  const handleRegister = () => {
    onClose();
    navigate('/', { state: { authMode: 'signup' } });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: 'rounded-lg',
      }}
    >
      <DialogTitle className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <Box className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <Typography variant="h6" className="font-semibold">
            {title || (isAnonymousLimit ? 'Guest Limit Reached' : 'Quota Exceeded')}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent className="py-6">
        <Typography variant="body1" className="mb-4 text-gray-700 dark:text-gray-300">
          {message}
        </Typography>

        {/* Show quota info if available */}
        {remainingTokens !== undefined && quotaLimit !== undefined && (
          <Box className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Typography variant="caption" className="text-gray-600 dark:text-gray-400 mb-2 block">
              Current Usage
            </Typography>
            <Box className="flex justify-between items-center">
              <Typography variant="body2" className="font-semibold">
                Tokens Remaining
              </Typography>
              <Typography variant="body1" className="font-bold text-red-600 dark:text-red-400">
                {remainingTokens.toLocaleString()} / {quotaLimit.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Benefits list */}
        <Box className="mt-6">
          <Typography variant="body2" className="font-semibold mb-3">
            {isAnonymousLimit ? 'Sign up for free to unlock:' : 'Upgrade your plan to get:'}
          </Typography>
          <Box className="space-y-2">
            {isAnonymousLimit ? (
              <>
                <Box className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Unlimited chat sessions
                  </Typography>
                </Box>
                <Box className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    100K tokens per month (FREE plan)
                  </Typography>
                </Box>
                <Box className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Create and customize AI agents
                  </Typography>
                </Box>
              </>
            ) : (
              <>
                <Box className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Higher monthly token quota
                  </Typography>
                </Box>
                <Box className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Priority support
                  </Typography>
                </Box>
                <Box className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Advanced AI models
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={onClose} variant="outlined" className="mr-2">
          Cancel
        </Button>
        {isAnonymousLimit ? (
          <Button
            onClick={handleRegister}
            variant="contained"
            color="primary"
            endIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign Up Free
          </Button>
        ) : (
          <Button
            onClick={handleUpgrade}
            variant="contained"
            color="primary"
            endIcon={<ArrowRight className="w-4 h-4" />}
          >
            View Plans
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UpgradeModal;
