/**
 * Centralized Axios Instance
 * Configured with base URL, credentials, and interceptors for token management
 */

import axios, { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getStoredAppLocale, LANGUAGE_HEADER } from '../i18n/types';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    skipErrorToast?: boolean;
  }
}

// ============================================
// Axios Instance Configuration
// ============================================

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true, // Required for HttpOnly cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const isFormDataBody = (data: unknown): data is FormData => {
  return typeof FormData !== 'undefined' && data instanceof FormData;
};

const removeContentTypeHeader = (config: InternalAxiosRequestConfig) => {
  if (!config.headers) return;

  if (config.headers instanceof AxiosHeaders) {
    config.headers.delete('Content-Type');
    return;
  }

  delete config.headers['Content-Type'];
  delete config.headers['content-type'];
};

// ============================================
// In-Memory Token Storage
// ============================================

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

export const clearAccessToken = () => {
  accessToken = null;
};

let refreshPromise: Promise<string> | null = null;

const AUTH_REFRESH_EXCLUDED_PATHS = new Set([
  '/auth/refresh',
  '/auth/anonymous',
  '/auth/login',
  '/auth/register',
  '/auth/resend-otp',
  '/auth/verify-email',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

const shouldSkipRefreshForRequest = (url?: string) => {
  if (!url) {
    return false;
  }

  const baseUrl =
    import.meta.env.VITE_SERVER_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  const pathname = url.startsWith('http') ? new URL(url).pathname : new URL(url, baseUrl).pathname;

  return AUTH_REFRESH_EXCLUDED_PATHS.has(pathname);
};

refreshClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.headers) {
    config.headers[LANGUAGE_HEADER] = getStoredAppLocale();
  }

  return config;
});

export const refreshAccessToken = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh', undefined, {
        skipAuthRefresh: true,
        skipErrorToast: true,
      })
      .then((response) => {
        const newAccessToken = response.data.data?.accessToken;

        if (!newAccessToken) {
          throw new Error('No access token in refresh response');
        }

        setAccessToken(newAccessToken);
        return newAccessToken;
      })
      .catch((error) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

// ============================================
// Request Interceptor
// Automatically attach access token to requests
// ============================================

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (isFormDataBody(config.data)) {
      removeContentTypeHeader(config);
    }

    if (config.headers) {
      config.headers[LANGUAGE_HEADER] = getStoredAppLocale();
    }

    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`[Axios] Request to ${config.url} with token`);
    } else {
      console.log(`[Axios] Request to ${config.url} without token`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================
// Response Interceptor
// Handle 401 errors and token refresh
// ============================================

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle quota/limit errors (429) - dispatch custom event
    if (error.response?.status === 429) {
      const responseData = error.response.data as {
        error?: string;
        errorCode?: string;
        [key: string]: unknown;
      };
      const errorCode = responseData?.errorCode || responseData?.error;

      // Dispatch custom event based on error type
      if (errorCode === 'QUOTA_EXCEEDED' || responseData?.error === 'Quota exceeded') {
        window.dispatchEvent(
          new CustomEvent('quota:exceeded', {
            detail: responseData,
          })
        );
      } else if (
        errorCode === 'RATE_LIMIT_EXCEEDED' ||
        responseData?.error === 'Rate limit exceeded'
      ) {
        window.dispatchEvent(
          new CustomEvent('quota:rate-limit', {
            detail: responseData,
          })
        );
      } else if (
        errorCode === 'ANONYMOUS_LIMIT_EXCEEDED' ||
        responseData?.error === 'Anonymous session limit exceeded' ||
        responseData?.error === 'Anonymous message limit exceeded'
      ) {
        window.dispatchEvent(
          new CustomEvent('quota:anonymous-limit', {
            detail: responseData,
          })
        );
      }

      return Promise.reject(error);
    }

    // If error is 401 and we haven't retried yet
    if (
      error.response?.status === 401 &&
      !originalRequest.skipAuthRefresh &&
      !originalRequest._retry
    ) {
      // Auth bootstrap calls must resolve/reject directly. Retrying refresh from a
      // failed refresh request can leave app initialization waiting forever.
      if (shouldSkipRefreshForRequest(originalRequest.url)) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        console.log('[Axios] Attempting token refresh...');

        const newAccessToken = await refreshAccessToken();
        console.log('[Axios] New access token set, retrying request');

        // Retry the original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed - user needs to log in again
        console.error('[Axios] Token refresh failed:', refreshError);
        clearAccessToken();
        // Dispatch a custom event to notify AuthContext
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
