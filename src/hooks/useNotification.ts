/**
 * Custom hook for triggering toast notifications
 * Wraps notistack's useSnackbar for a cleaner API
 */

import { useSnackbar, VariantType } from 'notistack';
import { useCallback, useMemo } from 'react';

interface NotificationOptions {
  variant?: VariantType;
  autoHideDuration?: number;
  preventDuplicate?: boolean;
}

export const useNotification = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const showNotification = useCallback(
    (message: string, options?: NotificationOptions) => {
      return enqueueSnackbar(message, {
        variant: options?.variant || 'info',
        autoHideDuration: options?.autoHideDuration,
        preventDuplicate: options?.preventDuplicate,
      });
    },
    [enqueueSnackbar]
  );

  return useMemo(
    () => ({
      // Main method
      notify: showNotification,

      // Convenience methods
      success: (message: string, options?: Omit<NotificationOptions, 'variant'>) =>
        showNotification(message, { ...options, variant: 'success' }),

      error: (message: string, options?: Omit<NotificationOptions, 'variant'>) =>
        showNotification(message, { ...options, variant: 'error' }),

      warning: (message: string, options?: Omit<NotificationOptions, 'variant'>) =>
        showNotification(message, { ...options, variant: 'warning' }),

      info: (message: string, options?: Omit<NotificationOptions, 'variant'>) =>
        showNotification(message, { ...options, variant: 'info' }),

      // Close a specific notification or all notifications
      close: closeSnackbar,
    }),
    [closeSnackbar, showNotification]
  );
};
