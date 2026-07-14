/**
 * Axios Toast Integration
 * Sets up automatic error toast notifications for failed API requests
 */

import type { AxiosError, AxiosInstance } from 'axios';
import type { EnqueueSnackbar } from 'notistack';

/**
 * Setup axios interceptor to show toast notifications on errors
 * Should be called once during app initialization from a component context
 */
export const setupAxiosToast = (axiosInstance: AxiosInstance, enqueueSnackbar: EnqueueSnackbar) => {
  // Response interceptor for error toasts
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ message?: string; error?: string }>) => {
      // Don't show toast for 401 errors (handled by auth flow)
      if (error.response?.status === 401) {
        return Promise.reject(error);
      }

      // Extract error message
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred';

      // Show error toast
      enqueueSnackbar(errorMessage, {
        variant: 'error',
        preventDuplicate: true,
      });

      return Promise.reject(error);
    }
  );
};
