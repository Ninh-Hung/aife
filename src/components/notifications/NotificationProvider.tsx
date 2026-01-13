/**
 * Global Notification Provider
 * Wraps the app with notistack SnackbarProvider for toast notifications
 */

import React, { useEffect } from 'react';
import { SnackbarProvider, useSnackbar } from 'notistack';
import { CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useMediaQuery } from '@mui/material';
import axiosInstance from '../../lib/axios';
import { setupAxiosToast } from '../../lib/axiosToastSetup';

interface NotificationProviderProps {
  children: React.ReactNode;
}

// Inner component that has access to useSnackbar
const AxiosToastSetup: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    // Setup axios interceptor for automatic error toasts
    setupAxiosToast(axiosInstance, enqueueSnackbar);
  }, [enqueueSnackbar]);

  return null;
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: isMobile ? 'top' : 'top',
        horizontal: isMobile ? 'center' : 'right',
      }}
      autoHideDuration={4000}
      preventDuplicate
      Components={{
        success: CustomSuccessSnackbar,
        error: CustomErrorSnackbar,
        warning: CustomWarningSnackbar,
        info: CustomInfoSnackbar,
      }}
    >
      <AxiosToastSetup />
      {children}
    </SnackbarProvider>
  );
};

// Custom Snackbar Components with Lucide Icons
interface CustomSnackbarProps {
  message: string;
  onClose?: () => void;
}

const CustomSuccessSnackbar = React.forwardRef<HTMLDivElement, CustomSnackbarProps>(
  (props, ref) => {
    const { message, onClose } = props;

    return (
      <div
        ref={ref}
        className="flex min-w-[300px] max-w-[500px] items-center gap-3 rounded-lg bg-green-500 px-4 py-3 text-white shadow-lg"
        role="alert"
      >
        <CheckCircle size={20} className="flex-shrink-0" />
        <div className="flex-1 text-sm font-medium">{message}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white transition-colors hover:text-green-100"
            aria-label="Close"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

const CustomErrorSnackbar = React.forwardRef<HTMLDivElement, CustomSnackbarProps>((props, ref) => {
  const { message, onClose } = props;

  return (
    <div
      ref={ref}
      className="flex min-w-[300px] max-w-[500px] items-center gap-3 rounded-lg bg-red-500 px-4 py-3 text-white shadow-lg"
      role="alert"
    >
      <AlertTriangle size={20} className="flex-shrink-0" />
      <div className="flex-1 text-sm font-medium">{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white transition-colors hover:text-red-100"
          aria-label="Close"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
});

const CustomWarningSnackbar = React.forwardRef<HTMLDivElement, CustomSnackbarProps>(
  (props, ref) => {
    const { message, onClose } = props;

    return (
      <div
        ref={ref}
        className="flex min-w-[300px] max-w-[500px] items-center gap-3 rounded-lg bg-yellow-500 px-4 py-3 text-white shadow-lg"
        role="alert"
      >
        <AlertCircle size={20} className="flex-shrink-0" />
        <div className="flex-1 text-sm font-medium">{message}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white transition-colors hover:text-yellow-100"
            aria-label="Close"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

const CustomInfoSnackbar = React.forwardRef<HTMLDivElement, CustomSnackbarProps>((props, ref) => {
  const { message, onClose } = props;

  return (
    <div
      ref={ref}
      className="flex min-w-[300px] max-w-[500px] items-center gap-3 rounded-lg bg-blue-500 px-4 py-3 text-white shadow-lg"
      role="alert"
    >
      <Info size={20} className="flex-shrink-0" />
      <div className="flex-1 text-sm font-medium">{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white transition-colors hover:text-blue-100"
          aria-label="Close"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
});

CustomSuccessSnackbar.displayName = 'CustomSuccessSnackbar';
CustomErrorSnackbar.displayName = 'CustomErrorSnackbar';
CustomWarningSnackbar.displayName = 'CustomWarningSnackbar';
CustomInfoSnackbar.displayName = 'CustomInfoSnackbar';
