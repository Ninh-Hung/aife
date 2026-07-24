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
  const interceptorId = axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ message?: string; error?: string; errorCode?: string }>) => {
      if (error.config?.skipErrorToast) {
        return Promise.reject(error);
      }

      // Don't show toast for 401 errors (handled by auth flow)
      if (error.response?.status === 401) {
        return Promise.reject(error);
      }

      const errorCode = error.response?.data?.errorCode || error.response?.data?.error;
      const requestUrl = error.config?.url || '';

      // Quota/limit errors are handled by useQuotaErrorHandler via custom events.
      // Showing a generic toast here creates duplicate UI next to the upgrade modal.
      if (
        errorCode === 'QUOTA_EXCEEDED' ||
        errorCode === 'RATE_LIMIT_EXCEEDED' ||
        errorCode === 'ANONYMOUS_LIMIT_EXCEEDED'
      ) {
        return Promise.reject(error);
      }

      // No active subscription is an expected state for guests/free users.
      if (
        requestUrl.includes('/v1/subscriptions/current') &&
        (errorCode === 'NO_ACTIVE_SUBSCRIPTION' || errorCode === 'SUBSCRIPTION_REQUIRED')
      ) {
        return Promise.reject(error);
      }

      if (requestUrl.includes('/auth/login') && errorCode === 'EMAIL_NOT_VERIFIED') {
        return Promise.reject(error);
      }

      // Extract error message
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
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

  return () => {
    axiosInstance.interceptors.response.eject(interceptorId);
  };
};
