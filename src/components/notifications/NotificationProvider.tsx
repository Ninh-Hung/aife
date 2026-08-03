/**
 * Global Notification Provider
 * Wraps the app with notistack SnackbarProvider for toast notifications
 */

import React, { useCallback, useEffect, useState } from 'react';
import { SnackbarContent, SnackbarProvider, useSnackbar } from 'notistack';
import type { CustomContentProps } from 'notistack';
import { AlertCircle, AlertTriangle, Check, CheckCircle, Copy, Info, X } from 'lucide-react';
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
    return setupAxiosToast(axiosInstance, enqueueSnackbar);
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
        success: CustomSnackbar,
        error: CustomSnackbar,
        warning: CustomSnackbar,
        info: CustomSnackbar,
      }}
    >
      <AxiosToastSetup />
      {children}
    </SnackbarProvider>
  );
};

const variantConfig = {
  success: {
    background: 'bg-green-500',
    buttonFocus: 'focus-visible:ring-green-200',
    icon: CheckCircle,
  },
  error: {
    background: 'bg-red-500',
    buttonFocus: 'focus-visible:ring-red-200',
    icon: AlertTriangle,
  },
  warning: {
    background: 'bg-yellow-500',
    buttonFocus: 'focus-visible:ring-yellow-200',
    icon: AlertCircle,
  },
  info: {
    background: 'bg-blue-500',
    buttonFocus: 'focus-visible:ring-blue-200',
    icon: Info,
  },
};

const getMessageText = (message: React.ReactNode): string => {
  if (typeof message === 'string' || typeof message === 'number') {
    return String(message);
  }

  if (Array.isArray(message)) {
    return message.map(getMessageText).filter(Boolean).join(' ');
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(message)) {
    return getMessageText(message.props.children);
  }

  return '';
};

const copyToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  try {
    textArea.select();
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textArea);
  }
};

const CustomSnackbar = React.forwardRef<HTMLDivElement, CustomContentProps>(
  ({ id, message, style, variant }, ref) => {
    const { closeSnackbar } = useSnackbar();
    const [copied, setCopied] = useState(false);
    const toastVariant =
      variant === 'success' || variant === 'error' || variant === 'warning' || variant === 'info'
        ? variant
        : 'info';
    const config = variantConfig[toastVariant];
    const Icon = config.icon;
    const messageText = getMessageText(message);

    useEffect(() => {
      setCopied(false);
    }, [id, messageText]);

    const handleClose = useCallback(() => {
      closeSnackbar(id);
    }, [closeSnackbar, id]);

    const handleCopy = useCallback(() => {
      if (!messageText) return;
      void copyToClipboard(messageText)
        .then(() => setCopied(true))
        .catch(() => undefined);
    }, [messageText]);

    return (
      <SnackbarContent
        ref={ref}
        style={style}
        className={`flex min-w-[300px] max-w-[500px] items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg ${config.background}`}
        role="alert"
      >
        <Icon size={20} className="flex-shrink-0" />
        <div className="min-w-0 flex-1 break-words text-sm font-medium">{message}</div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {toastVariant === 'error' && (
            <button
              type="button"
              onClick={handleCopy}
              className={`rounded p-1 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 ${copied ? 'text-green-200' : 'text-white'} ${config.buttonFocus}`}
              aria-label={copied ? 'Toast content copied' : 'Copy toast content'}
              title={copied ? 'Copied' : 'Copy'}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className={`rounded p-1 text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 ${config.buttonFocus}`}
            aria-label="Close toast"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </SnackbarContent>
    );
  }
);

CustomSnackbar.displayName = 'CustomSnackbar';
